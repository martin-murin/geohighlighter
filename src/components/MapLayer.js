import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import simplify from '@turf/simplify';
import L from 'leaflet';
import './MapLayer.css'

// Debounce function to delay updates
function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

// Function to generate the API URL
const generateUrl = (type, entity) => {
    // Check if the entity matches the OSM ID format
    const osmIdPattern = /^[n|w|r|s|m|t|b|a|p|l]\d+$/i;
    if (osmIdPattern.test(entity)) {
        return `https://nominatim.openstreetmap.org/lookup?osm_ids=${entity}&format=geojson&polygon_geojson=${type}`;
    } else {
        return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(entity)}&format=geojson&polygon_geojson=${type}`;
    }
};

// Function to fetch data for an entity
const fetchDataForEntity = async (type, entity) => {
    const url = generateUrl(type, entity);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Extract the name from the response
        const name = data?.features?.[0]?.properties?.name || data?.features?.[0]?.properties?.display_name || 'Unknown';

        if ((type === 0 && data?.features?.[0]?.geometry?.type === 'Point') || (type === 1 && data?.features?.[0]?.geometry?.type != 'Point')){
            return { data, name };
        } else {
            return { data: null, name };
        }
    } catch (error) {
        console.error(`Error fetching data for ${entity}:`, error);
        throw error;
    }
};

// MapLayer component
const MapLayer = ({ layerId, features, polygonsVisible, markersVisible, onEntityError, fillColor, borderColor, onUpdateEntityName, onUpdateGeometry }) => {
    const map = useMap();
    const entities = features; // alias for backward compatibility
    const layersRef = useRef({});
    const osmIdSetRef = useRef(new Set()); // Set to track osm_ids to prevent duplicates
    const controllerRef = useRef(new AbortController()); // AbortController reference
    const [warning, setWarning] = useState(null);

    // Cleanup layers on unmount
    useEffect(() => {
        return () => {
            Object.values(layersRef.current).forEach(layer => {
                if (layer.layer) {
                    map.removeLayer(layer.layer);  // Remove polygons
                }
                if (layer.marker) {
                    map.removeLayer(layer.marker); // Remove markers
                }
            });
            layersRef.current = {};
            osmIdSetRef.current.clear();
        };
    }, [map]);

    const updateLayerFillColors = () => {
        Object.keys(layersRef.current).forEach(entity => {
            const layer = layersRef.current[entity].layer;
            layer.setStyle({
                fillColor: fillColor.hex,
                fillOpacity: fillColor.rgb.a,
            });
        });
    };

    const updateLayerBorderColors = () => {
        Object.keys(layersRef.current).forEach(entity => {
            const layer = layersRef.current[entity].layer;
            const marker = layersRef.current[entity].marker;

            // Update the polygon border color
            layer.setStyle({
                color: borderColor.hex,
                opacity: borderColor.rgb.a,
            });

            // Update the marker color by changing the inline style of the icon
            if (marker) {
                const iconElement = marker.getElement(); // Get the marker's DOM element
                if (iconElement) {
                    const icon = iconElement.querySelector('i'); // Select the <i> element
                    if (icon) {
                        icon.style.color = borderColor.hex; // Update the color
                    }
                }
            }
        });
    };

    const updateLayers = debounce(() => {
        // Short-circuit rendering for cached geometries
        entities.forEach(entity => {
            const { id, geometry, properties } = entity;
            if (geometry && !layersRef.current[id]) {
                const featColl = { type: 'FeatureCollection', features: [entity] };
                const geoJsonLayer = L.geoJson(featColl, {
                    style: {
                        fillColor: fillColor.hex,
                        fillOpacity: fillColor.rgb.a,
                        color: borderColor.hex,
                        opacity: borderColor.rgb.a,
                        weight: 2,
                    }
                });
                let marker = null;
                if (geometry.type === 'Point') {
                    const [lon, lat] = geometry.coordinates;
                    marker = L.marker([lat, lon], {
                        icon: L.divIcon({
                            className: 'custom-icon',
                            html: `<i class="bi bi-geo-alt-fill" style="color: ${borderColor.hex};"></i>`,
                            iconAnchor: [12, 24],
                        })
                    });
                }
                layersRef.current[id] = { marker, layer: geoJsonLayer, osm_id: null, name: properties.name };
                if (polygonsVisible) geoJsonLayer.addTo(map);
                if (markersVisible && marker) marker.addTo(map);
            }
        });

        console.log('Debounced update running with entities:', entities);

        if (!map) {
            console.log('Map instance is not available.');
            return;
        }

        // Cancel previous requests
        controllerRef.current.abort();
        controllerRef.current = new AbortController();

        // Remove layers for entities that are no longer in the list
        Object.keys(layersRef.current).forEach(entityId => {
            if (!entities.some(e => e.id === entityId)) {  // Update check for object structure
                map.removeLayer(layersRef.current[entityId].layer);
                map.removeLayer(layersRef.current[entityId].marker);
                osmIdSetRef.current.delete(layersRef.current[entityId].osm_id);
                delete layersRef.current[entityId];
            }
        });

        if (polygonsVisible || markersVisible) {
            entities.forEach(async (entity) => {
                // skip network fetch if we already have geometry
                if (entity.geometry) return;
                const { id, name } = entity; // Destructure to get id and name

                if (!layersRef.current[id]) {
                    try {
                        const result_polygon = await fetchDataForEntity(1, id, controllerRef.current);
                        const result_point = await fetchDataForEntity(0, id, controllerRef.current);
                        if (!layersRef.current[id]) {
                            let { data: data_polygon, name: fetchedName } = result_polygon;
                            // simplify fetched polygon
                            data_polygon = {
                                ...data_polygon,
                                features: data_polygon.features.map(f => simplify(f, { tolerance: 0.001, highQuality: false }))
                            };
                            const { data: data_point } = result_point;
                            const pointCoordinates = data_point?.features?.[0]?.geometry?.type === 'Point'
                                ? data_point.features[0].geometry.coordinates
                                : null;

                            if (data_point || data_polygon) {
                                const osmId = data_point.features[0].properties.osm_id;

                                // Prevent adding the same osm_id twice
                                if (osmIdSetRef.current.has(osmId)) {
                                    setWarning(`Entity with OSM ID ${osmId} is already added.`);
                                    onEntityError(id); // Trigger error callback
                                    return;
                                }

                                const geoJsonLayer = L.geoJson(data_polygon, {
                                    style: {
                                        fillColor: fillColor.hex,
                                        fillOpacity: fillColor.rgb.a,
                                        color: borderColor.hex,
                                        opacity: borderColor.rgb.a,
                                        weight: 2,
                                    }
                                });

                                const [lon, lat] = pointCoordinates;
                                const marker = L.marker([lat, lon], {
                                    icon: L.divIcon({
                                        className: 'custom-icon',
                                        html: `<i class="bi bi-geo-alt-fill" style="color: ${borderColor.hex};"></i>`,
                                        iconAnchor: [12, 24],
                                    })
                                });

                                // Store the layer and osm_id reference
                                layersRef.current[id] = {
                                    marker,
                                    layer: geoJsonLayer,
                                    osm_id: osmId,
                                    name: fetchedName || name,  // Use fetched name or existing one
                                };

                                osmIdSetRef.current.add(osmId);
                                if (polygonsVisible) {
                                    geoJsonLayer.addTo(map);
                                }
                                if (markersVisible){
                                    marker.addTo(map);
                                }
                                onUpdateEntityName(id, fetchedName || name);
                                // cache simplified geometry upstream
                                onUpdateGeometry(layerId, id, data_polygon.features[0].geometry);

                            } else {
                                setWarning(`Entity "${name}" not found.`);
                                onEntityError(id); // Trigger error callback
                            }
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error(`Error fetching data for ${name}:`, error);
                            setWarning(`Error fetching data for "${name}".`);
                            onEntityError(id); // Trigger error callback
                        }
                    }
                } else {
                    if (polygonsVisible){
                        layersRef.current[id].layer.addTo(map);
                    } else {
                        map.removeLayer(layersRef.current[id].layer);
                    }
                    if (markersVisible){
                        layersRef.current[id].marker.addTo(map);
                    } else {
                        map.removeLayer(layersRef.current[id].marker);
                    }
                }
            });
        } else {
            Object.values(layersRef.current).forEach(({ layer }) => {
                map.removeLayer(layer);
            });
            Object.values(layersRef.current).forEach(({ marker }) => {
                map.removeLayer(marker);
            });
        }
    }, 500); // Debounce delay in milliseconds



    useEffect(() => {
        updateLayers(); // Call the debounced function
    }, [entities, map, polygonsVisible, markersVisible]);

    useEffect(() => {
        updateLayerFillColors(); // Update layer colors when color changes
    }, [fillColor]);

    useEffect(() => {
        updateLayerBorderColors(); // Update layer colors when color changes
    }, [borderColor]);

    useEffect(() => {
        if (warning) {
            const timer = setTimeout(() => setWarning(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [warning]);

    return (
        <>
            {warning && (
                <div className="alert alert-warning" style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
                    {warning}
                </div>
            )}
        </>
    );
};

export default MapLayer;
