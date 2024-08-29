import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const MapLayer = ({ countries }) => {
    const map = useMap();
    const layersRef = useRef({});

    useEffect(() => {
        console.log('useEffect running with countries:', countries);

        if (!map) {
            console.log('Map instance is not available.');
            return;
        }

        // Remove layers for countries no longer in the list
        Object.keys(layersRef.current).forEach(countryName => {
            if (!countries.includes(countryName)) {
                console.log(`Removing layer for country: ${countryName}`);
                map.removeLayer(layersRef.current[countryName]);
                delete layersRef.current[countryName];
            }
        });

        // Add layers for new countries
        countries.forEach(async (countryName) => {
            if (!layersRef.current[countryName]) {
                console.log(`Adding layer for country: ${countryName}`);
                const url = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(countryName)}&format=geojson&polygon_geojson=1`;

                try {
                    const response = await fetch(url);
                    console.log(`Fetching data from: ${url}`);
                    const data = await response.json();

                    if (data.features && data.features.length > 0) {
                        const geoJsonLayer = L.geoJson(data, {
                            style: {
                                fillColor: '#FF6347',
                                weight: 2,
                                opacity: 1,
                                color: 'white',
                                fillOpacity: 0.5
                            }
                        }).addTo(map);

                        layersRef.current[countryName] = geoJsonLayer;
                        map.fitBounds(geoJsonLayer.getBounds());
                        console.log(`Layer added for country: ${countryName}`);
                    } else {
                        console.warn(`Country "${countryName}" not found or no features available.`);
                        alert(`Country "${countryName}" not found or no features available.`);
                    }
                } catch (error) {
                    console.error("Error fetching country data:", error);
                    alert(`Error fetching data for "${countryName}".`);
                }
            }
        });
    }, [countries, map]);

    return null; // This component does not render anything visible
};

export default MapLayer;

