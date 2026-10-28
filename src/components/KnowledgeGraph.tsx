import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Network, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { cn } from '../utils/cn';
import EntityDrawer from './EntityDrawer';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
}

interface GraphPayload {
  nodes: Array<{ id: string; type: string; canonical: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; relation: string }>;
}

const getNodeLabel = (entity: { type: string; canonical: Record<string, unknown>; id: string }) => {
  if (entity.type === 'Version') {
    return String(entity.canonical.version_number ?? entity.id);
  }
  return String(entity.canonical.name ?? entity.id);
};

export const KnowledgeGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphPayload | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const zoomBehaviorRef = React.useRef<d3.ZoomBehavior<Element, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadGraph = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/graph');
        if (!response.ok) {
          throw new Error(`Graph fetch failed: ${response.statusText}`);
        }

        const data = (await response.json()) as GraphPayload;
        if (!cancelled) {
          setGraphData(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load graph data.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadGraph();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !graphData) return;

    const nodes: GraphNode[] = graphData.nodes.map((entity) => ({
      id: entity.id,
      label: getNodeLabel(entity),
      type: entity.type,
    }));

    const links: GraphLink[] = graphData.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      relation: edge.relation,
    }));

    const width = Math.max(containerRef.current.clientWidth, 640);
    const height = Math.max(containerRef.current.clientHeight, 480);

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoom as unknown as d3.ZoomBehavior<Element, unknown>;

    svg.call(zoom as any);

    const link = g.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => d.relation === 'belongs_to' ? '#6b7280' : '#3b82f6')
      .attr('stroke-width', (d) => d.relation === 'belongs_to' ? 1 : 2)
      .attr('stroke-dasharray', (d) => d.relation === 'belongs_to' ? '4,4' : 'none');

    const nodesGroup = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('mouseenter', (_event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null))
      .on('click', (_event, d) => setSelectedEntityId(d.id));

    nodesGroup.append('circle')
      .attr('r', (d) => d.type === 'Mod' ? 16 : 10)
      .attr('fill', (d) => d.type === 'Mod' ? '#10b981' : '#3b82f6')
      .attr('stroke', '#020617')
      .attr('stroke-width', 2);

    nodesGroup.append('text')
      .text((d) => d.label)
      .attr('x', (d) => (d.type === 'Mod' ? 22 : 14))
      .attr('y', 4)
      .attr('fill', '#d4d4d8')
      .attr('font-size', (d) => (d.type === 'Mod' ? '12px' : '10px'))
      .attr('font-weight', (d) => (d.type === 'Mod' ? '700' : '500'))
      .style('pointer-events', 'none');

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-340))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(32));

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);

      nodesGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (!bounds) return;
      const dx = bounds.width;
      const dy = bounds.height;
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      const scale = Math.max(0.1, Math.min(2, 0.9 / Math.max(dx / width, dy / height)));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];

      svg.transition().duration(650).call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
    }, 200);

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const sel = d3.select(svgRef.current as any);
    sel.transition().duration(300).call(zoomBehaviorRef.current.scaleBy as any, factor);
  };

  const handleFit = () => {
    if (!svgRef.current) return;
    const sel = d3.select(svgRef.current as any);
    const g = sel.select('g');
    const bounds = (g.node() as SVGGraphicsElement)?.getBBox?.();
    if (!bounds) return;
    const width = svgRef.current.clientWidth || 640;
    const height = svgRef.current.clientHeight || 480;
    const dx = bounds.width;
    const dy = bounds.height;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const scale = Math.max(0.1, Math.min(2, 0.9 / Math.max(dx / width, dy / height)));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];
    sel.transition().duration(650).call(zoomBehaviorRef.current!.transform as any, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
  };

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="p-8 pb-4 border-b border-zinc-900 bg-black/80 z-10 relative flex justify-between items-end gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center">
              <Network className="w-5 h-5" />
            </div>
            WPAI Topology Graph
          </h2>
          <p className="text-sm text-zinc-400">Force-directed topology of mods, versions, and dependency relationships.</p>
        </div>

        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
          <button onClick={() => handleZoom(1.2)} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => handleZoom(1 / 1.2)} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border-l border-zinc-800" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={handleFit} className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border-l border-zinc-800" title="Fit to screen">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full" ref={containerRef}>
        <svg ref={svgRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-zinc-400 text-sm font-mono">
            Loading graph data…
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 text-rose-400 text-sm font-mono px-6 text-center">
            {error}
          </div>
        )}

        {hoveredNode && (
          <div className="absolute bottom-8 left-8 bg-black border border-zinc-800 rounded-xl p-4 shadow-2xl pointer-events-none w-72">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('w-2 h-2 rounded-full', hoveredNode.type === 'Mod' ? 'bg-lime-400' : 'bg-purple-400')} />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{hoveredNode.type}</span>
            </div>
            <div className="font-medium text-zinc-200 mb-1">{hoveredNode.label}</div>
            <div className="text-xs text-zinc-500 font-mono break-all">{hoveredNode.id}</div>
          </div>
        )}

        {selectedEntityId && (
          <EntityDrawer entityId={selectedEntityId} onClose={() => setSelectedEntityId(null)} />
        )}
      </div>
    </div>
  );
};
