#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');

// Images to compress: [path, targetSizeKB, quality]
const toCompress = [
  // Heroes > 500KB → compress to quality 72
  ['experiences/exp-hybrid-challenge-hero.webp', 500, 72],
  ['experiences/exp-conference-hero.webp', 500, 72],
  ['experiences/exp-bespoke-hero.webp', 500, 72],
  ['experiences/exp-fugitive-hero.webp', 500, 72],
  ['experiences/exp-amazing-race-hero.webp', 500, 72],
  ['experiences/exp-community-champions-hero.webp', 500, 72],
  // Non-hero images > 200KB
  ['blog/blog-03-coaching-leader.webp', 200, 72],
  ['home/home-card-escape-labs.webp', 200, 72],
];

async function compress(relPath, targetKB, quality) {
  const fullPath = path.join(IMAGES_DIR, relPath);
  const beforeSize = fs.statSync(fullPath).size;

  // Read metadata
  const meta = await sharp(fullPath).metadata();

  // Try progressive quality reduction to hit target
  let buf;
  let q = quality;
  while (q >= 55) {
    buf = await sharp(fullPath).webp({ quality: q, effort: 4 }).toBuffer();
    if (buf.length <= targetKB * 1024) break;
    q -= 5;
  }

  if (!buf || buf.length > targetKB * 1024 * 1.1) {
    // Try resizing if quality reduction alone isn't enough
    const scale = Math.sqrt((targetKB * 1024) / beforeSize);
    const newWidth = Math.round(meta.width * Math.min(scale, 0.85));
    buf = await sharp(fullPath)
      .resize(newWidth, null, { withoutEnlargement: true })
      .webp({ quality: q, effort: 4 })
      .toBuffer();
  }

  const afterSize = buf.length;
  const reduction = Math.round((1 - afterSize / beforeSize) * 100);

  // Write back
  fs.writeFileSync(fullPath, buf);
  console.log(`${relPath}: ${Math.round(beforeSize/1024)}KB → ${Math.round(afterSize/1024)}KB (${reduction}% reduction, q=${q})`);
}

(async () => {
  for (const [relPath, targetKB, quality] of toCompress) {
    try {
      await compress(relPath, targetKB, quality);
    } catch (e) {
      console.error(`Failed ${relPath}: ${e.message}`);
    }
  }
  console.log('\nDone.');
})();
