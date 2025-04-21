// scripts/generate-defaults.js
const fs = require('fs');
const fetch = require('node-fetch'); // npm install node-fetch@2

async function fetchGeo(id, polygon = 1) {
  const prefix = /^[nwrstmblap]\d+$/i.test(id)
    ? `[https://nominatim.openstreetmap.org/lookup?osm_ids=${id}`](https://nominatim.openstreetmap.org/lookup?osm_ids=${id}`)
    : `[https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(id)}`;](https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(id)}`;)
  const url = `${prefix}&format=geojson&polygon_geojson=${polygon}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.features?.[0] || null;
}

async function main() {
  const raw = JSON.parse(fs.readFileSync('public/layers_default.json'));
  const output = [];

  for (const layer of raw) {
    const features = [];
    for (const e of layer.entities) {
      // fetch polygon (polygon_geojson=1) and point (polygon_geojson=0) if you want both
      const feat = await fetchGeo(e.id, 1);
      if (feat && feat.geometry) {
        // embed name/notes and source
        feat.properties = feat.properties || {};
        feat.properties.notes = '';
        feat.source = feat.properties.osm_id ? 'osm' : 'search';
        features.push(feat);
      } else {
        console.warn(`No geometry for ${e.id}`);
      }
    }
    output.push({
      id: layer.id,
      name: layer.name,
      polygonsVisible: layer.polygonsVisible,
      markersVisible: layer.markersVisible,
      fillColor: layer.fillColor,
      borderColor: layer.borderColor,
      featureCollection: { type: 'FeatureCollection', features }
    });
  }

  fs.writeFileSync(
    'public/layers_default.json',
    JSON.stringify(output, null, 2)
  );
  console.log('Default GeoJSON generated.');
}

main().catch(console.error);