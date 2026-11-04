const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");
const webAssets = [
  "index.html",
  "styles.css",
  "mobile.css",
  "app.js",
  "vocabulary.js",
  "vocabulary-extra.js",
  "manifest.json",
  "service-worker.js",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

async function buildWebBundle() {
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });

  for (const asset of webAssets) {
    const source = path.join(root, asset);
    await fs.access(source);
    await fs.copyFile(source, path.join(output, asset));
  }
}

buildWebBundle().catch((error) => {
  console.error("Could not prepare the Hanzi web bundle.", error);
  process.exitCode = 1;
});
