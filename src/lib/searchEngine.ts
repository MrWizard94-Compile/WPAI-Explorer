import { Entity, SearchQuery, ContextBundle, BundleEdge } from '../types';
import { mockEntities } from '../data/mockEntities';

export function parseQuery(rawQuery: string): SearchQuery {
  const q = rawQuery.toLowerCase();

  const facets: SearchQuery['facets'] = {};

  // Simple regex extractors for prototype
  const mcMatch = q.match(/(?:for|mc|minecraft)\s*(\d+\.\d+(?:\.\d+)?)/);
  if (mcMatch) facets.mc_version = mcMatch[1];

  if (q.includes('fabric')) facets.loader = 'fabric';
  if (q.includes('forge')) facets.loader = 'forge';
  if (q.includes('quilt')) facets.loader = 'quilt';

  const depMatch = q.match(/depend(?:s)? on (\w+)/);
  if (depMatch) facets.dependency = depMatch[1];

  const keywords = q.split(' ').filter(w => !['for', 'that', 'on', 'mods', 'mod'].includes(w));

  return { raw: rawQuery, facets, keywords };
}

export function executeSmartContext(query: string): ContextBundle {
  const parsed = parseQuery(query);
  const bundleEntities = new Map<string, Entity>();
  const edges: BundleEdge[] = [];
  const semantic_matches: Array<{ id: string; score: number; section: string }> = [];
  const pruned_dewey_spaces = ["794.81.1 (Mods)", "794.81.3 (Dependencies)"];

  // Step 1: Find target dependency mod if specified
  let targetModId: string | null = null;
  if (parsed.facets.dependency) {
    const target = mockEntities.find(e =>
      e.type === 'Mod' && e.canonical.slug === parsed.facets.dependency
    );
    if (target) {
      targetModId = target.id;
      bundleEntities.set(target.id, target);
      semantic_matches.push({ id: target.id, score: 0.98, section: "name/slug" });
    }
  }

  // Step 2: Vector Search & Facet filtering (Mocked)
  if (targetModId) {
    // Find dependency edges pointing to target
    const targetEdges = mockEntities.filter(e =>
      e.type === 'DependencyEdge' &&
      e.canonical.target_mod_id === targetModId
    );

    targetEdges.forEach(edge => {
      bundleEntities.set(edge.id, edge);
      semantic_matches.push({ id: edge.id, score: 0.85, section: "clause_text" });

      // Source Mod
      if (edge.canonical.source_mod_id) {
        const srcMod = mockEntities.find(m => m.id === edge.canonical.source_mod_id);
        if (srcMod) {
          bundleEntities.set(srcMod.id, srcMod);
          edges.push({ source: srcMod.id, target: targetModId!, type: edge.canonical.relation as string });
        }
      }

      // Source Version
      if (edge.canonical.source_version_id) {
        const srcVer = mockEntities.find(v => v.id === edge.canonical.source_version_id);
        if (srcVer) {
          bundleEntities.set(srcVer.id, srcVer);
          edges.push({ source: srcVer.id, target: targetModId!, type: edge.canonical.relation as string });

          // Link version to its parent mod
          const parentMod = mockEntities.find(m => m.id === srcVer.canonical.mod_id);
          if (parentMod) {
            bundleEntities.set(parentMod.id, parentMod);
            edges.push({ source: srcVer.id, target: parentMod.id, type: "belongs_to" });
          }
        }
      }
    });
  } else {
      // General search if no dependency specified
      const mods = mockEntities.filter(e => {
        if (e.type !== 'Mod') return false;
        const name = typeof e.canonical.name === 'string' ? e.canonical.name : '';
        const desc = typeof e.canonical.description_summary === 'string' ? e.canonical.description_summary : '';
        return parsed.keywords.some(k => name.toLowerCase().includes(k) || desc.toLowerCase().includes(k));
      });
      mods.forEach(m => {
          bundleEntities.set(m.id, m);
          semantic_matches.push({ id: m.id, score: 0.92, section: "description_summary" });
      });
  }

  const finalEntities = Array.from(bundleEntities.values());

  return {
    query: query,
    resolved_facets: parsed.facets,
    pruned_dewey_spaces,
    semantic_matches,
    expanded_nodes: finalEntities.length,
    entities: finalEntities,
    edges
  };
}
