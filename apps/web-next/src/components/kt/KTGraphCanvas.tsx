'use client';

import React, { useMemo, useRef, useState, useCallback } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  seed?: boolean;
}
export interface GraphEdge {
  source: string;
  target: string;
  relation?: string;
}

interface KTGraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
}

interface Positioned extends GraphNode {
  x: number;
  y: number;
}

const WIDTH = 800;
const HEIGHT = 560;

/**
 * A self-contained (CSP-safe, no external lib / no CDN) interactive
 * force-directed knowledge-graph canvas. Computes a static layout with a small
 * Fruchterman–Reingold-style simulation, then supports pan, zoom, node
 * selection, and double-click-to-focus.
 */
export default function KTGraphCanvas({ nodes, edges, className = '' }: KTGraphCanvasProps) {
  // ── Layout (computed once per nodes/edges change) ──────────────────────────
  const positions = useMemo<Positioned[]>(() => {
    const n = nodes.length;
    if (n === 0) return [];
    const idIndex = new Map(nodes.map((nd, i) => [nd.id.toLowerCase(), i]));
    // Seed on a circle for determinism.
    const pts = nodes.map((nd, i) => ({
      ...nd,
      x: WIDTH / 2 + Math.cos((2 * Math.PI * i) / n) * (Math.min(WIDTH, HEIGHT) / 3),
      y: HEIGHT / 2 + Math.sin((2 * Math.PI * i) / n) * (Math.min(WIDTH, HEIGHT) / 3),
    }));
    const links = edges
      .map((e) => ({ s: idIndex.get(e.source.toLowerCase()), t: idIndex.get(e.target.toLowerCase()) }))
      .filter((l) => l.s !== undefined && l.t !== undefined) as { s: number; t: number }[];

    const k = Math.sqrt((WIDTH * HEIGHT) / n) * 0.8; // ideal distance
    const ITER = 220;
    for (let it = 0; it < ITER; it++) {
      const disp = pts.map(() => ({ dx: 0, dy: 0 }));
      // Repulsion between all pairs.
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let dx = pts[i].x - pts[j].x;
          let dy = pts[i].y - pts[j].y;
          let dist = Math.hypot(dx, dy) || 0.01;
          const rep = (k * k) / dist;
          dx = (dx / dist) * rep;
          dy = (dy / dist) * rep;
          disp[i].dx += dx; disp[i].dy += dy;
          disp[j].dx -= dx; disp[j].dy -= dy;
        }
      }
      // Attraction along edges.
      for (const { s, t } of links) {
        let dx = pts[s].x - pts[t].x;
        let dy = pts[s].y - pts[t].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const attr = (dist * dist) / k;
        dx = (dx / dist) * attr;
        dy = (dy / dist) * attr;
        disp[s].dx -= dx; disp[s].dy -= dy;
        disp[t].dx += dx; disp[t].dy += dy;
      }
      const temp = k * (1 - it / ITER); // cool down
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(disp[i].dx, disp[i].dy) || 0.01;
        pts[i].x += (disp[i].dx / d) * Math.min(d, temp);
        pts[i].y += (disp[i].dy / d) * Math.min(d, temp);
        pts[i].x = Math.max(40, Math.min(WIDTH - 40, pts[i].x));
        pts[i].y = Math.max(40, Math.min(HEIGHT - 40, pts[i].y));
      }
    }
    return pts;
  }, [nodes, edges]);

  const posById = useMemo(() => {
    const m = new Map<string, Positioned>();
    positions.forEach((p) => m.set(p.id.toLowerCase(), p));
    return m;
  }, [positions]);

  // ── Pan / zoom via viewBox ────────────────────────────────────────────────
  const [view, setView] = useState({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
  const [selected, setSelected] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => {
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const nw = Math.max(200, Math.min(WIDTH * 2.5, v.w * factor));
      const nh = nw * (HEIGHT / WIDTH);
      // zoom toward center
      return { x: v.x + (v.w - nw) / 2, y: v.y + (v.h - nh) / 2, w: nw, h: nh };
    });
  }, []);

  const onMouseDown = (e: React.MouseEvent) => { dragRef.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const scale = view.w / WIDTH;
    const dx = (e.clientX - dragRef.current.x) * scale;
    const dy = (e.clientY - dragRef.current.y) * scale;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
  };
  const onMouseUp = () => { dragRef.current = null; };

  const focusNode = (id: string) => {
    const p = posById.get(id.toLowerCase());
    if (!p) return;
    setView({ x: p.x - 160, y: p.y - 112, w: 320, h: 224 });
  };

  const connected = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>();
    const key = selected.toLowerCase();
    edges.forEach((e) => {
      if (e.source.toLowerCase() === key) s.add(e.target.toLowerCase());
      if (e.target.toLowerCase() === key) s.add(e.source.toLowerCase());
    });
    return s;
  }, [selected, edges]);

  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center text-sm text-[var(--color-on-surface-variant)] ${className}`}>
        No knowledge-graph relationships for this answer.
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="w-full h-full bg-[var(--color-surface-dim)] rounded-2xl border border-[var(--color-outline-variant)] cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <defs>
          <marker id="kt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const s = posById.get(e.source.toLowerCase());
          const t = posById.get(e.target.toLowerCase());
          if (!s || !t) return null;
          const active = hoverEdge === i ||
            (selected && (e.source.toLowerCase() === selected.toLowerCase() || e.target.toLowerCase() === selected.toLowerCase()));
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          return (
            <g key={i} onMouseEnter={() => setHoverEdge(i)} onMouseLeave={() => setHoverEdge(null)}>
              <line
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={active ? '#6366f1' : '#334155'}
                strokeWidth={active ? 2 : 1}
                markerEnd="url(#kt-arrow)"
              />
              {active && e.relation && (
                <text x={mx} y={my - 4} fill="#a5b4fc" fontSize={9} textAnchor="middle" className="pointer-events-none">
                  {e.relation}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {positions.map((p) => {
          const isSel = selected?.toLowerCase() === p.id.toLowerCase();
          const isConn = connected.has(p.id.toLowerCase());
          const dim = selected && !isSel && !isConn;
          const fill = p.seed ? '#14b8a6' : '#6366f1';
          return (
            <g
              key={p.id}
              transform={`translate(${p.x},${p.y})`}
              className="cursor-pointer"
              opacity={dim ? 0.35 : 1}
              onClick={(ev) => { ev.stopPropagation(); setSelected(isSel ? null : p.id); }}
              onDoubleClick={(ev) => { ev.stopPropagation(); focusNode(p.id); }}
            >
              <circle r={isSel ? 11 : 8} fill={fill} stroke={isSel ? '#fff' : '#0f172a'} strokeWidth={isSel ? 2 : 1.5} />
              <text x={12} y={4} fill="#e2e8f0" fontSize={11} className="pointer-events-none">
                {p.label.length > 26 ? p.label.slice(0, 26) + '…' : p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Controls / legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button
          onClick={() => setView({ x: 0, y: 0, w: WIDTH, h: HEIGHT })}
          className="px-2.5 py-1 rounded-lg bg-[var(--color-surface-container-high)]/90 border border-[var(--color-outline-variant)] text-[10px] font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
        >
          Reset view
        </button>
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] text-[var(--color-on-surface-variant)]">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Query match</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Related entity</span>
        <span className="hidden sm:inline text-[var(--color-on-surface-variant)]">scroll = zoom · drag = pan · click = focus · dbl-click = zoom in</span>
      </div>

      {selected && (
        <div className="absolute bottom-3 right-3 max-w-[240px] bg-[var(--color-surface-container)]/95 border border-[var(--color-outline-variant)] rounded-xl p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-brand-primary)] mb-1">Selected entity</p>
          <p className="text-sm text-[var(--color-on-surface)] font-bold break-words">{selected}</p>
          <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1">{connected.size} direct relationship{connected.size === 1 ? '' : 's'}</p>
        </div>
      )}
    </div>
  );
}
