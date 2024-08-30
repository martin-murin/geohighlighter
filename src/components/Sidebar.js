import React, { useState } from 'react';
import LayerControls from './LayerControls'; // Assuming you have a separate component for layer controls
import { Button, Form, FormControl, InputGroup, Dropdown } from 'react-bootstrap';

const Sidebar = ({ layers, onAddEntity, onRemoveEntity, onToggleLayerVisibility, onAddLayer }) => {
    const [newLayerName, setNewLayerName] = useState('');
    const [newLayerType, setNewLayerType] = useState('country');

    const handleAddNewLayer = () => {
        if (newLayerName.trim()) {
            onAddLayer(newLayerName, newLayerType);
            setNewLayerName('');
        }
    };

    return (
        <div className="sidebar bg-light p-3">
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
                <Form>
                    <Form.Group controlId="formLayerName">
                        <InputGroup className="mb-3">
                            <FormControl
                                placeholder="Layer Name"
                                value={newLayerName}
                                onChange={(e) => setNewLayerName(e.target.value)}
                            />
                        </InputGroup>
                    </Form.Group>
                    <Button variant="primary" className="mt-3" onClick={handleAddNewLayer}>
                        Add Layer
                    </Button>
                </Form>
            </div>
        </div>
    );
};

export default Sidebar;

