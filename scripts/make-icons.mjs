// Renders brands/<id>/icon.svg into the PNG set the PWA manifest and the native
// projects need. A brand without an icon.svg keeps whatever PNGs it already has.
//
//   npm run icons            all brands
//   BRAND=parkguard npm run icons
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.env.BRAND;
const brands = fs.readdirSync(path.join(root, 'brands')).filter(b => !only || b === only);

// maskable needs the mark inside the safe zone, so it is drawn smaller on its ground.
const SIZES = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'icon-512-maskable.png', size: 512, pad: 0.18 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
];

for (const brand of brands) {
  const svg = path.join(root, 'brands', brand, 'icon.svg');
  if (!fs.existsSync(svg)) {
    console.log(`${brand}: no icon.svg — keeping existing PNGs`);
    continue;
  }

  const outDir = path.join(root, 'brands', brand, 'icons');
  fs.mkdirSync(outDir, { recursive: true });
  const ground = JSON.parse(
    fs.readFileSync(path.join(root, 'brands', brand, 'brand.json'), 'utf8')
  ).colors.navy;

  for (const { file, size, pad } of SIZES) {
    const inner = Math.round(size * (1 - pad * 2));
    const mark = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: ground },
    })
      .composite([{ input: mark, gravity: 'center' }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, file));
  }
  console.log(`${brand}: wrote ${SIZES.length} icons`);
}
