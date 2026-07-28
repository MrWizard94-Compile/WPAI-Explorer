import { Entity, FileNode } from '../types';
import { jsonToYaml } from '../utils/yaml';

const NOW = new Date().toISOString();

export const mockEntities: Entity[] = [
  // --- SODIUM ---
  {
    id: "mod_sodium_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Sodium",
      slug: "sodium",
      description_summary: "High performance optimization mod for rendering.",
      loaders: ["fabric", "quilt"],
      categories: ["performance", "rendering"],
      license: "lgpl-3.0"
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "AANobbMI", field: "title", confidence: 0.98 }, { source: "curseforge", project_id: 395806, field: "name", confidence: 0.95 }],
      description_summary: [{ source: "modrinth", project_id: "AANobbMI", field: "description", confidence: 0.9 }]
    },
    aliases: [
      { source: "modrinth", project_id: "AANobbMI", slug: "sodium" },
      { source: "curseforge", project_id: 395806, slug: "sodium" }
    ],
    timestamps: { first_seen: "2020-05-15T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [20, 30]
  },
  {
    id: "ver_sodium_053_1201",
    dewey_code: "794.81.2",
    type: "Version",
    canonical: {
      mod_id: "mod_sodium_001",
      version_number: "0.5.3",
      game_versions: ["1.20.1"],
      loaders: ["fabric", "quilt"],
      changelog_summary: "Fixed chunk rendering issues and updated mixins."
    },
    provenance: {
      version_number: [{ source: "modrinth", field: "version_number", confidence: 1.0 }]
    },
    timestamps: { first_seen: "2023-08-10T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [21, 31]
  },

  // --- IRIS ---
  {
    id: "mod_iris_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Iris Shaders",
      slug: "iris",
      description_summary: "A modern shaders mod for Minecraft intended to be compatible with existing OptiFine shader packs.",
      loaders: ["fabric", "quilt"],
      categories: ["rendering", "shaders"]
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "YL57xq9U", field: "title", confidence: 0.99 }]
    },
    aliases: [
      { source: "modrinth", project_id: "YL57xq9U", slug: "iris" },
      { source: "curseforge", project_id: 455508, slug: "iris" }
    ],
    timestamps: { first_seen: "2021-02-12T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [30, 80]
  },
  {
    id: "ver_iris_1610_1201",
    dewey_code: "794.81.2",
    type: "Version",
    canonical: {
      mod_id: "mod_iris_001",
      version_number: "1.6.10",
      game_versions: ["1.20.1"],
      loaders: ["fabric"],
      changelog_summary: "Added support for Sodium 0.5.3."
    },
    provenance: {
      version_number: [{ source: "modrinth", field: "version_number", confidence: 1.0 }]
    },
    timestamps: { first_seen: "2023-08-11T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [31, 81]
  },
  {
    id: "dep_iris_sodium_1201",
    dewey_code: "794.81.3",
    type: "DependencyEdge",
    canonical: {
      source_version_id: "ver_iris_1610_1201",
      target_mod_id: "mod_sodium_001",
      relation: "required",
      version_range: ">=0.5.3",
      clause_text: "requires sodium >=0.5.3 on fabric"
    },
    provenance: {
      relation: [{ source: "modrinth", field: "dependencies", confidence: 1.0 }]
    },
    timestamps: { first_seen: "2023-08-11T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [25, 55]
  },

  // --- INDIUM ---
  {
    id: "mod_indium_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Indium",
      slug: "indium",
      description_summary: "Sodium addon providing support for the Fabric Rendering API.",
      loaders: ["fabric", "quilt"],
      categories: ["performance", "api-implementation"]
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "Orvt0mRa", field: "title", confidence: 0.99 }]
    },
    aliases: [
      { source: "modrinth", project_id: "Orvt0mRa", slug: "indium" }
    ],
    timestamps: { first_seen: "2021-06-20T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [22, 35]
  },
  {
    id: "ver_indium_1027_1201",
    dewey_code: "794.81.2",
    type: "Version",
    canonical: {
      mod_id: "mod_indium_001",
      version_number: "1.0.27+mc1.20.1",
      game_versions: ["1.20.1"],
      loaders: ["fabric"],
      changelog_summary: "Fix compatibility with Sodium 0.5.x"
    },
    provenance: {
      version_number: [{ source: "modrinth", field: "version_number", confidence: 1.0 }]
    },
    timestamps: { first_seen: "2023-08-15T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [23, 36]
  },
  {
    id: "dep_indium_sodium_001",
    dewey_code: "794.81.3",
    type: "DependencyEdge",
    canonical: {
      source_mod_id: "mod_indium_001",
      target_mod_id: "mod_sodium_001",
      relation: "required",
      version_range: "*",
      clause_text: "Indium fundamentally requires Sodium to function."
    },
    provenance: {
      relation: [{ source: "modrinth", field: "dependencies", confidence: 1.0 }]
    },
    timestamps: { first_seen: "2021-06-20T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [21, 32]
  },

  // --- LITHIUM ---
  {
    id: "mod_lithium_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Lithium",
      slug: "lithium",
      description_summary: "No-compromises game logic optimization mod.",
      loaders: ["fabric", "quilt"],
      categories: ["performance"]
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "gvQqBUqZ", field: "title", confidence: 0.99 }]
    },
    aliases: [
      { source: "modrinth", project_id: "gvQqBUqZ", slug: "lithium" }
    ],
    timestamps: { first_seen: "2020-06-01T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [18, 28]
  },

  // --- CREATE ---
  {
    id: "mod_create_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Create",
      slug: "create",
      description_summary: "A mod offering a variety of tools and blocks for Building, Decoration and Aesthetic Automation.",
      loaders: ["forge", "fabric"],
      categories: ["technology", "automation"]
    },
    provenance: {
      name: [{ source: "curseforge", project_id: 328085, field: "name", confidence: 1.0 }]
    },
    aliases: [
      { source: "curseforge", project_id: 328085, slug: "create" },
      { source: "modrinth", project_id: "Xbc0uyRg", slug: "create" }
    ],
    timestamps: { first_seen: "2019-11-20T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [80, 20]
  },

  // --- FABRIC API ---
  {
    id: "mod_fabric_api_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Fabric API",
      slug: "fabric-api",
      description_summary: "Essential hooks and interoperability measures for Fabric mods.",
      loaders: ["fabric", "quilt"],
      categories: ["library", "api"]
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "P7R2awM3", field: "title", confidence: 1.0 }]
    },
    aliases: [
      { source: "modrinth", project_id: "P7R2awM3", slug: "fabric-api" },
      { source: "curseforge", project_id: 306612, slug: "fabric-api" }
    ],
    timestamps: { first_seen: "2018-12-10T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [15, 40]
  },

  // --- FERRITECORE ---
  {
    id: "mod_ferritecore_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "FerriteCore",
      slug: "ferritecore",
      description_summary: "Memory usage optimizations for Minecraft.",
      loaders: ["fabric", "forge", "quilt"],
      categories: ["performance"]
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "uXXwy32m", field: "title", confidence: 0.99 }]
    },
    aliases: [
      { source: "modrinth", project_id: "uXXwy32m", slug: "ferritecore" }
    ],
    timestamps: { first_seen: "2021-01-05T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [19, 25]
  },

  // --- REESE'S SODIUM OPTIONS ---
  {
    id: "mod_reeses_sodium_001",
    dewey_code: "794.81.1",
    type: "Mod",
    canonical: {
      name: "Reese's Sodium Options",
      slug: "reeses-sodium-options",
      description_summary: "Replaces Sodium's video options screen with a tabbed interface for better usability.",
      loaders: ["fabric", "quilt"],
      categories: ["performance", "gui"]
    },
    provenance: {
      name: [{ source: "modrinth", project_id: "Bh13M22g", field: "title", confidence: 1.0 }]
    },
    aliases: [
      { source: "modrinth", project_id: "Bh13M22g", slug: "reeses-sodium-options" }
    ],
    timestamps: { first_seen: "2021-08-01T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [22, 29]
  },
  {
    id: "dep_reeses_sodium_001",
    dewey_code: "794.81.3",
    type: "DependencyEdge",
    canonical: {
      source_mod_id: "mod_reeses_sodium_001",
      target_mod_id: "mod_sodium_001",
      relation: "required",
      version_range: ">=0.5.0",
      clause_text: "Reese's Sodium Options requires Sodium to enhance its video options menu."
    },
    provenance: {
      relation: [{ source: "modrinth", field: "dependencies", confidence: 1.0 }]
    },
    timestamps: { first_seen: "2021-08-01T00:00:00Z", last_canonicalized: NOW },
    vector_2d: [21, 30]
  }
];

// Helper to insert a file into our nested tree
function insertPath(root: FileNode[], pathParts: string[], entity: Entity) {
  let currentLevel = root;

  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];
    const isFile = i === pathParts.length - 1;

    let node = currentLevel.find(n => n.name === part);
    if (!node) {
      const newPath = pathParts.slice(0, i + 1).join('/');
      node = {
        name: part,
        type: isFile ? 'file' : 'folder',
        path: '/' + newPath,
        children: isFile ? undefined : []
      };
      // Assign Dewey Prefix meta for visual rendering in explorer
      if (!isFile && part.startsWith('794')) {
        node.dewey_prefix = part;
      }

      if (isFile) {
        node.entity = entity;
        node.content = jsonToYaml(entity);
      }
      currentLevel.push(node);

      // Sort folders first, then files alphabetically
      currentLevel.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    if (!isFile && node.children) {
      currentLevel = node.children;
    }
  }
}

export function generateFileSystem(): FileNode {
  const rootChildren: FileNode[] = [];

  // Create /mc-canon/entities
  for (const entity of mockEntities) {
    const typePath = ['mc-canon', 'entities', entity.type, entity.id, `${entity.id}.yaml`];
    insertPath(rootChildren, typePath, entity);

    // Create /mc-canon/dewey links
    // Split the dewey code slightly to simulate hierarchical categories
    const deweyPath = ['mc-canon', 'dewey', entity.dewey_code, entity.type, `${entity.id}.yaml`];
    insertPath(rootChildren, deweyPath, entity);
  }

  // Add some mock cas files and index manifests to show the structure
  const casNode: FileNode = {
    name: 'cas', type: 'folder', path: '/mc-canon/cas', children: [
      { name: 'sha256', type: 'folder', path: '/mc-canon/cas/sha256', children: [
        { name: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', type: 'file', path: '/mc-canon/cas/sha256/...', content: 'Long changelog text blob containing detailed update notes.' }
      ]}
    ]
  };

  const indexNode: FileNode = {
    name: 'indexes', type: 'folder', path: '/mc-canon/indexes', children: [
      { name: 'facets', type: 'folder', path: '/mc-canon/indexes/facets', children: [
        { name: 'compatibility.parquet', type: 'file', path: '/mc-canon/indexes/facets/compatibility.parquet', content: 'BINARY PARQUET DATA' }
      ]},
      { name: 'vector', type: 'folder', path: '/mc-canon/indexes/vector', children: [
        { name: 'manifest.yaml', type: 'file', path: '/mc-canon/indexes/vector/manifest.yaml', content: 'vector_id_1: mod_sodium_001.description_summary\nvector_id_2: dep_iris_sodium_1201.clause_text' },
        { name: 'ann.index', type: 'file', path: '/mc-canon/indexes/vector/ann.index', content: 'HNSW GRAPH BLOB' }
      ]}
    ]
  };

  rootChildren.find(n => n.name === 'mc-canon')?.children?.push(casNode, indexNode);

  return {
    name: '/',
    type: 'folder',
    path: '/',
    children: rootChildren
  };
}
