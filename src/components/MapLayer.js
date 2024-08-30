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

const MapLayer = ({ countries, layersVisible }) => {
    const map = useMap();
    const layersRef = useRef({});
    const controllerRef = useRef(null); // AbortController reference

    const updateLayers = debounce(() => {
        console.log('Debounced update running with countries:', countries);

        if (!map) {
            console.log('Map instance is not available.');
            return;
        }

        // Remove layers for countries that are no longer in the list
        Object.keys(layersRef.current).forEach(countryName => {
            if (!countries.includes(countryName)) {
                map.removeLayer(layersRef.current[countryName]);
                delete layersRef.current[countryName];
            }
        });

        // Add layers for new countries
        countries.forEach(async (countryName) => {
            if (!layersRef.current[countryName]) {
                console.log(`Adding layer for country: ${countryName}`);
                const url = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(countryName)}&format=geojson&polygon_geojson=1`;

                if (controllerRef.current) {
                    controllerRef.current.abort(); // Cancel any ongoing request
                }
                controllerRef.current = new AbortController();
                const signal = controllerRef.current.signal;

                try {
                    const response = await fetch(url, { signal });
                    console.log(`Fetching data from: ${url}`);
                    const data = await response.json();

                    if (data.features && data.features.length > 0) {
                        const geoJsonLayer = L.geoJson(data, {
                            style: {
                                fillColor: '#5500FF',
                                weight: 2,
                                opacity: 1,
                                color: 'white',
                                fillOpacity: 0.2
                            }
                        }).addTo(map);

                        layersRef.current[countryName] = geoJsonLayer;
                        if (layersVisible) {
                            geoJsonLayer.addTo(map);
                            map.fitBounds(geoJsonLayer.getBounds());
                        }
                        console.log(`Layer added for country: ${countryName}`);
                    } else {
                        console.warn(`Country "${countryName}" not found or no features available.`);
                        alert(`Country "${countryName}" not found or no features available.`);
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log(`Fetch for ${countryName} was aborted.`);
                    } else {
                        console.error("Error fetching country data:", error);
                        alert(`Error fetching data for "${countryName}".`);
                    }
                }
            }
            else if (layersVisible) {
                // Add existing layers to map if visibility is toggled on
                layersRef.current[countryName].addTo(map);
            }
        });
        if (!layersVisible) {
            Object.values(layersRef.current).forEach(layer => {
                map.removeLayer(layer);
            });
        }
    }, 300); // Debounce delay in milliseconds

    useEffect(() => {
        updateLayers(); // Call the debounced function
    }, [countries, map, layersVisible]);

    return null; // This component does not render anything visible
};

export default MapLayer;

