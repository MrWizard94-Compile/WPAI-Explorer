import { Entity, SearchQuery, ContextBundle, BundleEdge } from '../types';
import { entityStore } from '../data/entityStore';

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
    const target = Array.from(entityStore.entities.values()).find(e =>
      e.type === 'Mod' && String(e.canonical.slug).toLowerCase() === parsed.facets.dependency?.toLowerCase()
    );
    if (target) {
      targetModId = target.id;
      bundleEntities.set(target.id, target);
      semantic_matches.push({ id: target.id, score: 0.98, section: 'name/slug' });
    }
  }

  if (targetModId) {
    const targetEdges = Array.from(entityStore.entities.values()).filter(e =>
      e.type === 'DependencyEdge' && String(e.canonical.target_mod_id) === targetModId
    );

    targetEdges.forEach(edge => {
      bundleEntities.set(edge.id, edge);
      semantic_matches.push({ id: edge.id, score: 0.85, section: 'clause_text' });

      if (edge.canonical.source_mod_id) {
        const srcMod = entityStore.getEntityById(String(edge.canonical.source_mod_id));
        if (srcMod) {
          bundleEntities.set(srcMod.id, srcMod);
          edges.push({ source: srcMod.id, target: targetModId!, type: String(edge.canonical.relation || 'depends_on') });
        }
      }

      if (edge.canonical.source_version_id) {
        const srcVer = entityStore.getEntityById(String(edge.canonical.source_version_id));
        if (srcVer) {
          bundleEntities.set(srcVer.id, srcVer);
          edges.push({ source: srcVer.id, target: targetModId!, type: String(edge.canonical.relation || 'depends_on') });

          const parentMod = entityStore.getEntityById(String(srcVer.canonical.mod_id));
          if (parentMod) {
            bundleEntities.set(parentMod.id, parentMod);
            edges.push({ source: srcVer.id, target: parentMod.id, type: 'belongs_to' });
          }
        }
      }
    });
  } else {
    const results = entityStore.searchEntities(query).filter((entity) => entity.type === 'Mod');
    const matches = results.length > 0 ? results : Array.from(entityStore.entities.values()).filter((entity) => entity.type === 'Mod');
    matches.forEach((mod) => {
      bundleEntities.set(mod.id, mod);
      semantic_matches.push({ id: mod.id, score: 0.92, section: 'description_summary' });
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
