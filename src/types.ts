export interface ProvenanceRecord {
  source: string;
  project_id?: string | number;
  field: string;
  confidence: number;
}

export type EntityType = 'Mod' | 'Version' | 'FileArtifact' | 'DependencyEdge' | 'License' | 'Author';

export interface Entity {
  id: string;
  dewey_code: string;
  type: EntityType;
  canonical: Record<string, string | number | boolean | string[]>;
  provenance: Record<string, ProvenanceRecord[]>;
  aliases?: Array<{ source: string; project_id: string | number; slug: string }>;
  timestamps: {
    first_seen: string;
    last_canonicalized: string;
  };
  vector_2d?: [number, number]; // 2D projection for semantic visualization
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  entity?: Entity;
  children?: FileNode[];
  dewey_prefix?: string;
}

export interface SearchQuery {
  raw: string;
  facets: {
    mc_version?: string;
    loader?: string;
    dependency?: string;
  };
  keywords: string[];
}

export interface BundleEdge {
  source: string;
  target: string;
  type: string;
}

export interface ContextBundle {
  query: string;
  resolved_facets: Record<string, string | undefined>;
  pruned_dewey_spaces: string[];
  semantic_matches: Array<{ id: string; score: number; section: string }>;
  expanded_nodes: number;
  entities: Entity[];
  edges: BundleEdge[];
}
