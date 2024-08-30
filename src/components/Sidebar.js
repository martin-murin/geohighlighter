import React, { useState } from 'react';
import LayerControls from './LayerControls'; // Assuming you have a separate component for layer controls
import { Button, Form, FormControl, InputGroup, Dropdown } from 'react-bootstrap';

const Sidebar = ({ layers, onAddEntity, onRemoveEntity, onToggleLayerVisibility, onAddLayer }) => {
    const [newLayerName, setNewLayerName] = useState('');
    const [newLayerType, setNewLayerType] = useState('country');

    const handleAddNewLayer = () => {
        if (newLayerName.trim()) {
            onAddLayer(newLayerName);
            setNewLayerName('');
        }
    };

    return (
        <div className="sidebar p-2">
            <h2>Layers</h2>
            {layers.map(layer => (
                <LayerControls
                    key={layer.id}
                    layer={layer}
                    onAddEntity={onAddEntity}
                    onRemoveEntity={onRemoveEntity}
                    onToggleVisibility={onToggleLayerVisibility}
                />
            ))}
            <div className="new-layer mt-4">
                <h3>Add New Layer</h3>
                    <input
                    className="col-12"
                    type="text"
                    placeholder={`LaAyer Name`}
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
    );
};

export default Sidebar;

