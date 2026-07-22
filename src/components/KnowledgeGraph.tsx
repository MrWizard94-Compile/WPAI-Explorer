import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Network, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { mockEntities } from '../data/mockEntities';
import { cn } from '../utils/cn';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  group: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
}

export const KnowledgeGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;

    // 1. Prepare Data
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add entities as nodes
    mockEntities.forEach(entity => {
      if (entity.type === 'Mod') {
        nodes.push({
          id: entity.id,
          label: (entity.canonical.name as string) || entity.id,
          type: entity.type,
          group: 1
        });
      } else if (entity.type === 'Version') {
        nodes.push({
          id: entity.id,
          label: (entity.canonical.version_number as string) || entity.id,
          type: entity.type,
          group: 2
        });

        // Implicit link: Version -> Mod
        if (entity.canonical.mod_id) {
          links.push({
            source: entity.id,
            target: entity.canonical.mod_id as string,
            relation: 'belongs_to'
          });
        }
      }
    });

    // Add explicit dependency edges
    mockEntities.forEach(entity => {
      if (entity.type === 'DependencyEdge') {
        const sourceId = entity.canonical.source_mod_id || entity.canonical.source_version_id;
        const targetId = entity.canonical.target_mod_id;
        if (sourceId && targetId) {
          links.push({
            source: sourceId as string,
            target: targetId as string,
            relation: (entity.canonical.relation as string) || 'depends_on'
          });
        }
      }
    });

    // 2. Set up SVG and D3 Simulation
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Forces
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40));

    // Draw Links
    const link = g.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.relation === 'belongs_to' ? '#4b5563' : '#3b82f6')
      .attr('stroke-width', d => d.relation === 'belongs_to' ? 1 : 2)
      .attr('stroke-dasharray', d => d.relation === 'belongs_to' ? '4,4' : 'none');

    // Draw Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('mouseenter', (event, d) => setHoveredNode(d))
      .on('mouseleave', () => setHoveredNode(null));

    node.append('circle')
      .attr('r', d => d.type === 'Mod' ? 16 : 8)
      .attr('fill', d => d.type === 'Mod' ? '#10b981' : '#8b5cf6')
      .attr('stroke', '#050505')
      .attr('stroke-width', 2);

    node.append('text')
      .text(d => d.label)
      .attr('x', d => (d.type === 'Mod' ? 20 : 12))
      .attr('y', 4)
      .attr('fill', '#d4d4d8')
      .attr('font-size', d => d.type === 'Mod' ? '12px' : '10px')
      .attr('font-weight', d => d.type === 'Mod' ? 'bold' : 'normal')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
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

    // Fit to screen on initial load
    setTimeout(() => {
        const bounds = g.node()?.getBBox();
        if (bounds && bounds.width > 0) {
            const dx = bounds.width,
                  dy = bounds.height,
                  x = bounds.x + bounds.width / 2,
                  y = bounds.y + bounds.height / 2,
                  scale = Math.max(0.1, Math.min(2, 0.9 / Math.max(dx / width, dy / height))),
                  translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
        }
    }, 100);

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-black text-zinc-100 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="p-8 pb-4 border-b border-zinc-900 bg-black/80 z-10 relative flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-semibold text-zinc-100 mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center">
                <Network className="w-5 h-5" />
            </div>
            WPAI Topology Graph
            </h2>
            <p className="text-sm text-zinc-400">Force-directed WPAI topology of mods, versions, and resolving dependency edges (Neo4j/Obsidian style).</p>
        </div>

        {/* Controls Overlay */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
            <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border-l border-zinc-800" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
            </button>
            <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors border-l border-zinc-800" title="Fit to Screen">
            <Maximize className="w-4 h-4" />
            </button>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full" ref={containerRef}>
        <svg ref={svgRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Hover info panel */}
        {hoveredNode && (
            <div className="absolute bottom-8 left-8 bg-black border border-zinc-800 rounded-xl p-4 shadow-2xl pointer-events-none w-72">
                <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        hoveredNode.type === 'Mod' ? 'bg-lime-400' : 'bg-purple-400'
                    )} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{hoveredNode.type}</span>
                </div>
                <div className="font-medium text-zinc-200 mb-1">{hoveredNode.label}</div>
                <div className="text-xs text-zinc-500 font-mono break-all">{hoveredNode.id}</div>
            </div>
        )}
      </div>
    </div>
  );
};
