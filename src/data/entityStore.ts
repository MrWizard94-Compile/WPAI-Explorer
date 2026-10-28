import fs from 'node:fs';
import path from 'node:path';
import { Entity, FileNode } from '../types';

const DEFAULT_DATA_ROOT = path.resolve(process.cwd(), 'data');

function isYamlFile(name: string) {
  return name.endsWith('.yaml') || name.endsWith('.yml');
}

function parseSimpleYaml(content: string): unknown {
  const lines = content.split(/\r?\n/);
  const stack: Array<{ indent: number; value: any }> = [{ indent: -1, value: {} }];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').replace(/\t/g, '  ').trimEnd();
    if (!line.trim()) continue;

    const indent = rawLine.search(/\S|$/);
    const keyValueMatch = line.match(/^([a-zA-Z0-9_\-\.]+):(?:\s*(.*))?$/);
    const arrayItemMatch = line.match(/^-\s*(.*)$/);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (arrayItemMatch) {
      const itemValue = parseScalar(arrayItemMatch[1]);
      if (!Array.isArray(parent)) {
        const arr: unknown[] = [];
        if (typeof parent === 'object' && parent !== null) {
          const lastKey = Object.keys(parent).at(-1);
          if (lastKey) {
            parent[lastKey] = arr;
          }
        }
        stack.push({ indent, value: arr });
      }
      stack[stack.length - 1].value.push(itemValue);
      continue;
    }

    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const rawValue = keyValueMatch[2] ?? '';
      const value = rawValue === '' ? {} : parseScalar(rawValue);
      if (typeof parent === 'object' && parent !== null && !Array.isArray(parent)) {
        parent[key] = value;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        stack.push({ indent, value });
      }
      continue;
    }
  }

  return stack[0].value;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return Number.parseFloat(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map((item) => parseScalar(item));
  }
  return trimmed;
}

function toEntity(value: unknown, filePath: string): Entity | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const id = typeof record.id === 'string' ? record.id : path.basename(filePath, path.extname(filePath));
  const dewey_code = typeof record.dewey_code === 'string' ? record.dewey_code : '000.00.00';
  const type = typeof record.type === 'string' ? record.type as Entity['type'] : 'Mod';
  const canonical = typeof record.canonical === 'object' && record.canonical !== null ? record.canonical as Record<string, string | number | boolean | string[]> : {};
  const provenance = typeof record.provenance === 'object' && record.provenance !== null ? record.provenance as Record<string, any> : {};
  const aliases = Array.isArray(record.aliases) ? record.aliases.map((item) => item as { source: string; project_id: string | number; slug: string }) : undefined;
  const timestamps = typeof record.timestamps === 'object' && record.timestamps !== null ? record.timestamps as Entity['timestamps'] : {
    first_seen: new Date().toISOString(),
    last_canonicalized: new Date().toISOString()
  };
  const vector_2d = Array.isArray(record.vector_2d) && record.vector_2d.length === 2
    ? [Number(record.vector_2d[0]), Number(record.vector_2d[1])] as [number, number]
    : undefined;

  const normalizedProvenance: Record<string, any> = {};
  for (const [field, entry] of Object.entries(provenance)) {
    if (Array.isArray(entry)) {
      normalizedProvenance[field] = entry.map((item) => ({
        source: String((item as Record<string, unknown>).source || 'unknown'),
        project_id: (item as Record<string, unknown>).project_id,
        field: String((item as Record<string, unknown>).field || field),
        confidence: typeof (item as Record<string, unknown>).confidence === 'number' ? (item as Record<string, unknown>).confidence : 0.5
      }));
    }
  }

  return {
    id,
    dewey_code,
    type,
    canonical,
    provenance: normalizedProvenance,
    aliases,
    timestamps,
    vector_2d
  };
}

export class EntityStore {
  root: string;
  tree: FileNode;
  entities: Map<string, Entity>;
  entityFilePath: Map<string, string>;

  constructor(root?: string) {
    this.root = root ? path.resolve(root) : DEFAULT_DATA_ROOT;
    this.entities = new Map();
    this.entityFilePath = new Map();
    this.tree = { name: path.basename(this.root), type: 'folder', path: '/', children: [] };
    this.loadData();
  }

  loadData() {
    const tree = this.buildTree(this.root, '/');
    this.tree = tree;
  }

  buildTree(folderPath: string, relativePath: string): FileNode {
    const children: FileNode[] = [];
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const entryPath = path.join(folderPath, entry.name);
      const nodePath = path.posix.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        children.push(this.buildTree(entryPath, nodePath));
        continue;
      }

      if (entry.isFile() && isYamlFile(entry.name)) {
        const content = fs.readFileSync(entryPath, 'utf8');
        const parsed = parseSimpleYaml(content);
        const entity = toEntity(parsed, entryPath);
        const fileNode: FileNode = {
          name: entry.name,
          type: 'file',
          path: nodePath,
          content,
          entity: entity || undefined
        };
        if (entity) {
          this.entities.set(entity.id, entity);
          this.entityFilePath.set(entity.id, fileNode.path);
        }
        children.push(fileNode);
      }
    }

    return {
      name: path.basename(folderPath),
      type: 'folder',
      path: relativePath,
      children
    };
  }

  getTree() {
    return this.tree;
  }

  getFile(pathName: string) {
    const normalized = path.posix.normalize(pathName);
    const filePath = path.posix.join('/', normalized);
    const findNode = (node: FileNode): FileNode | null => {
      if (node.path === filePath) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(this.tree);
  }

  getEntityById(id: string) {
    return this.entities.get(id);
  }

  getEntityFilePath(id: string) {
    return this.entityFilePath.get(id) || null;
  }

  getEntityAbsoluteFilePath(id: string) {
    const relative = this.entityFilePath.get(id);
    if (!relative) return null;
    const normalized = relative.startsWith('/') ? relative.slice(1) : relative;
    return path.resolve(this.root, normalized);
  }

  searchEntities(query: string) {
    const lower = query.toLowerCase();
    return Array.from(this.entities.values()).filter((entity) => {
      const name = String(entity.canonical.name || '');
      const slug = String(entity.canonical.slug || '');
      const desc = String(entity.canonical.description_summary || '');
      const loaders = Array.isArray(entity.canonical.loaders) ? entity.canonical.loaders.join(' ') : '';
      return [name, slug, desc, loaders, entity.dewey_code, entity.type]
        .some((field) => field.toLowerCase().includes(lower));
    });
  }

  getGraphData() {
    const nodes = Array.from(this.entities.values()).filter((entity) => entity.type === 'Mod' || entity.type === 'Version');
    const edges = Array.from(this.entities.values())
      .filter((entity) => entity.type === 'DependencyEdge')
      .map((edge) => ({
        source: String(edge.canonical.source_mod_id || edge.canonical.source_version_id || ''),
        target: String(edge.canonical.target_mod_id || ''),
        relation: String(edge.canonical.relation || 'depends_on')
      }))
      .filter((edge) => edge.source && edge.target);
    return { nodes, edges };
  }

  getVectorData() {
    return Array.from(this.entities.values())
      .filter((entity) => entity.vector_2d)
      .map((entity) => ({ id: entity.id, ...entity }));
  }
}

export const entityStore = new EntityStore();
