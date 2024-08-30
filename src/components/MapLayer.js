import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Debounce utility function to delay execution
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

const fetchDataForEntity = async (type, entity) => {
    const url = generateUrl(type, entity);
    const response = await fetch(url);
    return await response.json();
};

const generateUrl = (type, entity) => {
            return `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(entity)}&format=geojson&polygon_geojson=1`;
};

const MapLayer = ({ entities, type, visible }) => {
    const map = useMap();
    const layersRef = useRef({});
    const controllerRef = useRef(null); // AbortController reference

    const updateLayers = debounce(() => {
        console.log('Debounced update running with countries:', entities);

        if (!map) {
            console.log('Map instance is not available.');
            return;
        }

        // Remove layers for countries that are no longer in the list
        Object.keys(layersRef.current).forEach(entity => {
            if (!entities.includes(entity)) {
                map.removeLayer(layersRef.current[entity]);
                delete layersRef.current[entity];
            }
        });

         if (visible) {
            entities.forEach(async (entity) => {
                if (!layersRef.current[entity]) {
                    try {
                        const data = await fetchDataForEntity(type, entity);
                        const geoJsonLayer = L.geoJson(data, {
                            style: {
                                fillColor: '#5500FF',
                                weight: 2,
                                opacity: 1,
                                color: 'white',
                                fillOpacity: 0.2
                            }
                        });
                        layersRef.current[entity] = geoJsonLayer;
                        geoJsonLayer.addTo(map);
                    } catch (error) {
                        console.error(`Error fetching data for ${entity}:`, error);
                    }
                } else {
                    layersRef.current[entity].addTo(map);
                }
            });
        } else {
            Object.values(layersRef.current).forEach(layer => {
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

