'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useKTNavStore } from '@/stores/ktNavStore';
import ApiService from '@/services/ApiService';
import { Loader2, ZoomIn, ZoomOut, Maximize2, RefreshCw, Filter, Info, Network, Database, Layers, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'organization' | 'company' | 'project' | 'sprint' | 'document' | 'episode' | 'entity';
  depth: number;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface NodeDetail {
  relationships: Array<{
    relation: string;
    neighbor_label: string;
    neighbor_type: string;
    edge_type: string;
  }>;
  source_documents: Array<{
    id: string;
    title: string;
    doc_type: string;
  }>;
  confidence: number;
}

const NODE_CONFIG: Record<string, { radius: number; color: string; strokeColor: string; label: string }> = {
  organization: { radius: 40, color: '#f59e0b', strokeColor: '#d97706', label: 'ORG' },
  company:      { radius: 30, color: '#6366f1', strokeColor: '#4f46e5', label: 'CO' },
  project:      { radius: 22, color: '#06b6d4', strokeColor: '#0891b2', label: 'PRJ' },
  sprint:       { radius: 16, color: '#8b5cf6', strokeColor: '#7c3aed', label: 'SPR' },
  document:     { radius: 12, color: '#10b981', strokeColor: '#059669', label: 'DOC' },
  episode:      { radius: 8,  color: '#ec4899', strokeColor: '#db2777', label: 'EP' },
  entity:       { radius: 5,  color: '#f59e0b', strokeColor: '#d97706', label: 'ENT' },
};

const getConfidenceColor = (confidence: number): { bg: string; text: string; label: string } => {
  if (confidence >= 70) {
    return { bg: 'bg-[#10b981]', text: 'text-[#064e3b]', label: 'High' };
  } else if (confidence >= 40) {
    return { bg: 'bg-[#f59e0b]', text: 'text-[#78350f]', label: 'Medium' };
  } else {
    return { bg: 'bg-[#ef4444]', text: 'text-[#7f1d1d]', label: 'Low' };
  }
};

export default function KnowledgeExplorer({ 
  projectId, 
  accessKey 
}: { projectId?: string; accessKey?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(
    new Set(['organization', 'company', 'project', 'sprint', 'document', 'episode', 'entity'])
  );

  const { selectedCompany } = useKTNavStore();


  // Fetch node detail when node is selected
  useEffect(() => {
    const fetchDetail = async () => {
      if (!selectedNode) {
        setSelectedNodeDetail(null);
        return;
      }
      setDetailLoading(true);
      try {
        const data = await ApiService.getKTGraphNeighborhoodData(selectedNode.id as string, accessKey);
        setSelectedNodeDetail({
          relationships: data.relationships || [],
          source_documents: data.source_documents || [],
          confidence: data.confidence || 50,
        });
      } catch (err) {
        console.error('Failed to fetch node detail', err);
        setSelectedNodeDetail(null);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [selectedNode, accessKey]);

  const expandNeighborhood = async () => {
    if (!selectedNode) return;
    setLoading(true);
    try {
      const data = await ApiService.getKTGraphNeighborhoodData(selectedNode.id as string, accessKey);
      const nodes: GraphNode[] = (data.nodes || []).map((n: any) => ({
        ...n,
        depth: ['organization', 'company', 'project', 'sprint', 'document', 'episode', 'entity']
          .indexOf(n.type),
      }));
      const links: GraphLink[] = data.edges || data.links || [];
      setNodeCount(nodes.length);
      renderGraph(nodes, links);
      setSelectedNode(null);
    } catch (err) {
      toast.error('Failed to expand node neighborhood');
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      const data = await ApiService.getKTGraphData(
        [projectId],
        selectedCompany?.id ? String(selectedCompany.id) : undefined,
        accessKey
      );
      
      const nodes: GraphNode[] = (data.nodes || []).map((n: any) => ({
        ...n,
        depth: ['organization', 'company', 'project', 'sprint', 'document', 'episode', 'entity']
          .indexOf(n.type),
      }));
      
      const links: GraphLink[] = data.edges || data.links || [];
      setNodeCount(nodes.length);
      
      renderGraph(nodes, links);
    } catch (err) {
      toast.error('Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [projectId, accessKey, selectedCompany]);

  // Connect to PerformanceEngine output streams
  useEffect(() => {
    let stream: EventSource | null = null;
    try {
      stream = ApiService.getNotificationStream();
      stream.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // Only react to structural/performance changes
          if (['graph_update', 'intelligence_update', 'kt_update', 'performance_engine'].includes(payload.type)) {
            buildGraph();
          }
        } catch (e) {}
      };
    } catch (e) {
      console.error('Failed to connect to PerformanceEngine stream', e);
    }
    
    return () => {
      if (stream) stream.close();
    };
  }, [buildGraph]);

  const renderGraph = (nodes: GraphNode[], links: GraphLink[]) => {
    if (!svgRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;
    
    d3.select(svgRef.current).selectAll('*').remove();
    if (simulationRef.current) simulationRef.current.stop();
    
    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);
    
    const defs = svg.append('defs');
    ['#94a3b8', '#6366f1', '#10b981'].forEach((color, i) => {
      defs.append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const zoomGroup = svg.append('g').attr('class', 'zoom-group');
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', event => {
        zoomGroup.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    zoomRef.current = zoom;
    
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as GraphNode;
          const avgDepth = ((source.depth || 0)) / 2;
          return 80 + avgDepth * 40;
        })
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength((d: GraphNode) => -(NODE_CONFIG[d.type]?.radius || 8) * 15)
      )
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('radial', d3.forceRadial<GraphNode>(
        (d: GraphNode) => d.depth * 120,
        W / 2, H / 2
      ).strength(0.4))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => (NODE_CONFIG[d.type]?.radius || 8) + 8)
      );
    
    simulationRef.current = simulation;
    
    const link = zoomGroup.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow-0)');
    
    const node = zoomGroup.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });
    
    node.append('circle')
      .attr('r', d => NODE_CONFIG[d.type]?.radius || 8)
      .attr('fill', d => NODE_CONFIG[d.type]?.color || '#6366f1')
      .attr('stroke', d => NODE_CONFIG[d.type]?.strokeColor || '#4f46e5')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', d => {
        // Subtle confidence-based opacity: project/document nodes are more opaque
        if (d.type === 'project' || d.type === 'document') return 0.9;
        if (d.type === 'episode') return 0.7;
        return 0.5; // entity nodes are more subtle
      })
      .attr('filter', d => d.depth <= 2 ? 'url(#glow)' : null);
    
    node.filter(d => d.depth <= 4)
      .append('text')
      .text(d => d.label.substring(0, 20) + (d.label.length > 20 ? '…' : ''))
      .attr('x', d => (NODE_CONFIG[d.type]?.radius || 8) + 4)
      .attr('y', 4)
      .attr('font-size', d => Math.max(8, 14 - d.depth * 1.5))
      .attr('font-weight', d => d.depth <= 2 ? '700' : '500')
      .attr('fill', '#94a3b8')
      .attr('pointer-events', 'none');
    
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    simulation.on('end', () => {
      const bounds = (zoomGroup.node() as SVGGElement)?.getBBox();
      if (bounds) {
        const scale = Math.min(0.9 * W / bounds.width, 0.9 * H / bounds.height, 2);
        const tx = W / 2 - scale * (bounds.x + bounds.width / 2);
        const ty = H / 2 - scale * (bounds.y + bounds.height / 2);
        svg.call(
          zoom.transform,
          d3.zoomIdentity.translate(tx, ty).scale(scale)
        );
      }
    });
  };

  useEffect(() => {
    buildGraph();
    return () => { simulationRef.current?.stop(); };
  }, [buildGraph]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy as any, 1.3);
  };
  
  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy as any, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current || !containerRef.current || !zoomRef.current) return;
    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;
    d3.select(svgRef.current).transition().duration(500).call(
      zoomRef.current.transform as any, 
      d3.zoomIdentity.translate(W/2, H/2).scale(1)
    );
  };

  if (!projectId) {
    return (
      <div className="w-full h-[600px] flex flex-col items-center justify-center text-[var(--color-on-surface-variant)] bg-[var(--color-surface-dim)]/50 rounded-[2.5rem] border border-[var(--color-outline-variant)]">
        <Network size={48} className="mb-4 opacity-20 animate-pulse" />
        <p className="text-xs font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Select a project to explore the graph</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-[600px] bg-[var(--color-surface-dim)] rounded-[2.5rem] border border-[var(--color-outline-variant)] relative overflow-hidden group">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-surface-dim)]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={36} />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Mapping Concept Nodes...</p>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <div className="bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] p-4 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Network size={16} className="text-[var(--color-brand-primary)]" />
            <p className="text-xs font-black uppercase tracking-widest text-[var(--color-on-surface)]">Knowledge Graph</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Project
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Sprint
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> Document
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" /> Episode
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Entity
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 flex gap-2 shadow-lg z-10">
        <button 
          onClick={handleReset}
          className="p-3 bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all active:scale-95"
          title="Reset Zoom & Pan"
        >
          <Maximize2 size={18} />
        </button>
        <button 
          onClick={handleZoomIn}
          className="p-3 bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all active:scale-95"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>
        <button 
          onClick={handleZoomOut}
          className="p-3 bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <button 
          onClick={buildGraph}
          className="p-3 bg-[var(--color-surface-container)]/80 backdrop-blur-md border border-[var(--color-outline-variant)] rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all active:scale-95"
          title="Refresh Data"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute top-0 right-0 w-80 h-full bg-[var(--color-surface-container)]/90 backdrop-blur-xl border-l border-[var(--color-outline-variant)] shadow-2xl z-20 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-8 border-b border-[var(--color-outline-variant)]">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-[var(--color-brand-primary-container)]/20 border-[var(--color-brand-primary)]/30 text-[var(--color-brand-primary)]">
                  {selectedNode.type === 'document' ? <Layers size={24} /> : <Database size={24} />}
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all">
                  <AlertCircle size={20} className="rotate-45" />
                </button>
              </div>

              <h4 className="text-2xl font-black text-[var(--color-on-surface)] mb-2 tracking-tight line-clamp-2">{selectedNode.label}</h4>
              <div className="flex gap-2 mb-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-high)]/40 inline-block px-2 py-0.5 rounded border border-[var(--color-outline-variant)]">
                  {selectedNode.type}
                </p>
                {selectedNodeDetail && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getConfidenceColor(selectedNodeDetail.confidence).bg}`}>
                    <span className="text-xs font-bold">{selectedNodeDetail.confidence}%</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed font-mono break-all">
                {selectedNode.id}
              </p>
            </div>

            {/* Content Scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-6">
                {/* Connected Relationships */}
                {selectedNodeDetail && selectedNodeDetail.relationships.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Connected Relationships</p>
                    <div className="space-y-1.5">
                      {selectedNodeDetail.relationships.slice(0, 8).map((rel, idx) => (
                        <div key={idx} className="text-xs text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-high)]/30 px-2.5 py-1.5 rounded border border-[var(--color-outline-variant)]/50">
                          <span className="font-semibold text-[var(--color-brand-primary)]">{rel.relation}</span>
                          <span className="mx-1">→</span>
                          <span className="text-[var(--color-on-surface)]">{rel.neighbor_label}</span>
                          <span className="text-[9px] text-[var(--color-on-surface-variant)] ml-1">({rel.neighbor_type})</span>
                        </div>
                      ))}
                      {selectedNodeDetail.relationships.length > 8 && (
                        <p className="text-[9px] text-[var(--color-on-surface-variant)] italic">+{selectedNodeDetail.relationships.length - 8} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Source Documents */}
                {selectedNodeDetail && selectedNodeDetail.source_documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface-variant)]">Source Documents</p>
                    <div className="space-y-1.5">
                      {selectedNodeDetail.source_documents.map((doc) => (
                        <a
                          key={doc.id}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedNode(null);
                          }}
                          className="text-xs text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]/80 bg-[var(--color-surface-container-high)]/30 px-2.5 py-1.5 rounded border border-[var(--color-outline-variant)]/50 hover:border-[var(--color-brand-primary)]/30 transition-all block truncate"
                          title={doc.title}
                        >
                          <span className="font-semibold">{doc.title}</span>
                          <span className="text-[9px] text-[var(--color-on-surface-variant)] ml-1">({doc.doc_type})</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {detailLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-[var(--color-brand-primary)]" size={20} />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 p-8 border-t border-[var(--color-outline-variant)] space-y-2">
              <button
                onClick={expandNeighborhood}
                disabled={loading}
                className="w-full py-3 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-on-primary)] rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[var(--color-brand-primary)]/20"
              >
                {loading ? 'Expanding...' : 'Expand Neighbourhood'}
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-full py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-2xl font-black text-xs uppercase tracking-widest border border-[var(--color-outline-variant)] transition-all flex items-center justify-center gap-2"
              >
                Close <Info size={14} />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
