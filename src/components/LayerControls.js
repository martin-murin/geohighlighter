import React, { useState, useEffect } from 'react';
import ColorPicker from './ColorPicker';
import './LayerControls.css'
import { Dropdown } from 'react-bootstrap';

const LayerControls = ({ layer, onAddEntity, onRemoveEntity, onTogglePolygonVisibility, onToggleMarkerVisibility, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange, onFileImport, onUpdateEntityName, onRenameLayer, hoveredLayerId, onHoverLayer }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [currentFillColor, setCurrentFillColor] = useState(layer.fillColor);
    const [currentBorderColor, setCurrentBorderColor] = useState(layer.borderColor);
    const [editingEntityId, setEditingEntityId] = useState(null);
    const [editedName, setEditedName] = useState('');

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
        <div className={`layer-controls ${hoveredLayerId === layer.id ? 'layer-hovered' : ''}`} onMouseEnter={() => onHoverLayer(layer.id)} onMouseLeave={() => onHoverLayer(null)}>
            <div className="d-flex justify-content-between align-items-center px-2 py-1">
                <h5 className="mb-0">{layer.name}</h5>
                <Dropdown align="end">
                    <Dropdown.Toggle variant="light" size="sm">
                        <i className="bi bi-list"></i>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={() => {
                            const newName = prompt('Rename Layer', layer.name);
                            if (newName) onRenameLayer(layer.id, newName);
                        }}>
                            <i className="bi bi-pencil me-2"></i> Rename Layer
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={() => onTogglePolygonVisibility(layer.id)}>
                            {layer.polygonsVisible ? <><i className="bi bi-map-fill me-2" /> Hide Polygons</> : <><i className="bi bi-map me-2" /> Show Polygons</>}
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => onToggleMarkerVisibility(layer.id)}>
                            {layer.markersVisible ? <><i className="bi bi-geo-alt-fill me-2" /> Hide Markers</> : <><i className="bi bi-geo-alt me-2" /> Show Markers</>}
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item onClick={() => onRemoveLayer(layer.id)} className="text-danger">
                            <i className="bi bi-trash me-2"></i> Delete Layer
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
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

            <ul className="list-group">
              {featuresList.map((feature, index) => (
                <li key={index} className="list-group-item d-flex align-items-center">
                  {editingEntityId === feature.id ? (
                    <div className="flex-grow-1 d-flex align-items-center">
                      <input
                        className="form-control form-control-sm"
                        type="text"
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                      />
                      <button
                        className="btn btn-success btn-sm ms-2"
                        onClick={() => { onUpdateEntityName(layer.id, feature.id, editedName); setEditingEntityId(null); }}
                      >
                        <i className="bi bi-check"></i>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm ms-1"
                        onClick={() => setEditingEntityId(null)}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  ) : (
                    <span className="flex-grow-1">{feature.properties.name || "Loading..."}</span>
                  )}
                  {editingEntityId !== feature.id && (
                    <button
                      className="btn btn-outline-secondary btn-sm ms-2"
                      onClick={() => { setEditingEntityId(feature.id); setEditedName(feature.properties.name); }}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  )}
                  <button
                    className="btn btn-outline-secondary btn-sm ms-2"
                    onClick={() => onRemoveEntity(layer.id, feature.id)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
        </div>
    );
};
export default LayerControls;
