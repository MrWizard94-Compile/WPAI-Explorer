import fs from 'node:fs';
import path from 'node:path';
import { mockEntities } from '../src/data/mockEntities';
import { jsonToYaml } from '../src/utils/yaml';

const outputDir = path.resolve(process.cwd(), 'data', 'entities');
fs.mkdirSync(outputDir, { recursive: true });

for (const entity of mockEntities) {
  const fileName = `${entity.id}.yaml`;
  const filePath = path.join(outputDir, fileName);
  const yaml = jsonToYaml(entity);
  fs.writeFileSync(filePath, yaml + '\n', 'utf8');
  console.log(`Wrote ${path.relative(process.cwd(), filePath)}`);
}

console.log(`Generated ${mockEntities.length} YAML entities in ${path.relative(process.cwd(), outputDir)}`);
