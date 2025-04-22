import React, { useEffect, useState, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';
import './App.css'
import { get, set } from 'idb-keyval';
import { gpx, kml } from 'togeojson';
import { v4 as uuidv4 } from 'uuid';
import hash from 'object-hash';

// Normalize loaded layers to ensure valid GeoJSON Feature shape
const normalizeLayers = (layersArr) => layersArr.map(layer => ({
    ...layer,
    featureCollection: {
        type: 'FeatureCollection',
        features: (layer.featureCollection?.features || []).map(f => ({
            type: 'Feature',
            id: f.id,
            geometry: f.geometry,
            properties: f.properties || { name: f.name, notes: '' }
        }))
    }
}));

function App() {
    const [layers, setLayers] = useState([]);
    const [groups, setGroups] = useState([]);
    // track first render to skip initial empty save
    const isInitialMount = useRef(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const toggleSidebar = () => setSidebarOpen(prev => !prev);

    useEffect(() => {
        const loadData = async () => {
            let data;
            try {
                data = await get('layers');
                console.log('loadData: fetched from IndexedDB', data);
                // only accept non-empty arrays
                if (Array.isArray(data) && data.length > 0) {
                    data = normalizeLayers(data);
                    setLayers(data);
                    return;
                }
            } catch (error) {
                console.error('IndexedDB error reading layers:', error);
            }
            // localStorage fallback
            if (window.localStorage) {
                const lsData = localStorage.getItem('layers');
                if (lsData) {
                    try {
                        let parsed = JSON.parse(lsData);
                        console.log('loadData: fetched from localStorage', parsed);
                        // only accept non-empty arrays
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            parsed = normalizeLayers(parsed);
                            setLayers(parsed);
                            await set('layers', parsed);
                            localStorage.removeItem('layers');
                            return;
                        }
                    } catch (e) {
                        console.error('Error parsing localStorage layers:', e);
                    }
                }
            }
            console.log('loadData: loading default JSON');
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/layers_default.json`);
                let defaultData = await response.json();
                defaultData = normalizeLayers(defaultData);
                setLayers(defaultData);
                await set('layers', defaultData);
            } catch (error) {
                console.error('Error loading default layers:', error);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadGroups = async () => {
            try {
                const stored = await get('groups');
                if (Array.isArray(stored) && stored.length) setGroups(stored);
                else setGroups([{ id: uuidv4(), name: 'Root', path: '', subgroups: [] }]);
            } catch (e) {
                console.error('Load groups error', e);
                setGroups([{ id: uuidv4(), name: 'Root', path: '', subgroups: [] }]);
            }
        };
        loadGroups();
    }, []);

    useEffect(() => {
        // skip save on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const saveData = async () => {
            console.log('saveData: saving to IndexedDB', layers);
            try {
                await set('layers', layers);
            } catch (error) {
                console.error('IndexedDB error saving layers:', error);
                if (window.localStorage) {
                    localStorage.setItem('layers', JSON.stringify(layers));
                }
            }
        };
        saveData();
    }, [layers]);

    useEffect(() => {
        set('groups', groups).catch(err => console.error('Save groups error', err));
    }, [groups]);

    const addEntityToLayer = (layerId, newEntity) => {
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id !== layerId) return layer;
            let id, props;
            // OSM feature: use type/id
            if (newEntity.osm_type && newEntity.osm_id) {
                id = `${newEntity.osm_type}/${newEntity.osm_id}`;
                props = {
                    ...newEntity.properties,
                    name: newEntity.name,
                    notes: newEntity.notes || '',
                    source: 'osm',
                    osm_type: newEntity.osm_type,
                    osm_id: newEntity.osm_id
                };
            // Imported features: use provided id or hash geometry
            } else if (newEntity.imported) {
                id = newEntity.id || hash(newEntity.geometry || newEntity);
                props = {
                    ...newEntity.properties,
                    name: newEntity.name,
                    notes: newEntity.properties?.notes || '',
                    source: 'import'
                };
            // Manual entries: generate uuid
            } else {
                id = newEntity.id || uuidv4();
                props = {
                    name: newEntity.name,
                    notes: newEntity.notes || '',
                    source: 'manual'
                };
            }
            if (layer.featureCollection.features.some(f => f.id === id)) {
                return layer;
            }
            const feature = {
                type: 'Feature',
                id,
                geometry: newEntity.geometry ?? null,
                properties: props
            };
            return {
                ...layer,
                featureCollection: {
                    ...layer.featureCollection,
                    features: [...layer.featureCollection.features, feature]
                }
            };
        }));
    };

    const removeEntityFromLayer = (layerId, entityId) => {
        setLayers(prevLayers => {
            const newLayers = prevLayers.map(layer => {
                if (layer.id === layerId) {
                    return {
                        ...layer,
                        featureCollection: {
                            ...layer.featureCollection,
                            features: layer.featureCollection.features.filter(entity => entity.id !== entityId)
                        }
                    };
                }
                return layer;
            });
            // immediate persistence to IndexedDB
            set('layers', newLayers).catch(err => console.error('IndexedDB error saving after deletion:', err));
            return newLayers;
        });
    };

    const togglePolygonVisibility = (layerId) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, polygonsVisible: !layer.polygonsVisible }
                : layer
        ));
    };
    const toggleMarkerVisibility = (layerId) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, markersVisible: !layer.markersVisible }
                : layer
        ));
    };

    const addNewLayer = (name, path = '') => {
        const newLayer = {
            id: Date.now(),
            name,
            path,
            featureCollection: {
                type: 'FeatureCollection',
                features: []
            },
            polygonsVisible: true,
            markersVisible: true,
            fillColor: {rgb: { r: 0, g: 0, b: 0, a: 0.2,}, hex: "#000000"} ,
            borderColor: {rgb: { r: 0, g: 0, b: 0, a: 0.8,}, hex: "#000000"} ,
        };
        setLayers([...layers, newLayer]);
    };

    const handleRemoveLayer = (layerId) => {
        setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerId));
    };

    const handleEntityError = (layerId, entityId) => {
        // Prevent adding the entity to the list if there's an error
        setLayers(prevLayers => {
            return prevLayers.map(layer => {
                if (layer.id === layerId) {
                    return {
                        ...layer,
                        featureCollection: {
                            ...layer.featureCollection,
                            features: layer.featureCollection.features.filter(e => e.id !== entityId),
                        },
                    };
                }
                return layer;
            });
        });
    };

    const handleForceRender = (layerId) => {
        setLayers(prevLayers => {
            const layer = prevLayers.find(l => l.id === layerId);
            const otherLayers = prevLayers.filter(l => l.id !== layerId);

            return [
                ...otherLayers,
                {
                    ...layer,
                    featureCollection: {
                        ...layer.featureCollection,
                        features: []
                    }
                },
            ];
        });

        const layer = layers.find(l => l.id === layerId);
        layer.featureCollection.features.forEach((entity, index) => {
            setTimeout(() => {
                setLayers(prevLayers =>
                    prevLayers.map(l =>
                        l.id === layerId ? { ...l, featureCollection: { ...l.featureCollection, features: [...l.featureCollection.features, entity] } } : l
                    )
                );
            }, 5000);
        });
    };

    const handleFillColorChange = (layerId, fillColor) => {
        setLayers(prevLayers =>
            prevLayers.map(layer =>
                layer.id === layerId ? { ...layer, fillColor } : layer
            )
        );
    };

    const handleBorderColorChange = (layerId, borderColor) => {
        setLayers(prevLayers =>
            prevLayers.map(layer =>
                layer.id === layerId ? { ...layer, borderColor } : layer
            )
        );
    };

    const handleUpdateEntityName = (layerId, entityId, newName) => {
        setLayers(prevLayers => prevLayers.map(layer => {
            if (layer.id === layerId) {
                return {
                    ...layer,
                    featureCollection: {
                        ...layer.featureCollection,
                        features: layer.featureCollection.features.map(entity =>
                            entity.id === entityId ? { ...entity, properties: { ...entity.properties, name: newName } } : entity
                        )
                    }
                };
            }
            return layer;
        }));
    };

    const handleUpdateFeatureGeometry = (layerId, featureId, geometry) => {
        setLayers(prev => prev.map(layer => layer.id === layerId
            ? { ...layer,
                featureCollection: {
                    ...layer.featureCollection,
                    features: layer.featureCollection.features.map(f =>
                        f.id === featureId ? { ...f, geometry } : f
                    )
                }
            }
            : layer
        ));
    };

    const handleExport = () => {
        const dataToExport = JSON.stringify(layers);
        const blob = new Blob([dataToExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'layers_export.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const importedLayers = JSON.parse(e.target.result);
            setLayers(importedLayers);
        };
        reader.readAsText(file);
    };

    const handleFileImport = (layerId, event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parser = new DOMParser();
                const xml = parser.parseFromString(text, 'application/xml');
                let fc;
                if (file.name.toLowerCase().endsWith('.gpx')) {
                    fc = gpx(xml);
                } else if (file.name.toLowerCase().endsWith('.kml')) {
                    fc = kml(xml);
                } else {
                    console.error('Unsupported file type');
                    return;
                }
                fc.features.forEach((feature) => {
                    // compute deterministic id for import
                    const featureId = hash(feature.geometry || feature);
                    addEntityToLayer(layerId, {
                        id: featureId,
                        name: feature.properties?.name || '',
                        geometry: feature.geometry,
                        imported: true,
                        properties: feature.properties || {}
                    });
                });
            } catch (err) {
                console.error('Error parsing file', err);
            }
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    const handleAddGroup = (parentPath, name) => {
        setGroups(prev => {
            // Deep clone groups tree
            const tree = JSON.parse(JSON.stringify(prev));
            // New subgroup to insert
            const newGroup = { id: uuidv4(), name, path: parentPath ? `${parentPath}/${name}` : name, subgroups: [] };
            // Recursive insertion: find matching parentPath
            const insert = (nodes) => {
                for (const node of nodes) {
                    if (node.path === parentPath) {
                        node.subgroups = node.subgroups || [];
                        node.subgroups.push(newGroup);
                        return true;
                    }
                    if (node.subgroups && insert(node.subgroups)) return true;
                }
                return false;
            };
            insert(tree);
            return tree;
        });
    };

    const handleRenameGroup = (path, newName) => {
        setGroups(prev => {
            const tree = JSON.parse(JSON.stringify(prev));
            const update = (nodes) => nodes.forEach(g => {
                if (g.path === path) {
                    const parts = g.path.split('/'); parts[parts.length-1] = newName;
                    const newPath = parts.join('/'); g.name = newName; g.path = newPath;
                    const fix = subs => subs.forEach(s => {
                        s.path = s.path.replace(`${path}/`, `${newPath}/`);
                        fix(s.subgroups || []);
                    });
                    fix(g.subgroups || []);
                } else update(g.subgroups || []);
            });
            update(tree);
            return tree;
        });
    };

    const handleRemoveGroup = (path) => {
        const drop = (nodes) => nodes.filter(g => {
            if (g.path === path) return false;
            g.subgroups = drop(g.subgroups || []);
            return true;
        });
        setGroups(prev => drop(prev));
    };

    return (
        <div className="container-fluid">
            {/* Mobile toggle for sidebar */}
            <div className="d-flex d-md-none justify-content-end p-2">
                <button className="btn btn-light" onClick={toggleSidebar} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
                    <i className={`bi bi-chevron-${sidebarOpen ? 'up' : 'down'}`}></i>
                </button>
            </div>
            <div className="row">
                {sidebarOpen && (
                    <div className="col-md-3 col-12 px-3 mt-4">
                        <div className="text-center mb-3">
                            <h2>Map Highlighter</h2>
                            <div className="row">
                                <div className="col-6 mt-2 mb-2">
                                    <button className="btn btn-primary w-100" onClick={handleExport}>Export Layers</button>
                                </div>
                                <div className="col-6 mt-2 mb-2">
                                    <label className="btn btn-primary w-100" htmlFor="import-file">Import Layers</label>
                                    <input id="import-file" type="file" onChange={handleImport} accept=".json" className="d-none" />
                                </div>
                            </div>
                        </div>
                        <div className="scrollable px-2">
                            <Sidebar
                                groups={groups}
                                onAddGroup={handleAddGroup}
                                onRenameGroup={handleRenameGroup}
                                onRemoveGroup={handleRemoveGroup}
                                layers={layers}
                                onAddEntity={addEntityToLayer}
                                onRemoveEntity={removeEntityFromLayer}
                                onTogglePolygonVisibility={togglePolygonVisibility}
                                onToggleMarkerVisibility={toggleMarkerVisibility}
                                onAddLayer={addNewLayer}
                                onRemoveLayer={handleRemoveLayer}
                                onForceRender={handleForceRender}
                                onFillColorChange={handleFillColorChange}
                                onBorderColorChange={handleBorderColorChange}
                                onFileImport={handleFileImport}
                                onUpdateEntityName={handleUpdateEntityName}
                            />
                        </div>
                    </div>
                )}
                {/* Desktop toggle */}
                <div className="col-auto d-none d-md-flex align-items-center justify-content-center" onClick={toggleSidebar} style={{ cursor: 'pointer' }} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
                    <i className={`bi bi-chevron-${sidebarOpen ? 'left' : 'right'}`}></i>
                </div>
                <div className="col p-0" style={{ height: '100vh' }}>
                    <MapComponent key={`map-${sidebarOpen}`} 
                        layers={layers}
                        handleEntityError={handleEntityError}
                        handleUpdateEntityName={handleUpdateEntityName}
                        handleGeometryUpdate={handleUpdateFeatureGeometry}
                    />
                </div>
            </div>
        </div>
    );
}

export default App;
