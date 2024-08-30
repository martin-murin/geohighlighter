import React, { useEffect, useRef } from 'react';
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
const MapLayer = ({ entities, type, visible }) => {
    const map = useMap();
    const layersRef = useRef({});
    const osmIdSetRef = useRef(new Set()); // Set to track osm_ids to prevent duplicates
    const controllerRef = useRef(new AbortController()); // AbortController reference

    // Cleanup layers on unmount
    useEffect(() => {
        return () => {
            Object.values(layersRef.current).forEach(layer => {
                map.removeLayer(layer);
            });
            layersRef.current = {};
            osmIdSetRef.current.clear();
        };
    }, [map]);

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
                                console.log(`Entity with osm_id ${osmId} is already added.`);
                                return;
                            }

                            const geoJsonLayer = L.geoJson(data, {
                                style: {
                                    fillColor: '#5500FF',
                                    weight: 2,
                                    opacity: 1,
                                    color: 'white',
                                    fillOpacity: 0.2
                                }
                            });

                            // Store the layer and osm_id reference
                            layersRef.current[entity] = {
                                layer: geoJsonLayer,
                                osm_id: osmId,
                            };

                            osmIdSetRef.current.add(osmId);
                            geoJsonLayer.addTo(map);
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error(`Error fetching data for ${entity}:`, error);
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

    return null; // This component does not render anything visible
};

export default MapLayer;

