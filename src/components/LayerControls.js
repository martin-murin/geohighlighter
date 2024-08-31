import React, { useState } from 'react';
import ColorPicker from './ColorPicker';

const LayerControls = ({ layer, onAddEntity, onRemoveEntity, onToggleVisibility, onRemoveLayer, onForceRender, onColorChange }) => {
    const [newEntity, setNewEntity] = useState('');
    const [currentColor, setCurrentColor] = useState({rgb: { r: 85, g: 0, b: 255, a: 0.2,},});

    const handleAddEntity = () => {
        if (newEntity) {
            onAddEntity(layer.id, newEntity);
            setNewEntity('');
        }
    };

    const handleColorChange = (color) => {
        setCurrentColor(color);
        console.log("setting color to", color);
        onColorChange(layer.id, color);
    };

    return (
        <div className="layer-controls">
            <div className="justify-content-between align-items-center mb-2">
                <div className="row mt-2 mb-2 mx-2">
                    <div className="row mt-4">
                        <h5 className="col-12">{layer.name}</h5>
                    </div>
                    <div className="col-12 col-md-3 mb-2 mb-md-0">
                        <ColorPicker onChange={handleColorChange} />
                    </div>
                    <div className="col-12 col-md-3 mb-2 mb-md-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onToggleVisibility(layer.id)}>
                            {layer.visible ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div className="col-12 col-md-3 mb-2 mb-md-0">
                        <button className="btn btn-danger btn-sm w-100" onClick={() => onRemoveLayer(layer.id)}>
                            &times;
                        </button>
                    </div>
                    <div className="col-12 col-md-3 mb-2 mb-md-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onForceRender(layer.id)}>
                            Reload
                        </button>
                    </div>
                </div>
                <div className="row mx-2">
                    <input
                    className="form-control col-12"
                    type="text"
                    placeholder={`Add entity`}
                    value={newEntity}
                    onChange={(e) => setNewEntity(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleAddEntity();
                        }
                    }}
                    />
                </div>
            </div>

            <ul className="list-group">
                {layer.entities.map((entity, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        {entity}
                        <button className="btn btn-danger btn-sm" onClick={() => onRemoveEntity(layer.id, entity)}>
                            &times;
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LayerControls;

