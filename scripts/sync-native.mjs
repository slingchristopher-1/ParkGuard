// Pushes the current web build into every brand's Android and iOS project.
//
//   npm run native:sync
//
// This is what makes a general change land everywhere: one shared src/, built
// once per brand, copied into both native shells for each.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brands = fs.readdirSync(path.join(root, 'brands'));
const run = (cmd, args, env) => execFileSync(cmd, args, {
  cwd: root, env: { ...process.env, ...env }, stdio: 'inherit',
  shell: process.platform === 'win32',
});

for (const brand of brands) {
  const native = path.join(root, 'native', brand);
  if (!fs.existsSync(native)) {
    console.log(`${brand}: no native project yet — skipping (npm run android:add)`);
    continue;
  }
  run('npm', ['run', 'build'], { BRAND: brand });
  for (const platform of ['android', 'ios']) {
    if (fs.existsSync(path.join(native, platform))) {
      run('npx', ['cap', 'sync', platform], { BRAND: brand });
    }
  }
  console.log(`${brand}: synced\n`);
}
