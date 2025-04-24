import React, { useState, useRef, useEffect } from 'react';
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
    markerIcon: layer.markerIcon || 'bi bi-geo-alt-fill',
    borderWidth: layer.borderWidth ?? 2,
    borderStyle: layer.borderStyle || 'solid',
    // ensure every layer has a path (default to root)
    path: layer.path || '',
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
    // track if we’ve synced groups to layers
    const hasSyncedGroupsRef = useRef(false);
    // skip saving groups on initial mount to avoid clearing DB
    const isGroupsInitialMount = useRef(true);
    // hover state for layer highlighting
    const [hoveredLayerId, setHoveredLayerId] = useState(null);
    const handleHoverLayer = (id) => setHoveredLayerId(id);
    // state for group move dialog
    const [moveGroupDialogOpen, setMoveGroupDialogOpen] = useState(false);
    const [groupToMove, setGroupToMove] = useState(null);
    const [selectedDestination, setSelectedDestination] = useState('');

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
                
                // Handle both formats: array of layers or {layers, groups} object
                if (defaultData.layers && Array.isArray(defaultData.layers)) {
                    // If it's in the {layers, groups} format (like exported files)
                    const normalizedLayers = normalizeLayers(defaultData.layers);
                    setLayers(normalizedLayers);
                    
                    // Store the groups from default file for loadGroups to use
                    if (defaultData.groups && Array.isArray(defaultData.groups)) {
                        await set('groups', defaultData.groups);
                    }
                    
                    await set('layers', normalizedLayers);
                } else if (Array.isArray(defaultData)) {
                    // Legacy format: just an array of layers
                    const normalizedLayers = normalizeLayers(defaultData);
                    setLayers(normalizedLayers);
                    await set('layers', normalizedLayers);
                }
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
                if (Array.isArray(stored) && stored.length) {
                    console.log('loadGroups: loading from storage', stored);
                    setGroups(stored);
                }
                else {
                    console.log('loadGroups: creating default Root group');
                    setGroups([{ id: uuidv4(), name: 'Root', path: '', subgroups: [] }]);
                }
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
        if (isGroupsInitialMount.current) {
            isGroupsInitialMount.current = false;
            return;
        }
        set('groups', groups).catch(err => console.error('Save groups error', err));
    }, [groups]);

    // Sync any missing groups based on loaded layers (orphan layers get their groups created under root)
    useEffect(() => {
      if (!hasSyncedGroupsRef.current) {
        hasSyncedGroupsRef.current = true;
        setGroups(prev => {
          const tree = JSON.parse(JSON.stringify(prev));
          const layerPaths = Array.from(new Set(layers.map(l => l.path).filter(p => p)));
          layerPaths.forEach(path => {
            const segs = path.split('/').filter(Boolean);
            let nodes = tree;
            let curr = '';
            segs.forEach(seg => {
              curr = curr ? `${curr}/${seg}` : seg;
              let g = nodes.find(x => x.path === curr);
              if (!g) {
                g = { id: uuidv4(), name: seg, path: curr, subgroups: [] };
                nodes.push(g);
              }
              nodes = g.subgroups;
            });
          });
          return tree;
        });
      }
    }, [layers]);

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
            markerIcon: 'bi bi-geo-alt-fill',
            fillColor: {rgb: { r: 0, g: 0, b: 0, a: 0.2 }, hex: "#000000"},
            borderColor: {rgb: { r: 0, g: 0, b: 0, a: 0.8 }, hex: "#000000"},
            borderWidth: 2,
            borderStyle: 'solid',
            simplification: {
                multiplier: 1.0,
                useAdaptive: true,
                roundCoordinates: true,
                roundingDecimals: 5
            }
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

    const handleBorderWidthChange = (layerId, borderWidth) => {
        setLayers(prevLayers => prevLayers.map(layer =>
            layer.id === layerId ? { ...layer, borderWidth } : layer
        ));
    };

    const handleBorderStyleChange = (layerId, borderStyle) => {
        setLayers(prevLayers => prevLayers.map(layer =>
            layer.id === layerId ? { ...layer, borderStyle } : layer
        ));
    };

    const handleMarkerIconChange = (layerId, markerIcon) => {
        setLayers(prev => prev.map(layer => layer.id === layerId ? { ...layer, markerIcon } : layer));
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
        const dataToExport = JSON.stringify({ layers, groups }, null, 2);
        const blob = new Blob([dataToExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.layers && data.groups) {
                    setLayers(data.layers);
                    setGroups(data.groups);
                } else if (Array.isArray(data)) {
                    setLayers(data);
                } else {
                    console.warn('Imported JSON missing layers/groups');
                }
            } catch (err) {
                console.error('Error importing JSON', err);
            }
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
        // Update groups first
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

        // Update layers paths to match the renamed group
        setLayers(prevLayers => {
            return prevLayers.map(layer => {
                // Exact match: layer directly in the renamed group
                if (layer.path === path) {
                    const parts = path.split('/');
                    parts[parts.length-1] = newName;
                    const newPath = parts.join('/');
                    return {...layer, path: newPath};
                }
                // Child match: layer is in a subgroup of the renamed group
                else if (layer.path.startsWith(`${path}/`)) {
                    const parts = path.split('/');
                    parts[parts.length-1] = newName;
                    const newPath = parts.join('/');
                    return {...layer, path: layer.path.replace(`${path}/`, `${newPath}/`)};
                }
                return layer;
            });
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

    const handleRenameLayer = (layerId, newName) => setLayers(prev => prev.map(l => l.id === layerId ? { ...l, name: newName } : l));
    
    // Update layer settings (e.g., simplification)
    const handleUpdateLayerSettings = (updatedLayer) => {
        setLayers(prev => prev.map(l => l.id === updatedLayer.id ? updatedLayer : l));
    };

    // Handle moving a group to a new parent
    const handleMoveGroup = (group) => {
        setGroupToMove(group);
        setSelectedDestination('');
        setMoveGroupDialogOpen(true);
    };
    
    // Execute the group move after destination is selected
    const executeGroupMove = () => {
        if (!groupToMove || selectedDestination === null) return;
        
        // Prevent moving to own path or subpath
        if (selectedDestination === groupToMove.path ||
            selectedDestination.startsWith(`${groupToMove.path}/`)) {
            alert('Cannot move a group into itself or its subgroups');
            return;
        }

        const oldPath = groupToMove.path;
        
        // Check for naming conflicts
        const findGroupsByPath = (groups, path) => {
            if (path === '') return groups; // Root level
            
            for (const g of groups) {
                if (g.path === path) return g.subgroups || [];
                if (g.subgroups?.length > 0) {
                    const found = findGroupsByPath(g.subgroups, path);
                    if (found !== null) return found;
                }
            }
            return null;
        };
        
        const destinationGroups = findGroupsByPath(groups, selectedDestination);
        if (destinationGroups !== null) {
            const nameConflict = destinationGroups.some(g => g.name === groupToMove.name && g.id !== groupToMove.id);
            if (nameConflict) {
                alert(`Cannot move group: A group named '${groupToMove.name}' already exists at the destination.`);
                return;
            }
        }

        // Compute the new path
        const newPath = selectedDestination === '' ? 
            groupToMove.name : 
            `${selectedDestination}/${groupToMove.name}`;
        
        // Update group paths
        setGroups(prevGroups => {
            const updatedGroups = JSON.parse(JSON.stringify(prevGroups));
            
            // Find and remove the group from its current location
            const removeGroup = (groups, pathToRemove) => {
                for (let i = 0; i < groups.length; i++) {
                    if (groups[i].path === pathToRemove) {
                        return groups.splice(i, 1)[0];
                    }
                    if (groups[i].subgroups?.length > 0) {
                        const removed = removeGroup(groups[i].subgroups, pathToRemove);
                        if (removed) return removed;
                    }
                }
                return null;
            };
            
            // Move the group to the new location
            const movedGroup = removeGroup(updatedGroups, oldPath);
            if (!movedGroup) return prevGroups; // Group not found
            
            // Update the paths of the moved group and its subgroups
            const updatePaths = (group, oldPathBase, newPathBase) => {
                group.path = newPathBase;
                
                if (group.subgroups?.length > 0) {
                    group.subgroups.forEach(subgroup => {
                        const subOldPath = subgroup.path;
                        const subNewPath = subOldPath.replace(oldPathBase, newPathBase);
                        updatePaths(subgroup, subOldPath, subNewPath);
                    });
                }
            };
            
            updatePaths(movedGroup, oldPath, newPath);
            
            // Add the group to its new destination
            const addToDestination = (groups, destPath, groupToAdd) => {
                // Root level
                if (destPath === '') {
                    groups.push(groupToAdd);
                    return true;
                }
                
                for (const g of groups) {
                    if (g.path === destPath) {
                        if (!g.subgroups) g.subgroups = [];
                        g.subgroups.push(groupToAdd);
                        return true;
                    }
                    if (g.subgroups?.length > 0) {
                        if (addToDestination(g.subgroups, destPath, groupToAdd)) {
                            return true;
                        }
                    }
                }
                return false;
            };
            
            const added = addToDestination(updatedGroups, selectedDestination, movedGroup);
            if (!added) return prevGroups; // Failed to add
            
            return updatedGroups;
        });
        
        // Update paths of layers
        setLayers(prevLayers => {
            return prevLayers.map(layer => {
                // Direct match: layer is directly in the moved group
                if (layer.path === oldPath) {
                    return { ...layer, path: newPath };
                }
                
                // Hierarchical match: layer is in a subgroup of the moved group
                if (layer.path.startsWith(`${oldPath}/`)) {
                    return { ...layer, path: layer.path.replace(oldPath, newPath) };
                }
                
                return layer;
            });
        });
        
        // Close the dialog
        setMoveGroupDialogOpen(false);
    };

    const handleDragEnd = (result) => {
        console.log('Drag ended:', result);
        const { source, destination, draggableId, type } = result;
        if (!destination) return;

        // Don't do anything if the item was dropped in the same place
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Handle GROUP drag and drop
        if (type === 'GROUP') {
            // Extract group ID from draggableId (e.g., "group-123" -> 123)
            const groupId = draggableId.replace('group-', '');
            
            // Get source and destination parent paths
            // Format: "subgroups-parentPath" -> "parentPath"
            const sourceParentPath = source.droppableId.replace('subgroups-', '');
            const destParentPath = destination.droppableId.replace('subgroups-', '');
            
            // Track original path for layer path updates
            let draggedGroupOldPath = '';
            
            // Handle group dragging logic
            setGroups(prevGroups => {
                // Make a deep copy of the groups to work with
                const newGroups = JSON.parse(JSON.stringify(prevGroups));
                
                // Find the dragged group and its source parent
                let draggedGroup = null;
                let sourceParent = null;
                let draggedGroupIndex = -1;
                
                // Helper to find a group by ID
                const findGroupById = (groups, id, parent = null, index = -1) => {
                    for (let i = 0; i < groups.length; i++) {
                        if (groups[i].id === id) {
                            return { group: groups[i], parent, index: i };
                        }
                        if (groups[i].subgroups?.length > 0) {
                            const result = findGroupById(groups[i].subgroups, id, groups[i], i);
                            if (result.group) return result;
                        }
                    }
                    return { group: null, parent: null, index: -1 };
                };
                
                // Helper to find a group by path
                const findGroupByPath = (groups, path) => {
                    if (path === 'root') return { group: { subgroups: newGroups, path: '' }, isRoot: true };
                    
                    // Root level groups
                    if (path === '') {
                        return { group: { subgroups: newGroups, path: '' }, isRoot: true };
                    }
                    
                    for (const group of groups) {
                        if (group.path === path) return { group, isRoot: false };
                        if (group.subgroups?.length > 0) {
                            const found = findGroupByPath(group.subgroups, path);
                            if (found.group) return found;
                        }
                    }
                    return { group: null, isRoot: false };
                };
                
                // Find the dragged group
                const { group: foundGroup, parent: foundParent, index } = findGroupById(newGroups, groupId);
                draggedGroup = foundGroup;
                sourceParent = foundParent;
                draggedGroupIndex = index;
                
                if (!draggedGroup) return prevGroups; // Group not found
                
                // Store original path for layer path updates
                draggedGroupOldPath = draggedGroup.path;
                // Add to result object so it can be accessed later for layer updates
                result.draggedGroupOldPath = draggedGroupOldPath;
                
                // Find destination parent group
                const { group: destParentGroup, isRoot: isDestRoot } = findGroupByPath(newGroups, destParentPath);
                if (!destParentGroup) return prevGroups; // Destination not found
                
                // Check for naming conflicts in the destination
                // A conflict exists if there's already a subgroup with the same name in the destination
                const destSubgroups = isDestRoot ? newGroups : destParentGroup.subgroups || [];
                const nameConflict = destSubgroups.some(g => g.name === draggedGroup.name && g.id !== draggedGroup.id);
                
                if (nameConflict) {
                    alert(`Cannot move group: A group named '${draggedGroup.name}' already exists in the destination.`);
                    return prevGroups;
                }
                
                // Remove the group from its current location
                if (sourceParent) {
                    sourceParent.subgroups.splice(draggedGroupIndex, 1);
                } else {
                    newGroups.splice(draggedGroupIndex, 1);
                }
                
                // Calculate the new path for the dragged group
                let newPath = destParentPath === 'root' ? draggedGroup.name : `${destParentPath}/${draggedGroup.name}`;
                
                // Update the path of the dragged group and all its subgroups
                const updateGroupPaths = (group, oldPath, newPathBase) => {
                    // Keep the group's name part but update the parent path part
                    const oldGroupPath = group.path;
                    group.path = newPathBase;
                    
                    if (group.subgroups?.length > 0) {
                        group.subgroups.forEach(subgroup => {
                            // Replace just the part of the path that changed
                            const newSubPath = subgroup.path.replace(oldPath, newPathBase);
                            updateGroupPaths(subgroup, subgroup.path, newSubPath);
                        });
                    }
                };
                
                updateGroupPaths(draggedGroup, draggedGroup.path, newPath);
                
                // Add the group to its new location
                if (isDestRoot) {
                    // Insert at the root level
                    newGroups.splice(destination.index, 0, draggedGroup);
                } else {
                    // Initialize subgroups array if it doesn't exist
                    if (!destParentGroup.subgroups) destParentGroup.subgroups = [];
                    destParentGroup.subgroups.splice(destination.index, 0, draggedGroup);
                }
                
                return newGroups;
            });
            
            // Store the dragged group info for path updating
            // groupId already defined above, so we reuse it
            const oldPath = result.draggedGroupOldPath;
            let newPath = '';
            
            // Need to update layer paths after groups are updated
            // Here we're using a simpler approach that updates paths after the group state has been updated
            setTimeout(() => {
                setLayers(prevLayers => {
                    // Helper function to find a group by ID
                    const findGroupPath = (groups, targetId) => {
                        for (const group of groups) {
                            if (group.id === targetId) {
                                return group.path;
                            }
                            if (group.subgroups?.length > 0) {
                                const path = findGroupPath(group.subgroups, targetId);
                                if (path) return path;
                            }
                        }
                        return null;
                    };
                    
                    // Find the new path of the dragged group
                    newPath = findGroupPath(groups, groupId);
                    if (!newPath || !oldPath) return prevLayers; // Can't update paths without old and new paths
                    
                    console.log(`Updating layers: group ${groupId} moved from ${oldPath} to ${newPath}`);
                    
                    // Update all layer paths that belong to the dragged group or its subgroups
                    return prevLayers.map(layer => {
                        // Direct match: layer directly in the moved group
                        if (layer.path === oldPath) {
                            return { ...layer, path: newPath };
                        }
                        
                        // Hierarchical match: layer in subgroup of moved group
                        if (layer.path.startsWith(`${oldPath}/`)) {
                            const updatedPath = layer.path.replace(oldPath, newPath);
                            return { ...layer, path: updatedPath };
                        }
                        
                        return layer;
                    });
                });
            }, 0);
            
            // Return early since we've handled the GROUP drag type
            return;
        }
        
        // ENTITY drag handling (unchanged)
        if (type === 'ENTITY') {
            const srcStr = source.droppableId.replace('entities-', '');
            const dstStr = destination.droppableId.replace('entities-', '');
            const srcId = !isNaN(Number(srcStr)) ? Number(srcStr) : srcStr;
            const dstId = !isNaN(Number(dstStr)) ? Number(dstStr) : dstStr;
            if (srcId === dstId) {
                handleEntityReorder(srcId, result);
            } else {
                setLayers(prev => {
                    let moved;
                    const removed = prev.map(layer => {
                        if (layer.id !== srcId) return layer;
                        const arr = Array.from(layer.featureCollection.features);
                        [moved] = arr.splice(source.index, 1);
                        return { ...layer, featureCollection: { ...layer.featureCollection, features: arr } };
                    });
                    return removed.map(layer => {
                        if (layer.id !== dstId) return layer;
                        const arr = Array.from(layer.featureCollection.features);
                        arr.splice(destination.index, 0, moved);
                        return { ...layer, featureCollection: { ...layer.featureCollection, features: arr } };
                    });
                });
            }
            return;
        }

        // LAYER drag handling (unchanged)
        setLayers(prevLayers => {
            const newLayers = Array.from(prevLayers);
            const id = !isNaN(Number(draggableId)) ? Number(draggableId) : draggableId;
            const oldIndex = newLayers.findIndex(l => l.id === id);
            if (oldIndex === -1) return prevLayers;
            const [moved] = newLayers.splice(oldIndex, 1);
            const destPath = destination.droppableId === 'root' ? '' : destination.droppableId;
            moved.path = destPath;
            const groupIdxs = newLayers.reduce((acc, l, idx) => { if (l.path === destPath) acc.push(idx); return acc; }, []);
            const insertAt = destination.index < groupIdxs.length
                ? groupIdxs[destination.index]
                : (groupIdxs.length ? groupIdxs[groupIdxs.length - 1] + 1 : newLayers.length);
            newLayers.splice(insertAt, 0, moved);
            return newLayers;
        });
    };

    // Reorder entities within a layer
    const handleEntityReorder = (layerId, result) => {
        const { source, destination } = result;
        if (!destination || source.index === destination.index) return;
        setLayers(prev => prev.map(layer => {
            if (layer.id !== layerId) return layer;
            const features = Array.from(layer.featureCollection.features);
            const [moved] = features.splice(source.index, 1);
            features.splice(destination.index, 0, moved);
            return { ...layer, featureCollection: { ...layer.featureCollection, features } };
        }));
    };

    // Sort entities alphabetically
    const handleSortEntities = (layerId, order) => {
        setLayers(prev => prev.map(layer => {
            if (layer.id !== layerId) return layer;
            const features = [...layer.featureCollection.features].sort((a, b) =>
                a.properties.name.localeCompare(b.properties.name)
            );
            if (order === 'desc') features.reverse();
            return { ...layer, featureCollection: { ...layer.featureCollection, features } };
        }));
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
                        <div className="text-center mb-3 app-title">
                            <img src={process.env.PUBLIC_URL + '/geohighlighter.svg'} alt="GeoHighlighter logo" className="app-logo" />
                            <h2>GeoHighlighter</h2>
                        </div>
                        <div className="row mb-3">
                            <div className="col-6 px-1 mb-2">
                                <button className="btn btn-primary w-100" onClick={handleExport}>Export</button>
                            </div>
                            <div className="col-6 px-1 mb-2">
                                <label className="btn btn-primary w-100" htmlFor="import-file">Import</label>
                                <input id="import-file" type="file" onChange={handleImport} accept=".json" className="d-none" />
                            </div>
                        </div>
                        <div className="scrollable px-2">
                            <Sidebar
                                groups={groups}
                                onAddGroup={handleAddGroup}
                                onRenameGroup={handleRenameGroup}
                                onRemoveGroup={handleRemoveGroup}
                                onMoveGroup={handleMoveGroup}
                                layers={layers}
                                onAddLayer={addNewLayer}
                                onRemoveLayer={handleRemoveLayer}
                                onForceRender={handleForceRender}
                                onAddEntity={addEntityToLayer}
                                onRemoveEntity={removeEntityFromLayer}
                                onTogglePolygonVisibility={togglePolygonVisibility}
                                onToggleMarkerVisibility={toggleMarkerVisibility}
                                onFillColorChange={handleFillColorChange}
                                onBorderColorChange={handleBorderColorChange}
                                onBorderWidthChange={handleBorderWidthChange}
                                onBorderStyleChange={handleBorderStyleChange}
                                onMarkerIconChange={handleMarkerIconChange}
                                onFileImport={handleFileImport}
                                onUpdateEntityName={handleUpdateEntityName}
                                onRenameLayer={handleRenameLayer}
                                onUpdateLayerSettings={handleUpdateLayerSettings}
                                hoveredLayerId={hoveredLayerId}
                                onHoverLayer={handleHoverLayer}
                                onEntityReorder={handleEntityReorder}
                                onSortEntities={handleSortEntities}
                                onDragEnd={handleDragEnd}
                            />
                        </div>
                    </div>
                )}
                <div className="col-auto d-none d-md-flex align-items-center justify-content-center" onClick={toggleSidebar} style={{ cursor: 'pointer' }} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
                    <i className={`bi bi-chevron-${sidebarOpen ? 'left' : 'right'}`}></i>
                </div>
                <div className="col p-0" style={{ height: '100vh' }}>
                    <MapComponent key={`map-${sidebarOpen}`} 
                        layers={layers}
                        handleEntityError={handleEntityError}
                        handleUpdateEntityName={handleUpdateEntityName}
                        handleGeometryUpdate={handleUpdateFeatureGeometry}
                        hoveredLayerId={hoveredLayerId}
                    />
                </div>
                
                {/* Group Move Dialog */}
                {moveGroupDialogOpen && (
                    <div className="modal d-block" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Move Group</h5>
                                    <button type="button" className="btn-close" onClick={() => setMoveGroupDialogOpen(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>Select where to move <strong>{groupToMove?.name}</strong>:</p>
                                    <select 
                                        className="form-select" 
                                        value={selectedDestination} 
                                        onChange={(e) => setSelectedDestination(e.target.value)}
                                    >
                                        <option value="">Root Level</option>
                                        {/* Recursively render group options */}
                                        {(() => {
                                            const renderOptions = (groups, level = 0) => {
                                                return groups.flatMap(g => {
                                                    // Skip the group being moved and its subgroups
                                                    if (groupToMove && (g.path === groupToMove.path || g.path.startsWith(`${groupToMove.path}/`))) {
                                                        return [];
                                                    }
                                                    
                                                    // Create an option for this group
                                                    const indent = '⎯'.repeat(level);
                                                    const option = (
                                                        <option key={g.path} value={g.path}>
                                                            {level ? indent + ' ' : ''}{g.name}
                                                        </option>
                                                    );
                                                    
                                                    // Include options for subgroups if any
                                                    if (g.subgroups?.length) {
                                                        return [option, ...renderOptions(g.subgroups, level + 1)];
                                                    }
                                                    
                                                    return option;
                                                });
                                            };
                                            
                                            return renderOptions(groups);
                                        })()} 
                                    </select>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setMoveGroupDialogOpen(false)}>Cancel</button>
                                    <button type="button" className="btn btn-primary" onClick={executeGroupMove}>Move</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
