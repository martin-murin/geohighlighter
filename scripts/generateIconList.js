const fs = require('fs');
const path = require('path');

// Directory containing bootstrap-icons SVGs
const iconsDir = path.resolve(__dirname, '../node_modules/bootstrap-icons/icons');

// Read all SVG files
const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));

// Extract base names
const baseNames = files.map(f => path.basename(f, '.svg'));

// Output JSON to src/iconList.json
const outPath = path.resolve(__dirname, '../src/iconList.json');
fs.writeFileSync(outPath, JSON.stringify(baseNames, null, 2));
console.log(`Generated icon list (${baseNames.length} entries) at ${outPath}`);
