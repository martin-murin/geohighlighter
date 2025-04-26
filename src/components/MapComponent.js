import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Helper to lighten hex colors by percent
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.min(255, r + Math.floor((255 - r) * percent));
    g = Math.min(255, g + Math.floor((255 - g) * percent));
    b = Math.min(255, b + Math.floor((255 - b) * percent));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Component to render only features that are visible in the current viewport
function ViewportGeoJSON({ featureCollection, layer, hoveredLayerId }) {
  const map = useMap();
  const [visibleFeatures, setVisibleFeatures] = useState({
    type: 'FeatureCollection',
    features: []
  });

  // Update visible features when map moves or zoom changes
  useEffect(() => {
    // Function to filter features that are in view
    const updateVisibleFeatures = () => {
      if (!featureCollection || !featureCollection.features) return;
      
      // Get current viewport bounds
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // Simplification factor based on zoom level (more aggressive at lower zooms)
      const zoom = map.getZoom();
      const simplifyFactor = Math.max(0.001, 0.1 * Math.pow(0.5, zoom - 3));
      
      // Filter features that intersect with the viewport
      const filtered = featureCollection.features.filter(feature => {
        if (!feature.geometry) return false;
        
        // For polygons or line features, check if their bbox intersects viewport
        try {
          const geoLayer = L.geoJSON(feature);
          const featureBounds = geoLayer.getBounds();
          return bounds.intersects(featureBounds);
        } catch (e) {
          return false; // Skip features that can't be processed
        }
      });
      
      // Update state with filtered features
      setVisibleFeatures({
        type: 'FeatureCollection',
        features: filtered
      });
    };

    // Initial update
    updateVisibleFeatures();
    
    // Add map movement listeners
    map.on('moveend', updateVisibleFeatures);
    map.on('zoomend', updateVisibleFeatures);
    
    // Cleanup
    return () => {
      map.off('moveend', updateVisibleFeatures);
      map.off('zoomend', updateVisibleFeatures);
    };
  }, [map, featureCollection]);

  // Create style for the GeoJSON layer
  const style = () => {
    const isHovered = layer.id === hoveredLayerId;
    return {
      fillColor: isHovered ? lightenColor(layer.fillColor.hex, 0.3) : layer.fillColor.hex,
      fillOpacity: Math.min(1, layer.fillColor.rgb.a + (isHovered ? 0.3 : 0)),
      color: isHovered ? lightenColor(layer.borderColor.hex, 0.3) : layer.borderColor.hex,
      opacity: Math.min(1, layer.borderColor.rgb.a + (isHovered ? 0.3 : 0)),
      weight: isHovered ? layer.borderWidth + 1 : layer.borderWidth,
      dashArray: layer.borderStyle === 'dashed' ? '6 4' : 
                layer.borderStyle === 'dotted' ? '1 4' : ''
    };
  };

  // Don't render if no visible features
  if (!visibleFeatures.features.length) return null;

  return (
    <GeoJSON 
      key={`geojson-${layer.id}`}
      data={visibleFeatures}
      style={style}
      onEachFeature={(feature, layerInstance) => {
        layerInstance.bindPopup(feature.properties.name || '');
      }}
    />
  );
}

const MapComponent = ({ layers, handleEntityError, handleUpdateEntityName, handleGeometryUpdate, hoveredLayerId, onHoverLayer }) => {
  return (
    <MapContainer
      center={[48, 17]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      whenCreated={map => { setTimeout(() => map.invalidateSize(), 0); }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {layers.map(layer => (
        <React.Fragment key={layer.id}>
          {layer.polygonsVisible && (
            <ViewportGeoJSON
              featureCollection={layer.featureCollection}
              layer={layer}
              hoveredLayerId={hoveredLayerId}
            />
          )}
          {layer.markersVisible && layer.featureCollection.features.map(f => {
            if (!f.geometry) return null;
            const pos = f.geometry.type === 'Point'
              ? [f.geometry.coordinates[1], f.geometry.coordinates[0]]
              : L.geoJSON(f).getBounds().getCenter();
            const iconColor = layer.id === hoveredLayerId ? lightenColor(layer.borderColor.hex, 0.3) : layer.borderColor.hex;
            return (
              <Marker
                key={`marker-${layer.id}-${f.id}-${layer.markerIcon}`}
                position={pos}
                icon={L.divIcon({ className: 'custom-icon', html: `<i class="${layer.markerIcon}" style="color: ${iconColor};"></i>`, iconAnchor: [12, 24] })}
              >
                <Popup>{f.properties.name}</Popup>
              </Marker>
            );
          })}
        </React.Fragment>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
