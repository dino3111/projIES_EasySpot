import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const testDir = path.join(root, 'src');

function collectTests(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTests(fullPath));
      continue;
    }
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = collectTests(testDir)
  .map((file) => path.relative(root, file))
  .filter((file) => !file.includes(`${path.sep}e2e${path.sep}`))
  .sort();

for (const file of files) {
  console.log(`\n> vitest run ${file}`);
  execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vitest', 'run', file, '--reporter=verbose'],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=8192',
      },
    },
  );
}
