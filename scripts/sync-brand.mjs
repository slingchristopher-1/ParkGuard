// Picks the brand for this build and writes everything derived from it.
//
//   BRAND=parkmatiq npm run build
//
// Writes:
//   src/brand/active.json    the app imports this at runtime
//   capacitor.config.json    appId / appName for BOTH android and ios
//   public/icon-*.png        the brand's icons, for the PWA manifest
//
// Nothing else in the codebase knows which brand is being built.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = process.env.BRAND || 'parkguard';
const dir = path.join(root, 'brands', brand);

if (!fs.existsSync(dir)) {
  const available = fs.readdirSync(path.join(root, 'brands')).join(', ');
  console.error(`Unknown brand "${brand}". Available: ${available}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(path.join(dir, 'brand.json'), 'utf8'));

fs.mkdirSync(path.join(root, 'src/brand'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'src/brand/active.json'),
  JSON.stringify(config, null, 2) + '\n'
);

fs.writeFileSync(
  path.join(root, 'capacitor.config.json'),
  JSON.stringify({
    appId: config.appId,
    appName: config.name,
    webDir: 'dist',
    backgroundColor: config.colors.navy,
    // A native project bakes in its appId, so each brand gets its own folder.
    // Both are fed from the same dist/, so a general change still reaches both.
    android: { path: `native/${brand}/android` },
    ios: { path: `native/${brand}/ios` },
    plugins: {
      Geolocation: { permissions: ['location'] },
      LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: config.colors.yellow },
    },
  }, null, 2) + '\n'
);

const icons = path.join(dir, 'icons');
fs.mkdirSync(path.join(root, 'public'), { recursive: true });
if (fs.existsSync(icons)) {
  for (const file of fs.readdirSync(icons)) {
    fs.copyFileSync(path.join(icons, file), path.join(root, 'public', file));
  }
}

console.log(`brand: ${config.name} (${config.appId})`);
