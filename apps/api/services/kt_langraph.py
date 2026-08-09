"""
LangGraph-based Knowledge Transfer Chatbot with Citations & Streaming.

Architecture:
1. Retrieve: Query Neo4j (vector search) for relevant Episodes, scoped to
   company_id + project_ids, then enrich with document titles from Postgres.
2. Rerank: Order chunks by relevance for the LLM context window.
3. Generate: Gemini generation grounded strictly in the retrieved context,
   emitting inline [citation: Document Title] tags which we parse into sources.

Both a non-streaming (`invoke_kt_chatbot`) and a real token-streaming
(`stream_kt_chatbot_response`) entrypoint are exposed. They share the same
retrieval/guardrail logic so the two chat endpoints behave identically.
"""

import json
import logging
import re
from typing import AsyncIterator

from langgraph.graph import END, StateGraph
from sqlalchemy import and_, func, select
from typing_extensions import TypedDict

from database import db_session_factory
from models.kt_model import DocStatusEnum, KTDocument, KTProject

from modules.kt.services.retrieval import vector_search as pg_vector_search

from .kt_engine import (
    build_rag_prompt,
    gemini,
    is_injection,
    rerank_llm,
)

logger = logging.getLogger("kt.langraph")

KT_CHAT_SYSTEM_PROMPT = (
    "You are the Knowledge Transfer assistant for an engineering organization. "
    "Answer the user's question using ONLY the information in the provided sources. "
    "Each source is labelled like '[Source N — Document Title]'. When you use "
    "information from a source, cite it inline using the EXACT format "
    "[citation: Document Title] with the document's exact title. Cite every claim "
    "you draw from the sources. If the sources do not contain the answer, say you "
    "do not have that information in the project's knowledge base — never invent "
    "facts or cite sources that were not provided."
)

REFUSAL_NO_CONTEXT = (
    "I don't have enough knowledge in the documents I can access for this "
    "project to answer that. Try rephrasing, or ask a mentor to feed a "
    "relevant document into the knowledge graph."
)
REFUSAL_INJECTION = (
    "I can only answer questions about this project's knowledge base."
)
# Shown instead of the flat refusal when the caller's project(s) simply have no
# approved/indexed knowledge yet — an onboarding nudge, not a dead end.
ONBOARDING_NO_DOCS = (
    "There's no approved knowledge in this project yet, so I don't have anything "
    "to draw from. Here's how to get started:\n\n"
    "1. Open **Create Knowledge** and add a document — paste notes, upload a file, "
    "or write a runbook.\n"
    "2. Submit it for review; the assigned mentor is notified.\n"
    "3. Once it's approved it's indexed automatically, and I can answer questions "
    "about it — with citations.\n\n"
    "As soon as a document is approved, come back and ask away. 🚀"
)
NO_PROJECTS = (
    "You don't have access to any knowledge projects yet. Redeem an access key "
    "(KT → Access Keys) or ask a mentor to grant you a project, and I'll be able "
    "to answer questions from that project's approved knowledge."
)

# How many candidates to pull from vector search before reranking, and how many
# reranked chunks to hand to the LLM.
RETRIEVE_TOP_K = 25
CONTEXT_TOP_N = 8
CITATION_PATTERN = re.compile(r"\[citation:\s*([^\]]+)\]", re.IGNORECASE)


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph State
# ─────────────────────────────────────────────────────────────────────────────


class KTChatState(TypedDict, total=False):
    # Input
    query: str
    company_id: str
    project_ids: list[str]
    user_id: int
    session_id: str

    # Retrieval
    candidate_chunks: list[dict]
    reranked_chunks: list[dict]

    # Generation
    full_response: str
    cited_sources: list[dict]
    tokens_generated: int
    generation_complete: bool
    refused: bool


# ─────────────────────────────────────────────────────────────────────────────
# Retrieval helpers (real Gemini + Neo4j + Postgres)
# ─────────────────────────────────────────────────────────────────────────────


async def _enrich_with_titles(chunks: list[dict], company_id: str) -> list[dict]:
    """Attach doc_title / project_name to vector-search chunks via Postgres.

    vector_search returns Neo4j Episodes carrying only doc_id; the human-facing
    title lives in Postgres. Without this, citations can never resolve.
    """
    doc_ids = list({c.get("doc_id") for c in chunks if c.get("doc_id")})
    if not doc_ids:
        return chunks

    async with db_session_factory() as db:
        rows = await db.execute(
            select(
                KTDocument.id,
                KTDocument.title,
                KTDocument.doc_type,
                KTProject.name.label("project_name"),
            )
            .join(KTProject, KTDocument.project_id == KTProject.id)
            .where(KTDocument.id.in_(doc_ids), KTDocument.company_id == company_id)
        )
        doc_map = {
            r.id: {
                "title": r.title,
                "doc_type": str(r.doc_type) if r.doc_type else "DOC",
                "project_name": r.project_name,
            }
            for r in rows.fetchall()
        }

    enriched = []
    for c in chunks:
        meta = doc_map.get(c.get("doc_id", ""), {})
        # Drop chunks whose document is not visible to this company (defence in depth).
        if not meta:
            continue
        enriched.append(
            {
                **c,
                "doc_title": meta.get("title", "Untitled Document"),
                "doc_type": meta.get("doc_type", "DOC"),
                "project_name": meta.get("project_name", "Unknown Project"),
                "relevance": float(c.get("score", 0.0)),
            }
        )
    return enriched


async def _retrieve_and_rerank(
    query: str, company_id: str, project_ids: list[str]
) -> list[dict]:
    """Embed → vector search (scoped) → enrich with titles → rerank."""
    query_embedding = await gemini.embed_query(query)

    # pgvector (Phase 2) — replaced neo4j.vector_search; same chunk contract.
    # If embeddings are unavailable (e.g. Gemini quota/billing), we DON'T bail:
    # retrieval degrades to graph-only via the GraphRAG blend below (the exact
    # fallback the product plan calls for).
    enriched: list[dict] = []
    reranked: list[dict] = []
    if query_embedding:
        candidates = await pg_vector_search(
            query_embedding=query_embedding,
            company_id=company_id,
            project_ids=project_ids,
            top_k=RETRIEVE_TOP_K,
        )
        enriched = await _enrich_with_titles(candidates, company_id)
        reranked = await rerank_llm(query, enriched, top_n=CONTEXT_TOP_N)
    else:
        logger.warning(
            "embeddings unavailable — degrading to graph-only KT retrieval"
        )

    # GraphRAG blend (Phase 6): traverse the Postgres knowledge graph seeded by
    # the query terms + the documents pgvector surfaced, and prepend the
    # connected relationships as an extra grounded source. Prepended after rerank
    # so the structural context is never dropped; also the sole retrieval path
    # when embeddings are down. Best-effort.
    try:
        from modules.kt.services.graph_rag import graph_context

        seed_doc_ids = list({c.get("doc_id") for c in enriched if c.get("doc_id")})
        gctx = await graph_context(query, company_id, project_ids, seed_doc_ids)
        if gctx:
            gctx["doc_title"] = "Knowledge Graph"
            reranked = [gctx] + reranked
    except Exception as e:  # noqa: BLE001 — graph blend is additive
        logger.warning("graph blend skipped: %s", e)

    return reranked


def _build_context(chunks: list[dict]) -> str:
    """Numbered, title-tagged source blocks for the LLM to cite."""
    blocks = []
    for i, c in enumerate(chunks, 1):
        title = c.get("doc_title", f"Document {i}")
        content = c.get("content", "")
        blocks.append(f"[Source {i} — {title}]\n{content}")
    return "\n\n".join(blocks)


def _extract_citations(response: str, chunks: list[dict]) -> list[dict]:
    """Map inline [citation: Title] tags back to source chunks (deduped)."""
    titles = CITATION_PATTERN.findall(response)
    sources: list[dict] = []
    seen: set[str] = set()
    for raw in titles:
        name = raw.strip().lower()
        for c in chunks:
            if c.get("doc_title", "").lower() == name and c.get("doc_id") not in seen:
                seen.add(c.get("doc_id"))
                sources.append(
                    {
                        "doc_id": c.get("doc_id", ""),
                        "doc_title": c.get("doc_title", ""),
                        "project_name": c.get("project_name", ""),
                        "excerpt": c.get("content", "")[:200],
                        "relevance_score": c.get("relevance", 0.0),
                    }
                )
                break
    return sources


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph nodes (non-streaming path)
# ─────────────────────────────────────────────────────────────────────────────


async def node_retrieve(state: KTChatState) -> KTChatState:
    logger.info(
        "🔍 Retrieve: q=%r company=%s projects=%s",
        state["query"][:60],
        state["company_id"],
        state["project_ids"],
    )
    try:
        state["reranked_chunks"] = await _retrieve_and_rerank(
            state["query"], state["company_id"], state["project_ids"]
        )
    except Exception as e:  # noqa: BLE001 - log and degrade to refusal
        logger.error("Retrieval failed: %s", e)
        state["reranked_chunks"] = []
    return state


async def node_generate(state: KTChatState) -> KTChatState:
    chunks = state.get("reranked_chunks", [])
    if not chunks:
        # Second look before refusing: social/meta/overview the regex missed, or
        # an empty project (→ onboarding). Mirrors the streaming path.
        from services.kt_engine import classify_intent_llm

        company_id = state.get("company_id", "")
        project_ids = state.get("project_ids", [])
        fallback = await classify_intent_llm(state["query"])
        if fallback in ("social", "meta", "overview"):
            state["full_response"] = await resolve_conversational(
                fallback, company_id, project_ids
            )
            state["refused"] = False
        else:
            _, total = await knowledge_overview(company_id, project_ids)
            state["full_response"] = ONBOARDING_NO_DOCS if total == 0 else REFUSAL_NO_CONTEXT
            state["refused"] = True
        state["cited_sources"] = []
        state["generation_complete"] = True
        return state

    context = _build_context(chunks)
    prompt = build_rag_prompt(state["query"], context)
    try:
        response = await gemini.generate(prompt, system=KT_CHAT_SYSTEM_PROMPT)
    except Exception as e:  # noqa: BLE001
        logger.error("Generation failed: %s", e)
        response = REFUSAL_NO_CONTEXT

    state["full_response"] = response
    state["cited_sources"] = _extract_citations(response, chunks)
    state["tokens_generated"] = len(response.split())
    state["generation_complete"] = True
    return state


def build_kt_chatbot_graph() -> StateGraph:
    workflow = StateGraph(KTChatState)
    workflow.add_node("retrieve", node_retrieve)
    workflow.add_node("generate", node_generate)
    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)
    return workflow


kt_langraph_app = build_kt_chatbot_graph().compile()


# ─────────────────────────────────────────────────────────────────────────────
# Conversational / overview helpers
# ─────────────────────────────────────────────────────────────────────────────


async def knowledge_overview(company_id: str, project_ids: list[str]) -> tuple[str, int]:
    """Data-backed answer to "what do you know / what can you access": lists the
    caller's accessible projects with their indexed-document counts. Returns
    (reply_text, total_indexed_docs) so callers can also detect the empty state."""
    if not project_ids:
        return NO_PROJECTS, 0

    async with db_session_factory() as db:
        rows = await db.execute(
            select(KTProject.name, func.count(KTDocument.id))
            .select_from(KTProject)
            .outerjoin(
                KTDocument,
                and_(
                    KTDocument.project_id == KTProject.id,
                    KTDocument.status == DocStatusEnum.INGESTED,
                ),
            )
            .where(KTProject.id.in_(project_ids))
            .group_by(KTProject.id, KTProject.name)
            .order_by(KTProject.name)
        )
        counts = [(name, int(n or 0)) for name, n in rows.fetchall()]

    total = sum(n for _, n in counts)
    if not counts:
        return NO_PROJECTS, 0
    if total == 0:
        return ONBOARDING_NO_DOCS, 0

    lines = "\n".join(
        f"- **{name}** — {n} indexed document{'s' if n != 1 else ''}"
        + ("" if n else " (nothing approved yet)")
        for name, n in counts
    )
    reply = (
        f"Here's the knowledge I can draw on for you right now "
        f"({total} indexed document{'s' if total != 1 else ''} across "
        f"{len(counts)} project{'s' if len(counts) != 1 else ''}):\n\n"
        f"{lines}\n\n"
        "Ask me anything about these — for example a system's design, why a "
        "decision was made, or how to perform a task — and I'll answer with citations."
    )
    return reply, total


async def resolve_conversational(
    kind: str, company_id: str, project_ids: list[str]
) -> str:
    """Turn a conversational intent into a reply. 'overview' is data-backed;
    greeting/social/meta use the canned friendly replies."""
    from services.kt_engine import conversational_reply

    if kind == "overview":
        reply, _ = await knowledge_overview(company_id, project_ids)
        return reply
    return conversational_reply(kind)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────


async def invoke_kt_chatbot(
    query: str, company_id: str, project_ids: list[str], user_id: int, session_id: str
) -> KTChatState:
    """Non-streaming: run the graph and return the final state."""
    if is_injection(query):
        return {
            "query": query,
            "full_response": REFUSAL_INJECTION,
            "cited_sources": [],
            "tokens_generated": 0,
            "generation_complete": True,
            "refused": True,
        }

    # Conversational / meta / overview — mirror the streaming path so both
    # entrypoints behave identically (greeting/social/meta/overview never refuse).
    from services.kt_engine import classify_conversational

    _kind = classify_conversational(query)
    if _kind:
        _reply = await resolve_conversational(_kind, company_id, project_ids)
        return {
            "query": query,
            "full_response": _reply,
            "cited_sources": [],
            "tokens_generated": 0,
            "generation_complete": True,
            "refused": False,
        }

    initial: KTChatState = {
        "query": query,
        "company_id": company_id,
        "project_ids": project_ids,
        "user_id": user_id,
        "session_id": session_id,
        "reranked_chunks": [],
        "full_response": "",
        "cited_sources": [],
        "tokens_generated": 0,
        "generation_complete": False,
        "refused": False,
    }
    return await kt_langraph_app.ainvoke(initial)


async def stream_kt_chatbot_response(
    query: str, company_id: str, project_ids: list[str], user_id: int, session_id: str
) -> AsyncIterator[str]:
    """Real SSE streaming.

    Retrieval + reranking run first, then Gemini tokens are streamed live as
    they arrive. Each line is a JSON object:
      {"token": str, "done": false}                       (incremental)
      {"token": "", "done": true, "sources": [...],       (terminal)
       "full_response": str}
    """
    # Guardrail: prompt-injection.
    if is_injection(query):
        yield json.dumps({"token": REFUSAL_INJECTION, "done": False}) + "\n"
        yield json.dumps(
            {"token": "", "done": True, "sources": [], "full_response": REFUSAL_INJECTION}
        ) + "\n"
        return

    # Friendly: greetings / small-talk / "what can you do" / "what do you know"
    # get a conversational (or data-backed) reply — no RAG grounding needed — so
    # the assistant never refuses a "hi" or a meta question.
    from services.kt_engine import classify_conversational, classify_intent_llm

    _kind = classify_conversational(query)
    if _kind:
        _reply = await resolve_conversational(_kind, company_id, project_ids)
        yield json.dumps({"token": _reply, "done": False}) + "\n"
        yield json.dumps(
            {"token": "", "done": True, "sources": [], "full_response": _reply}
        ) + "\n"
        return

    try:
        chunks = await _retrieve_and_rerank(query, company_id, project_ids)
    except Exception as e:  # noqa: BLE001
        logger.error("Stream retrieval failed: %s", e)
        chunks = []

    # No grounding context. Before refusing, take a second look: the regexes may
    # have missed a social/meta/overview question, OR the project may simply have
    # no approved knowledge yet (→ onboarding, not a dead-end refusal).
    if not chunks:
        fallback = await classify_intent_llm(query)
        if fallback in ("social", "meta", "overview"):
            _reply = await resolve_conversational(fallback, company_id, project_ids)
            yield json.dumps({"token": _reply, "done": False}) + "\n"
            yield json.dumps(
                {"token": "", "done": True, "sources": [], "full_response": _reply}
            ) + "\n"
            return

        _, total = await knowledge_overview(company_id, project_ids)
        if total == 0:
            yield json.dumps({"token": ONBOARDING_NO_DOCS, "done": False}) + "\n"
            yield json.dumps(
                {
                    "token": "",
                    "done": True,
                    "sources": [],
                    "full_response": ONBOARDING_NO_DOCS,
                    "onboarding": True,
                }
            ) + "\n"
            return

        yield json.dumps({"token": REFUSAL_NO_CONTEXT, "done": False}) + "\n"
        yield json.dumps(
            {"token": "", "done": True, "sources": [], "full_response": REFUSAL_NO_CONTEXT}
        ) + "\n"
        return

    context = _build_context(chunks)
    prompt = build_rag_prompt(query, context)

    full_response = ""
    async for token in gemini.stream(prompt, system=KT_CHAT_SYSTEM_PROMPT):
        if not token:
            continue
        full_response += token
        yield json.dumps({"token": token, "done": False}) + "\n"

    sources = _extract_citations(full_response, chunks)

    # Traversed knowledge subgraph (for the interactive graph canvas), if the
    # GraphRAG blend produced one.
    graph_payload = None
    for c in chunks:
        if c.get("is_graph") and (c.get("graph_nodes") or c.get("graph_edges")):
            graph_payload = {
                "nodes": c.get("graph_nodes", []),
                "edges": c.get("graph_edges", []),
            }
            break

    # "Both" confidence: retrieval composite blended with an LLM groundedness
    # check (one cheap call after the answer streams — a ~2s tail, not blocking
    # the token stream the user already saw).
    try:
        from services.kt_engine import compute_confidence
        from services.kt_workflows import llm_groundedness

        retrieval_conf = compute_confidence(chunks, answer=full_response, citations=sources)
        grounded = await llm_groundedness(chunks, full_response)
        confidence = round(0.6 * retrieval_conf + 0.4 * (grounded * 100.0), 1)
    except Exception:
        confidence = None

    yield json.dumps(
        {
            "token": "",
            "done": True,
            "sources": sources,
            "full_response": full_response,
            "confidence_score": confidence,
            "graph": graph_payload,
        }
    ) + "\n"
