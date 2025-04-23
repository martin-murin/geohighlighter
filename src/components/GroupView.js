import React, { useState, useMemo } from 'react';
import LayerControls from './LayerControls';
import './GroupView.css';
import { Droppable, Draggable } from '@hello-pangea/dnd';

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
  onMarkerIconChange,
  onFileImport,
  onUpdateEntityName,
  onRenameLayer,
  hoveredLayerId,
  onHoverLayer,
  onEntityReorder,
  onSortEntities,
  onBorderWidthChange,
  onBorderStyleChange
}) => {
  // filter layers belonging to this group
  const groupLayers = layers.filter(l => l.path === group.path);
  const [expanded, setExpanded] = useState(true);

  // Highlight this group header when any descendant layer is hovered
  const isGroupHovered = useMemo(() => {
    if (!hoveredLayerId) return false;
    const hovered = layers.find(l => l.id === hoveredLayerId);
    if (!hovered) return false;
    if (hovered.path === group.path) return true;
    return group.path && hovered.path.startsWith(group.path + '/');
  }, [hoveredLayerId, layers, group.path]);

  const handleAddLayer = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      onAddLayer(e.target.value, group.path);
      e.target.value = '';
    }
  };

  return (
    <div className="group-view mb-3">
      <div className={`d-flex justify-content-between align-items-center p-2 bg-light rounded group-header ${isGroupHovered ? 'group-hovered' : ''}`} onClick={() => setExpanded(prev => !prev)}>
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
              onMarkerIconChange={onMarkerIconChange}
              onFileImport={onFileImport}
              onUpdateEntityName={onUpdateEntityName}
              onRenameLayer={onRenameLayer}
              hoveredLayerId={hoveredLayerId}
              onHoverLayer={onHoverLayer}
              onEntityReorder={onEntityReorder}
              onSortEntities={onSortEntities}
              onBorderWidthChange={onBorderWidthChange}
              onBorderStyleChange={onBorderStyleChange}
            />
          ))}
          <Droppable droppableId={group.path || 'root'} type="LAYER">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {groupLayers.map((layer, index) => (
                  <Draggable key={layer.id} draggableId={String(layer.id)} index={index}>
                    {(provided2) => (
                      <div
                        ref={provided2.innerRef}
                        {...provided2.draggableProps}
                        style={provided2.draggableProps.style}
                      >
                        <LayerControls
                          layer={layer}
                          onAddEntity={onAddEntity}
                          onRemoveEntity={onRemoveEntity}
                          onTogglePolygonVisibility={onTogglePolygonVisibility}
                          onToggleMarkerVisibility={onToggleMarkerVisibility}
                          onRemoveLayer={onRemoveLayer}
                          onForceRender={onForceRender}
                          onFillColorChange={onFillColorChange}
                          onBorderColorChange={onBorderColorChange}
                          onMarkerIconChange={onMarkerIconChange}
                          onFileImport={onFileImport}
                          onUpdateEntityName={onUpdateEntityName}
                          onRenameLayer={onRenameLayer}
                          hoveredLayerId={hoveredLayerId}
                          onHoverLayer={onHoverLayer}
                          onEntityReorder={onEntityReorder}
                          onSortEntities={onSortEntities}
                          onBorderWidthChange={onBorderWidthChange}
                          onBorderStyleChange={onBorderStyleChange}
                          dragHandleProps={provided2.dragHandleProps} // only title handles layer drag
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {/* New layer input moved inside droppable for empty state drop area */}
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
          </Droppable>
        </div>
      )}
    </div>
  );
};

export default GroupView;
