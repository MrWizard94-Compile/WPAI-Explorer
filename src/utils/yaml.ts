export function jsonToYaml(obj: unknown, indent = 0): string {
  if (obj === null) return 'null';
  if (obj === undefined) return '';

  const spaces = ' '.repeat(indent);

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    let yaml = '';
    for (const item of obj) {
      if (typeof item !== 'object' || item === null) {
        yaml += `\n${spaces}- ${jsonToYaml(item)}`;
      } else {
        const itemYaml = jsonToYaml(item, indent + 2);
        yaml += `\n${spaces}- ${itemYaml.trimStart()}`;
      }
    }
    return yaml;
  }

  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return '{}';

  let yaml = '';
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const val = record[key];
    const prefix = i === 0 && indent > 0 ? '' : (indent > 0 ? '\n' + spaces : '');

    if (typeof val !== 'object' || val === null) {
      yaml += `${prefix}${key}: ${jsonToYaml(val)}`;
    } else if (Array.isArray(val) && val.length === 0) {
      yaml += `${prefix}${key}: []`;
    } else if (Object.keys(val).length === 0) {
      yaml += `${prefix}${key}: {}`;
    } else {
      yaml += `${prefix}${key}:${jsonToYaml(val, indent + 2)}`;
    }

    if (i < keys.length - 1 && indent === 0) {
      yaml += '\n';
    }
  }
  return yaml;
}
