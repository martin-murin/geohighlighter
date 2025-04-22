import React, { useState } from 'react';
import LayerControls from './LayerControls';
import './GroupView.css';

const GroupView = ({
  group,
  layers,
  onAddGroup,
  onRenameGroup,
  onRemoveGroup,
  onAddLayer,
  onAddEntity,
  onRemoveEntity,
  onTogglePolygonVisibility,
  onToggleMarkerVisibility,
  onRemoveLayer,
  onForceRender,
  onFillColorChange,
  onBorderColorChange,
  onFileImport,
  onUpdateEntityName
}) => {
  // filter layers belonging to this group
  const groupLayers = layers.filter(l => l.path === group.path);
  const [expanded, setExpanded] = useState(true);

  const handleAddLayer = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      onAddLayer(e.target.value, group.path);
      e.target.value = '';
    }
  };

  return (
    <div className="group-view mb-3">
      <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded group-header" onClick={() => setExpanded(prev => !prev)}>
        <div className="d-flex align-items-center">
          <span className="me-2">{group.name}</span>
          <i className="bi bi-plus-circle me-2" onClick={e => { e.stopPropagation(); const name = prompt('New subgroup name'); if (name) onAddGroup(group.path, name); }} style={{ cursor: 'pointer' }} />
          <i className="bi bi-pencil me-2" onClick={e => { e.stopPropagation(); const newName = prompt('Rename group', group.name); if (newName) onRenameGroup(group.path, newName); }} style={{ cursor: 'pointer' }} />
          <i className="bi bi-trash me-2" onClick={e => { e.stopPropagation(); if (window.confirm(`Delete group '${group.name}'?`)) onRemoveGroup(group.path); }} style={{ cursor: 'pointer' }} />
        </div>
        <i className={`bi bi-chevron-${expanded ? 'down' : 'right'}`} style={{ cursor: 'pointer' }} />
      </div>
      {expanded && (
        <div className="group-children ms-3 mt-2">
          {group.subgroups?.map(sub => (
            <GroupView
              key={sub.id}
              group={sub}
              layers={layers}
              onAddGroup={onAddGroup}
              onRenameGroup={onRenameGroup}
              onRemoveGroup={onRemoveGroup}
              onAddLayer={onAddLayer}
              onAddEntity={onAddEntity}
              onRemoveEntity={onRemoveEntity}
              onTogglePolygonVisibility={onTogglePolygonVisibility}
              onToggleMarkerVisibility={onToggleMarkerVisibility}
              onRemoveLayer={onRemoveLayer}
              onForceRender={onForceRender}
              onFillColorChange={onFillColorChange}
              onBorderColorChange={onBorderColorChange}
              onFileImport={onFileImport}
              onUpdateEntityName={onUpdateEntityName}
            />
          ))}
          {groupLayers.map(layer => (
            <LayerControls
              key={layer.id}
              layer={layer}
              onAddEntity={onAddEntity}
              onRemoveEntity={onRemoveEntity}
              onTogglePolygonVisibility={onTogglePolygonVisibility}
              onToggleMarkerVisibility={onToggleMarkerVisibility}
              onRemoveLayer={onRemoveLayer}
              onForceRender={onForceRender}
              onFillColorChange={onFillColorChange}
              onBorderColorChange={onBorderColorChange}
              onFileImport={onFileImport}
              onUpdateEntityName={onUpdateEntityName}
            />
          ))}
          <div className="new-layer mt-3">
            <input
              type="text"
              className="form-control"
              placeholder="New Layer"
              onKeyPress={handleAddLayer}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupView;
