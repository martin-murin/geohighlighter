import React, { useState, useEffect, useReducer } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import './LayerControls.css';
import { Dropdown, Form } from 'react-bootstrap';
import ColorPicker from './ColorPicker';
import IconPicker from './IconPicker';
import simplify from '@turf/simplify';

const LayerControls = ({ layer, onAddEntity, onRemoveEntity, onTogglePolygonVisibility, onToggleMarkerVisibility, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange, onMarkerIconChange, onFileImport, onUpdateEntityName, onRenameLayer, onUpdateLayerSettings, hoveredLayerId, onHoverLayer, dragHandleProps, onSortEntities, onBorderWidthChange, onBorderStyleChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [currentFillColor, setCurrentFillColor] = useState(layer.fillColor);
    const [currentBorderColor, setCurrentBorderColor] = useState(layer.borderColor);
    const [editingEntityId, setEditingEntityId] = useState(null);
    const [editedName, setEditedName] = useState('');
    const [precision, setPrecision] = useState(() => {
        const m = layer.simplification?.multiplier ?? '1.0';
        const num = parseFloat(m);
        return isNaN(num) ? '1.0' : num.toFixed(1);
    });

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

    useEffect(() => {
        const m = layer.simplification?.multiplier ?? '1.0';
        const num = parseFloat(m);
        setPrecision(isNaN(num) ? '1.0' : num.toFixed(1));
    }, [layer.simplification?.multiplier]);

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

    // Helper function to get bounding box of a geometry
    const getBoundingBox = (geometry) => {
        if (!geometry || !geometry.coordinates || !geometry.coordinates.length) return null;
        
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
        
        const processCoordinates = (coords) => {
            if (!Array.isArray(coords)) return;
            
            // If this is a coordinate pair [lon, lat]
            if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                const [lon, lat] = coords;
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
            } else {
                // Otherwise, it's a nested array, process each item
                coords.forEach(c => processCoordinates(c));
            }
        };
        
        processCoordinates(geometry.coordinates);
        
        if (minLat === Infinity || maxLat === -Infinity || minLon === Infinity || maxLon === -Infinity) {
            return null;
        }
        
        return { minLat, maxLat, minLon, maxLon };
    };

    // Helper function to round coordinates to reduce precision
    const roundCoordinates = (geometry, decimals = 5) => {
        if (!geometry || !geometry.coordinates) return geometry;
        
        const round = (coords) => {
            if (Array.isArray(coords[0])) {
                return coords.map(c => round(c));
            } else {
                return coords.map(c => Number(c.toFixed(decimals)));
            }
        };
        
        return {
            ...geometry,
            coordinates: round(geometry.coordinates)
        };
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
            let geojson = data[0].geojson;
            
            // Apply simplification to the geometry before adding to the layer
            if (geojson && geojson.type) {
                // Create a GeoJSON feature from the geometry
                const feature = {
                    type: 'Feature',
                    geometry: geojson,
                    properties: {}
                };
                
                // Get the simplification multiplier from precision state
                const multiplier = parseFloat(precision) || 1.0;
                
                // Base tolerance values
                const BASE_TOLERANCES = {
                    veryLarge: 0.02, // Countries
                    large: 0.01,     // Regions
                    medium: 0.005,   // Counties/districts
                    small: 0.002     // Cities/towns
                };
                
                // Determine appropriate simplification tolerance based on size
                let tolerance = BASE_TOLERANCES.medium * multiplier; // Default
                
                // If adaptive simplification is enabled (default: true)
                if (layer.simplification?.useAdaptive !== false) {
                    if (geojson && geojson.coordinates) {
                        const bbox = getBoundingBox(geojson);
                        if (bbox) {
                            const area = (bbox.maxLon - bbox.minLon) * (bbox.maxLat - bbox.minLat);
                            // Adjust base tolerance based on area size
                            if (area > 100) tolerance = BASE_TOLERANCES.veryLarge * multiplier;
                            else if (area > 10) tolerance = BASE_TOLERANCES.large * multiplier;
                            else if (area > 1) tolerance = BASE_TOLERANCES.medium * multiplier;
                            else tolerance = BASE_TOLERANCES.small * multiplier;
                            
                            console.log('New feature - Area:', area, 'Tolerance:', tolerance, 'Multiplier:', multiplier);
                        }
                    }
                }
                
                // Apply simplification
                const simplified = simplify(feature, { tolerance, highQuality: false });
                
                // Round coordinates if enabled (default: true)
                if (layer.simplification?.roundCoordinates !== false) {
                    const decimals = layer.simplification?.roundingDecimals || 5;
                    simplified.geometry = roundCoordinates(simplified.geometry, decimals);
                }
                
                // Use the simplified geometry
                geojson = simplified.geometry;
            }
            
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

    const handleRefetchEntities = (currentLayer = layer) => {
        // Only proceed if we have entities to re-fetch
        const entities = currentLayer.featureCollection?.features || [];
        if (entities.length === 0) return;

        // Filter entities to only those from OSM (that can be re-fetched)
        const osmEntities = entities.filter(entity => 
            entity.properties?.source === 'osm' && 
            entity.properties?.osm_type && 
            entity.properties?.osm_id
        );

        if (osmEntities.length === 0) {
            alert('No OSM entities to re-fetch in this layer');
            return;
        }

        if (!window.confirm(`Re-fetch ${osmEntities.length} entities with the updated precision?\n\nNote: This will respect Nominatim rate limits with a 1-second delay between requests.`)) {
            return;
        }

        // Set up a counter to keep track of progress
        let processed = 0;
        
        // Process entities with delay between requests to respect Nominatim rate limits
        function processNextEntity(index) {

            const entity = osmEntities[index];
            const osmType = entity.properties.osm_type;
            const osmId = entity.properties.osm_id;
            const name = entity.properties.name;
            const entityId = entity.id;

            // Remove the current entity 
            onRemoveEntity(currentLayer.id, entityId);

            // Re-fetch with the prefix format (N for node, W for way, R for relation)
            const prefix = osmType === 'node' ? 'N' : osmType === 'way' ? 'W' : 'R';
            const lookupUrl = `https://nominatim.openstreetmap.org/lookup?osm_ids=${prefix}${osmId}&format=json&polygon_geojson=1`;
            
            fetch(lookupUrl)
                .then(res => res.json())
                .then(data => {
                    if (!data.length) throw new Error(`No geometry data for ${name}`);
                    
                    let geojson = data[0].geojson;

                    // Apply simplification to re-fetched geometry
                    if (geojson && geojson.type) {
                        const feature = { type: 'Feature', geometry: geojson, properties: {} };
                        const multiplier = parseFloat(currentLayer.simplification?.multiplier) || 1.0;
                        const BASE_TOLERANCES = { veryLarge: 0.02, large: 0.01, medium: 0.005, small: 0.002 };
                        let tolerance = BASE_TOLERANCES.medium * multiplier;
                        if (currentLayer.simplification?.useAdaptive !== false) {
                            const bbox = getBoundingBox(geojson);
                            if (bbox) {
                                const area = (bbox.maxLon - bbox.minLon) * (bbox.maxLat - bbox.minLat);
                                if (area > 100) tolerance = BASE_TOLERANCES.veryLarge * multiplier;
                                else if (area > 10) tolerance = BASE_TOLERANCES.large * multiplier;
                                else if (area > 1) tolerance = BASE_TOLERANCES.medium * multiplier;
                                else tolerance = BASE_TOLERANCES.small * multiplier;
                            }
                        }
                        const simplified = simplify(feature, { tolerance, highQuality: false });
                        if (currentLayer.simplification?.roundCoordinates !== false) {
                            const decimals = currentLayer.simplification?.roundingDecimals || 5;
                            simplified.geometry = roundCoordinates(simplified.geometry, decimals);
                        }
                        geojson = simplified.geometry;
                    }
                    onAddEntity(currentLayer.id, {
                        id: `${osmType}-${osmId}`, name: name, geometry: geojson, osm_type: osmType, osm_id: osmId
                    });
                    
                    processed++;
                    
                    // Process next entity after delay
                    setTimeout(() => processNextEntity(index + 1), 1000);
                })
                .catch(err => {
                    console.error(`Error re-fetching ${name}:`, err);
                    // Continue with next entity after delay even if this one failed
                    setTimeout(() => processNextEntity(index + 1), 1000);
                });
        }

        // Start processing
        processNextEntity(0);
    }

    return (
        <div className={`layer-controls ${hoveredLayerId === layer.id ? 'layer-hovered' : ''}`} onMouseEnter={() => onHoverLayer(layer.id)} onMouseLeave={() => onHoverLayer(null)}>
            <div className="d-flex justify-content-between align-items-center px-2 py-1">
                <h5 className="mb-0" {...dragHandleProps} style={{ cursor: 'grab' }}>{layer.name}</h5>
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
                        <Dropdown.Header>Marker & Boundary Style</Dropdown.Header>
                        <Dropdown.Item onClick={() => onMarkerIconChange(layer.id, 'default')}>
                          <i className="bi bi-geo-alt me-2" />Default Marker
                        </Dropdown.Item>
                        <Dropdown.ItemText>
                            <div className="d-flex align-items-center px-2">
                                <IconPicker currentIcon={layer.markerIcon} onSelect={icon => onMarkerIconChange(layer.id, icon)} />
                                <div className="ms-3 d-flex align-items-center">
                                    <Form.Select size="sm" style={{ width: '5rem', fontFamily: 'monospace' }} value={layer.borderStyle} onChange={e => onBorderStyleChange(layer.id, e.target.value)}>
                                        <option value="solid">———</option>
                                        <option value="dashed">---</option>
                                        <option value="dotted">...</option>
                                    </Form.Select>
                                    <Form.Control type="number" size="sm" min="1" className="ms-2" style={{ width: '3rem' }} value={layer.borderWidth} onChange={e => onBorderWidthChange(layer.id, parseInt(e.target.value, 10) || 1)} />
                                </div>
                            </div>
                        </Dropdown.ItemText>
                        <Dropdown.Divider />
                        <Dropdown.Header>Colors</Dropdown.Header>
                        <Dropdown.ItemText>
                            <div className="d-flex align-items-center px-2">
                                <ColorPicker pickerType="fill" color={currentFillColor} onChange={handleFillColorChange} />
                                <span className="ms-2">Fill</span>
                            </div>
                        </Dropdown.ItemText>
                        <Dropdown.ItemText>
                            <div className="d-flex align-items-center px-2">
                                <ColorPicker pickerType="border" color={currentBorderColor} onChange={handleBorderColorChange} />
                                <span className="ms-2">Border</span>
                            </div>
                        </Dropdown.ItemText>
                        <Dropdown.Divider />
                        <Dropdown.Header>Geometry Settings</Dropdown.Header>
                        <Dropdown.ItemText>
                            <div className="d-flex align-items-center px-2">
                                <span className="me-2 small">Precision:</span>
                                <Form.Select
                                    size="sm"
                                    style={{ width: '7rem' }}
                                    value={precision}
                                    onChange={e => {
                                        const selectedValue = e.target.value;
                                        setPrecision(selectedValue);
                                        const updatedLayer = {
                                            ...layer,
                                            simplification: {
                                                ...(layer.simplification || {
                                                    useAdaptive: true,
                                                    roundCoordinates: true,
                                                    roundingDecimals: 5
                                                }),
                                                multiplier: selectedValue
                                            }
                                        };
                                        onUpdateLayerSettings(updatedLayer);
                                        handleRefetchEntities(updatedLayer);
                                    }}
                                >
                                    <option value="0.2">Maximum</option>
                                    <option value="0.5">High</option>
                                    <option value="1.0">Medium</option>
                                    <option value="2.0">Low</option>
                                    <option value="5.0">Very Low</option>
                                </Form.Select>
                            </div>
                        </Dropdown.ItemText>
                        <Dropdown.Divider />
                        <Dropdown.Header>Sort Entities</Dropdown.Header>
                        <Dropdown.Item onClick={() => onSortEntities(layer.id, 'asc')}>
                          <i className="bi bi-sort-alpha-down me-2" />Sort A→Z
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => onSortEntities(layer.id, 'desc')}>
                          <i className="bi bi-sort-alpha-down-alt me-2" />Sort Z→A
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
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
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

            <Droppable droppableId={`entities-${layer.id}`} type="ENTITY">
                {(provided) => (
                  <ul className="list-group" ref={provided.innerRef} {...provided.droppableProps}>
                    {featuresList.map((feature, index) => (
                      <Draggable key={feature.id} draggableId={String(feature.id)} index={index}>
                        {(provided2) => (
                          <li
                            ref={provided2.innerRef}
                            {...provided2.draggableProps}
                            {...provided2.dragHandleProps}
                            className="list-group-item d-flex align-items-center"
                          >
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
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
        </div>
    );
};

export default LayerControls;
