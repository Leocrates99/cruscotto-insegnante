import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Genera le icone PWA dal motivo "tempio" (🏛️) nei colori del brand.
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../public/icons");
mkdirSync(out, { recursive: true });

const GOLD = "#e9d4a8";
const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a20c4"/><stop offset="1" stop-color="#0f0070"/></linearGradient></defs>`;

// Frontone + architrave + 4 colonne + stilobate (vista frontale di un tempio).
const temple = (c) => `
  <path d="M256 92 L398 176 L114 176 Z" fill="${c}"/>
  <rect x="114" y="186" width="284" height="26" rx="5" fill="${c}"/>
  <rect x="138" y="226" width="28" height="150" rx="5" fill="${c}"/>
  <rect x="207" y="226" width="28" height="150" rx="5" fill="${c}"/>
  <rect x="277" y="226" width="28" height="150" rx="5" fill="${c}"/>
  <rect x="346" y="226" width="28" height="150" rx="5" fill="${c}"/>
  <rect x="104" y="386" width="304" height="30" rx="7" fill="${c}"/>`;

const svgAny = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${grad}<rect width="512" height="512" rx="104" fill="url(#g)"/>${temple(GOLD)}</svg>`;

// Maskable: sfondo a tutto quadrato + motivo nella zona sicura centrale (~70%).
const svgMask = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${grad}<rect width="512" height="512" fill="url(#g)"/><g transform="translate(76 76) scale(0.703)">${temple(GOLD)}</g></svg>`;

const tasks = [
  ["icon-192.png", svgAny, 192],
  ["icon-512.png", svgAny, 512],
  ["icon-maskable-512.png", svgMask, 512],
  ["apple-touch-icon.png", svgMask, 180],
  ["favicon-32.png", svgAny, 32],
];

for (const [name, svg, size] of tasks) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(resolve(out, name));
  console.log("✓ " + name);
}
writeFileSync(resolve(out, "icon.svg"), svgAny);
console.log("✓ icon.svg");
