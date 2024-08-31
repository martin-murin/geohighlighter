import React, { useState } from 'react';
import LayerControls from './LayerControls'; // Assuming you have a separate component for layer controls
import { Button, Form, FormControl, InputGroup, Dropdown } from 'react-bootstrap';

const Sidebar = ({ layers, onAddEntity, onRemoveEntity, onToggleLayerVisibility, onAddLayer, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange}) => {
    const [newLayerName, setNewLayerName] = useState('');
    const [newLayerType, setNewLayerType] = useState('country');

    const handleAddNewLayer = () => {
        if (newLayerName.trim()) {
            onAddLayer(newLayerName);
            setNewLayerName('');
        }
    };

    return (
        <div className="row">
            <div className="sidebar col-12 mt-4 text-center">
                <h2>Map Highlighter</h2>
                {layers.map(layer => (
                    <LayerControls
                        key={layer.id}
                        layer={layer}
                        onAddEntity={onAddEntity}
                        onRemoveEntity={onRemoveEntity}
                        onToggleVisibility={onToggleLayerVisibility}
                        onRemoveLayer={onRemoveLayer}
                        onForceRender={onForceRender}
                        onFillColorChange={onFillColorChange}
                        onBorderColorChange={onBorderColorChange}
                    />
                ))}
                <div className="new-layer mt-4 mb-4 mx-2">
                    <h3>Create New Layer</h3>
                        <input
                        className="form-control col-12"
                        type="text"
                        placeholder={`Layer Name`}
                        value={newLayerName}
                        onChange={(e) => setNewLayerName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleAddNewLayer();
                            }
                        }}
                        />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

