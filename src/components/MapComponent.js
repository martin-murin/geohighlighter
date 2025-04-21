import React from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MapLayer from './MapLayer';
import 'leaflet/dist/leaflet.css';

const MapComponent = ({ layers, handleEntityError, handleUpdateEntityName, handleGeometryUpdate }) => {
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
                            key={`${layer.id}-${(layer.featureCollection?.features || []).length}-${layer.markersVisible}-${layer.polygonsVisible}`}
                            data={{
                                type: 'FeatureCollection',
                                features: layer.featureCollection.features.filter(
                                    f => f.geometry && f.geometry.type && f.geometry.coordinates
                                )
                            }}
                            style={() => ({
                                fillColor: layer.fillColor.hex,
                                fillOpacity: layer.fillColor.rgb.a,
                                color: layer.borderColor.hex,
                                opacity: layer.borderColor.rgb.a,
                                weight: 2,
                            })}
                            filter={feature =>
                                feature.geometry.type === 'Point'
                                    ? layer.markersVisible
                                    : layer.polygonsVisible
                            }
                            pointToLayer={(feature, latlng) =>
                                feature.geometry.type === 'Point' && layer.markersVisible
                                    ? L.marker(latlng, {
                                          icon: L.divIcon({
                                              className: 'custom-icon',
                                              html: `<i class="bi bi-geo-alt-fill" style="color: ${layer.borderColor.hex};"></i>`,
                                              iconAnchor: [12, 24],
                                          }),
                                      })
                                    : null
                            }
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
                                    key={`marker-${layer.id}-${f.id}`}
                                    position={position}
                                    icon={L.divIcon({
                                        className: 'custom-icon',
                                        html: `<i class="bi bi-geo-alt-fill" style="color: ${layer.borderColor.hex};"></i>`,
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
                        onUpdateEntityName={handleUpdateEntityName}
                        onUpdateGeometry={handleGeometryUpdate}
                    />
                );
            })}
        </MapContainer>
    );
};

export default MapComponent;
