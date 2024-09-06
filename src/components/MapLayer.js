import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

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
        return `https://nominatim.openstreetmap.org/lookup?osm_ids=${entity}&format=geojson&polygon_geojson=1`;
    } else {
        return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(entity)}&format=geojson&polygon_geojson=1`;
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

        return { data, name };
    } catch (error) {
        console.error(`Error fetching data for ${entity}:`, error);
        throw error;
    }
};

// MapLayer component
const MapLayer = ({ entities, type, visible, onEntityError, fillColor, borderColor, onUpdateEntityName }) => {
    const map = useMap();
    const layersRef = useRef({});
    const osmIdSetRef = useRef(new Set()); // Set to track osm_ids to prevent duplicates
    const controllerRef = useRef(new AbortController()); // AbortController reference
    const [warning, setWarning] = useState(null);

    // Cleanup layers on unmount
    useEffect(() => {
        return () => {
            Object.values(layersRef.current).forEach(layer => {
                map.removeLayer(layer.layer);
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
            layer.setStyle({
                color: borderColor.hex,
                opacity: borderColor.rgb.a,
            });
        });
    };

    const updateLayers = debounce(() => {
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
                osmIdSetRef.current.delete(layersRef.current[entityId].osm_id);
                delete layersRef.current[entityId];
            }
        });

        if (visible) {
            entities.forEach(async (entity) => {
                const { id, name } = entity; // Destructure to get id and name

                if (!layersRef.current[id]) {
                    try {
                        const result = await fetchDataForEntity(type, id, controllerRef.current);
                        const { data, name: fetchedName } = result;

                        if (data && data.features.length > 0) {
                            const osmId = data.features[0].properties.osm_id;

                            // Prevent adding the same osm_id twice
                            if (osmIdSetRef.current.has(osmId)) {
                                setWarning(`Entity with OSM ID ${osmId} is already added.`);
                                onEntityError(id); // Trigger error callback
                                return;
                            }

                            const geoJsonLayer = L.geoJson(data, {
                                style: {
                                    fillColor: fillColor.hex,
                                    fillOpacity: fillColor.rgb.a,
                                    color: borderColor.hex,
                                    opacity: borderColor.rgb.a,
                                    weight: 2,
                                }
                            });

                            // Store the layer and osm_id reference
                            layersRef.current[id] = {
                                layer: geoJsonLayer,
                                osm_id: osmId,
                                name: fetchedName || name,  // Use fetched name or existing one
                            };

                            osmIdSetRef.current.add(osmId);
                            geoJsonLayer.addTo(map);
                            onUpdateEntityName(id, fetchedName || name);

                        } else {
                            setWarning(`Entity "${name}" not found.`);
                            onEntityError(id); // Trigger error callback
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error(`Error fetching data for ${name}:`, error);
                            setWarning(`Error fetching data for "${name}".`);
                            onEntityError(id); // Trigger error callback
                        }
                    }
                } else {
                    layersRef.current[id].layer.addTo(map);
                }
            });
        } else {
            Object.values(layersRef.current).forEach(({ layer }) => {
                map.removeLayer(layer);
            });
        }
    }, 3000); // Debounce delay in milliseconds



    useEffect(() => {
        updateLayers(); // Call the debounced function
    }, [entities, map, visible]);

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

