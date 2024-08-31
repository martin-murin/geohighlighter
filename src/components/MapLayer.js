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
        Object.keys(layersRef.current).forEach(entity => {
            if (!entities.includes(entity)) {
                map.removeLayer(layersRef.current[entity].layer);
                osmIdSetRef.current.delete(layersRef.current[entity].osm_id);
                delete layersRef.current[entity];
            }
        });

        if (visible) {
            entities.forEach(async (entity) => {
                if (!layersRef.current[entity]) {
                    try {
                        const result = await fetchDataForEntity(type, entity, controllerRef.current);
                        const { data, name } = result;
                        console.log(name)
                        
                        if (data && data.features.length > 0) {
                            const osmId = data.features[0].properties.osm_id;
                            
                            // Prevent adding the same osm_id twice
                            if (osmIdSetRef.current.has(osmId)) {
                                setWarning(`Entity with OSM ID ${osmId} is already added.`);
                                onEntityError(entity); // Trigger error callback
                                return;
                            }
                            console.log(fillColor)
                            console.log(borderColor)

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
                            layersRef.current[entity] = {
                                layer: geoJsonLayer,
                                osm_id: osmId,
                                name: name,
                            };

                            osmIdSetRef.current.add(osmId);
                            geoJsonLayer.addTo(map);
                            
                            console.log("Calling from MapLayer with name = ", name)
                            onUpdateEntityName(entity, name);

                        } else {
                            setWarning(`Entity "${entity}" not found.`);
                            onEntityError(entity); // Trigger error callback
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error(`Error fetching data for ${entity}:`, error);
                            setWarning(`Error fetching data for "${entity}".`);
                            onEntityError(entity); // Trigger error callback
                        }
                    }
                } else {
                    layersRef.current[entity].layer.addTo(map);
                }
            });
        } else {
            Object.values(layersRef.current).forEach(({ layer }) => {
                map.removeLayer(layer);
            });
        }

    }, 300); // Debounce delay in milliseconds

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

