import React, { useState, useEffect } from 'react';
import ColorPicker from './ColorPicker';
import './LayerControls.css'

const LayerControls = ({ layer, onAddEntity, onRemoveEntity, onTogglePolygonVisibility, onToggleMarkerVisibility, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange, onFileImport }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [currentFillColor, setCurrentFillColor] = useState(layer.fillColor);
    const [currentBorderColor, setCurrentBorderColor] = useState(layer.borderColor);

    // safely get feature list
    const featuresList = layer.featureCollection?.features ?? [];

    useEffect(() => {
        if (searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }
        const handler = setTimeout(() => {
            fetchSuggestions(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentFillColor(layer.fillColor);
    }, [layer.fillColor]);

    useEffect(() => {
        setCurrentBorderColor(layer.borderColor);
    }, [layer.borderColor]);

    const fetchSuggestions = async (query) => {
        setIsSearching(true);
        setSearchError(null);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            setSuggestions(data);
        } catch (err) {
            console.error(err);
            setSearchError('Error fetching suggestions');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectSuggestion = async (s) => {
        setSuggestions([]);
        setSearchQuery('');
        setIsSearching(true);
        setSearchError(null);
        try {
            const prefix = s.osm_type === 'node' ? 'N' : s.osm_type === 'way' ? 'W' : 'R';
            const lookupUrl = `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}${s.osm_id}&format=json&polygon_geojson=1`;
            const res = await fetch(lookupUrl);
            const data = await res.json();
            if (!data.length) throw new Error('No geometry data');
            const geojson = data[0].geojson;
            onAddEntity(layer.id, { id: `${s.osm_type}-${s.osm_id}`, name: s.display_name, geometry: geojson, osm_type: s.osm_type, osm_id: s.osm_id });
        } catch (err) {
            console.error(err);
            setSearchError('Error fetching geometry');
        } finally {
            setIsSearching(false);
        }
    };

    const handleFillColorChange = (fillColor) => {
        setCurrentFillColor(fillColor);
        onFillColorChange(layer.id, fillColor);
    };

    const handleBorderColorChange = (borderColor) => {
        setCurrentBorderColor(borderColor);
        onBorderColorChange(layer.id, borderColor);
    };

    return (
        <div className="layer-controls">
            <div className="justify-content-between align-items-center mb-2">
                <div className="row mt-2 mb-2 mx-2">
                    <div className="row mt-4">
                        <h5 className="col-12">{layer.name}</h5>
                    </div>
                    <div className="col-12 col-lg-2 mb-2 mb-lg-0">
                        <div className="color-picker-container" style={{ position: 'relative' }}>
                            <ColorPicker color={currentFillColor} onChange={handleFillColorChange} pickerType="fill" />
                        </div>
                    </div>
                    <div className="col-12 col-lg-2 mb-2 mb-lg-0">
                        <div className="color-picker-container" style={{ position: 'relative' }}>
                            <ColorPicker color={currentBorderColor} onChange={handleBorderColorChange} pickerType="border" />
                        </div>
                    </div>
                    <div className="col-12 col-lg-3 mb-2 mb-lg-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onTogglePolygonVisibility(layer.id)}>
                            {layer.polygonsVisible 
                              ? <i className="bi bi-map-fill"></i>
                              : <i className="bi bi-map"></i>
                            }
                        </button>
                    </div>
                    <div className="col-12 col-lg-3 mb-2 mb-lg-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onToggleMarkerVisibility(layer.id)}>
                            {layer.markersVisible
                              ? <i className="bi bi-geo-alt-fill"></i>
                              : <i className="bi bi-geo-alt"></i>
                            }
                        </button>
                    </div>
                    {/*
                    <div className="col-12 col-lg-3 mb-2 mb-lg-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onForceRender(layer.id)}>
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                    */}
                    <div className="col-12 col-lg-2 mb-2 mb-lg-0">
                        <button className="btn btn-danger btn-sm w-100" title="Delete Layer" onClick={() => onRemoveLayer(layer.id)}>
                            &times;
                        </button>
                    </div>
                </div>
                <div className="row mx-2">
                    <div className="col-12 col-lg-10 mb-2" style={{ position: 'relative' }}>
                        <input
                            className="form-control"
                            type="text"
                            placeholder="Search OSM..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchError && <div className="text-danger">{searchError}</div>}
                        {suggestions.length > 0 && (
                            <ul className="list-group position-absolute" style={{ zIndex: 1000, width: '100%' }}>
                                {suggestions.map((s, idx) => (
                                    <li key={idx} className="list-group-item list-group-item-action" onClick={() => handleSelectSuggestion(s)}>
                                        <strong>{s.display_name}</strong><br/>
                                        <small>{s.type} (osm {s.osm_type} {s.osm_id})</small>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="col-2 mb-2">
                        <label
                            className="btn btn-secondary btn-sm"
                            htmlFor={`import-file-${layer.id}`}
                            title="Import GPX/KML"
                        >
                            <i className="bi bi-upload"></i>
                        </label>
                        <input
                            id={`import-file-${layer.id}`}
                            type="file"
                            accept=".gpx,.kml"
                            className="form-control d-none"
                            onChange={(e) => onFileImport(layer.id, e)}
                        />
                    </div>
                </div>
            </div>

            <ul className="list-group">
              {featuresList.map((feature, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  {feature.properties.name || "Loading..."}
                  <button className="btn btn-danger btn-sm" onClick={() => onRemoveEntity(layer.id, feature.id)}>
                    &times;
                  </button>
                </li>
              ))}
            </ul>
        </div>
    );
};

export default LayerControls;
