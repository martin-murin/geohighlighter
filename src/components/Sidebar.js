import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import GroupView from './GroupView';

const Sidebar = ({ groups, layers, onAddGroup, onRenameGroup, onRemoveGroup, onAddLayer, onAddEntity, onRemoveEntity, onTogglePolygonVisibility, onToggleMarkerVisibility, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange, onMarkerIconChange, onFileImport, onUpdateEntityName, onRenameLayer, hoveredLayerId, onHoverLayer, onDragEnd, onEntityReorder, onSortEntities, onBorderWidthChange, onBorderStyleChange }) => {
    return (
        <DragDropContext onDragEnd={onDragEnd} getContainerForClone={() => document.body}>
            <div className="row">
                <div className="sidebar col-12 text-start">
                    {groups.map(group => (
                        <GroupView
                            key={group.path}
                            group={group}
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
                </div>
            </div>
        </DragDropContext>
    );
};

export default Sidebar;
