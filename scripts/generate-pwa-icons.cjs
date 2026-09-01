// Regenerates public/icons/*.png from app/icon.svg — the PWA manifest needs
// real raster PNGs (Android/Chrome's install criteria don't reliably accept
// an SVG-only icon set); re-run this whenever app/icon.svg changes.
// Usage: node scripts/generate-pwa-icons.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'app', 'icon.svg');
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const svg = fs.readFileSync(SRC);

  // "any" purpose icons — used as-is, safe zone already baked into the
  // artwork (rounded-rect background fills the full 512x512 canvas).
  for (const size of [192, 512]) {
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}.png`));
    console.log(`wrote icon-${size}.png`);
  }

  // "maskable" purpose — OS icon masks (circle, squircle, etc.) crop up to
  // ~20% from each edge, so the artwork is padded onto a larger canvas at
  // ~70% scale to keep the 'A' mark inside every mask's safe zone.
  const maskableSize = 512;
  const artworkScale = 0.7;
  const artworkSize = Math.round(maskableSize * artworkScale);
  const offset = Math.round((maskableSize - artworkSize) / 2);

  const artwork = await sharp(svg, { density: 384 }).resize(artworkSize, artworkSize).png().toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: '#0F172A',
    },
  })
    .composite([{ input: artwork, left: offset, top: offset }])
    .png()
    .toFile(path.join(OUT_DIR, 'icon-512-maskable.png'));
  console.log('wrote icon-512-maskable.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
