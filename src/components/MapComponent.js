import React from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MapLayer from './MapLayer';
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
            {layers.map(layer => {
                const allHaveGeom = (layer.featureCollection?.features || []).every(
                    f => f.geometry && f.geometry.type && f.geometry.coordinates
                );
                if (allHaveGeom) {
                    return (
                        <>
                        <GeoJSON
                            key={`${layer.id}-${layer.markerIcon}-${(layer.featureCollection?.features || []).length}-${layer.markersVisible}-${layer.polygonsVisible}`}
                            data={{
                                type: 'FeatureCollection',
                                features: layer.featureCollection.features.filter(
                                    f => f.geometry && f.geometry.type && f.geometry.coordinates
                                )
                            }}
                            style={() => {
                                const isHovered = layer.id === hoveredLayerId;
                                const weight = isHovered ? layer.borderWidth + 1 : layer.borderWidth;
                                const dashArray = layer.borderStyle === 'dashed'
                                    ? '6 4'
                                    : layer.borderStyle === 'dotted'
                                        ? '1 4'
                                        : '';
                                return {
                                    fillColor: isHovered ? lightenColor(layer.fillColor.hex, 0.3) : layer.fillColor.hex,
                                    fillOpacity: Math.min(1, layer.fillColor.rgb.a + (isHovered ? 0.3 : 0)),
                                    color: isHovered ? lightenColor(layer.borderColor.hex, 0.3) : layer.borderColor.hex,
                                    opacity: Math.min(1, layer.borderColor.rgb.a + (isHovered ? 0.3 : 0)),
                                    weight,
                                    dashArray,
                                };
                            }}
                            filter={feature =>
                                feature.geometry.type === 'Point'
                                    ? layer.markersVisible
                                    : layer.polygonsVisible
                            }
                            pointToLayer={(feature, latlng) => {
                                const isHovered = layer.id === hoveredLayerId;
                                const iconColor = isHovered ? lightenColor(layer.borderColor.hex, 0.3) : layer.borderColor.hex;
                                if (feature.geometry.type === 'Point' && layer.markersVisible) {
                                    return L.marker(latlng, {
                                        icon: L.divIcon({
                                            className: 'custom-icon',
                                            html: `<i class=\"${layer.markerIcon}\" style=\"color: ${iconColor};\"></i>`,
                                            iconAnchor: [12, 24],
                                        }),
                                    });
                                }
                                return null;
                            }}
                            onEachFeature={(feature, layerFG) => layerFG.bindPopup(feature.properties.name)}
                        />
                        {/* markers for polygons as centroids */}
                        {layer.markersVisible && layer.featureCollection.features.map(f => {
                            if (!f.geometry) return null;
                            // determine marker position: use point coords or polygon centroid
                            const position = f.geometry.type === 'Point'
                                ? [f.geometry.coordinates[1], f.geometry.coordinates[0]]
                                : L.geoJSON(f).getBounds().getCenter();
                            return (
                                <Marker
                                    key={`marker-${layer.id}-${f.id}-${layer.markerIcon}`}
                                    position={position}
                                    icon={L.divIcon({
                                        className: 'custom-icon',
                                        html: `<i class=\"${layer.markerIcon}\" style=\"color: ${layer.id === hoveredLayerId ? lightenColor(layer.borderColor.hex, 0.3) : layer.borderColor.hex};\"></i>`,
                                        iconAnchor: [12, 24],
                                    })}
                                >
                                    <Popup>{f.properties.name}</Popup>
                                </Marker>
                            );
                        })}
                        </>
                    );
                }
                return (
                    <MapLayer
                        key={layer.id}
                        layerId={layer.id}
                        features={layer.featureCollection.features}
                        polygonsVisible={layer.polygonsVisible}
                        markersVisible={layer.markersVisible}
                        onEntityError={handleEntityError}
                        fillColor={layer.fillColor}
                        borderColor={layer.borderColor}
                        borderWidth={layer.borderWidth}
                        borderStyle={layer.borderStyle}
                        onUpdateEntityName={handleUpdateEntityName}
                        onUpdateGeometry={handleGeometryUpdate}
                        hoveredLayerId={hoveredLayerId}
                        onHoverLayer={onHoverLayer}
                    />
                );
            })}
        </MapContainer>
    );
};

export default MapComponent;
