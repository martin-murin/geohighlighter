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
    return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(entity)}&format=geojson&polygon_geojson=1`;
};

// Function to fetch data for an entity
const fetchDataForEntity = async (type, entity, controller) => {
    const url = generateUrl(type, entity);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
        throw new Error(`Failed to fetch data for ${entity}`);
    }
    return await response.json();
};

// MapLayer component
const MapLayer = ({ entities, type, visible, onEntityError, color }) => {
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

    const updateLayerColors = () => {
        Object.keys(layersRef.current).forEach(entity => {
            const layer = layersRef.current[entity].layer;
            layer.setStyle({
                fillColor: color.hex,
                color: 'white', // Boundary color
                fillOpacity: color.rgb.a,
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
                        const data = await fetchDataForEntity(type, entity, controllerRef.current);
                        
                        if (data && data.features.length > 0) {
                            const osmId = data.features[0].properties.osm_id;
                            
                            // Prevent adding the same osm_id twice
                            if (osmIdSetRef.current.has(osmId)) {
                                setWarning(`Entity with OSM ID ${osmId} is already added.`);
                                onEntityError(entity); // Trigger error callback
                                return;
                            }
                            console.log(color)

                            const geoJsonLayer = L.geoJson(data, {
                                style: {
                                    fillColor: color.hex,
                                    weight: 2,
                                    opacity: 1,
                                    color: 'white',
                                    fillOpacity: color.rgb.a
                                }
                            });

                            // Store the layer and osm_id reference
                            layersRef.current[entity] = {
                                layer: geoJsonLayer,
                                osm_id: osmId,
                            };

                            osmIdSetRef.current.add(osmId);
                            geoJsonLayer.addTo(map);
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
        updateLayerColors(); // Update layer colors when color changes
    }, [color]);

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

