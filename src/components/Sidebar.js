import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import GroupView from './GroupView';

const Sidebar = ({ groups, layers, onAddGroup, onRenameGroup, onRemoveGroup, onMoveGroup, onAddLayer, onAddEntity, onRemoveEntity, onTogglePolygonVisibility, onToggleMarkerVisibility, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange, onMarkerIconChange, onFileImport, onUpdateEntityName, onRenameLayer, onUpdateLayerSettings, hoveredLayerId, onHoverLayer, onDragEnd, onEntityReorder, onSortEntities, onBorderWidthChange, onBorderStyleChange }) => {
    return (
        <DragDropContext onDragEnd={onDragEnd} getContainerForClone={() => document.body}>
            <div className="row">
                <div className="sidebar col-12 text-start">
                    {/* Root droppable area for top-level groups */}
                    <Droppable droppableId="subgroups-root" type="GROUP">
                        {(provided) => (
                            <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps}
                                className="root-groups-container"
                            >
                                {groups.map(group => (
                                    <GroupView
                                        key={group.id}
                                        group={group}
                                        groups={groups} 
                                        layers={layers}
                                        onAddGroup={onAddGroup}
                                        onRenameGroup={onRenameGroup}
                                        onRemoveGroup={onRemoveGroup}
                                        onMoveGroup={onMoveGroup}
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
                                        onUpdateLayerSettings={onUpdateLayerSettings}
                                        hoveredLayerId={hoveredLayerId}
                                        onHoverLayer={onHoverLayer}
                                        onEntityReorder={onEntityReorder}
                                        onSortEntities={onSortEntities}
                                        onBorderWidthChange={onBorderWidthChange}
                                        onBorderStyleChange={onBorderStyleChange}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>
            </div>
        </DragDropContext>
    );
};

export default Sidebar;
