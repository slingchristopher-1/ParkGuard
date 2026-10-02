// Builds every brand in brands/ into dist-<brand>/, so one `npm run build:all`
// proves a general change still compiles for all of them.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brands = fs.readdirSync(path.join(root, 'brands'));

for (const brand of brands) {
  execFileSync('npm', ['run', 'build'], {
    cwd: root,
    env: { ...process.env, BRAND: brand },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  const out = path.join(root, `dist-${brand}`);
  fs.rmSync(out, { recursive: true, force: true });
  fs.renameSync(path.join(root, 'dist'), out);
  console.log(`→ dist-${brand}\n`);
}
