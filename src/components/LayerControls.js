import React, { useState } from 'react';
import ColorPicker from './ColorPicker';

const LayerControls = ({ layer, onAddEntity, onRemoveEntity, onToggleVisibility, onRemoveLayer, onForceRender, onFillColorChange, onBorderColorChange }) => {
    const [newEntityId, setNewEntityId] = useState('');
    const [currentFillColor, setCurrentFillColor] = useState({rgb: { r: 0, g: 0, b: 0, a: 0.2,},});
    const [currentBorderColor, setCurrentBorderColor] = useState({rgb: { r: 0, g: 0, b: 0, a: 0.8,},});

    const handleAddEntity = () => {
        if (newEntityId) {
            const newEntity = {
                id: newEntityId,
                name: newEntityId
            }
            onAddEntity(layer.id, newEntity);
            setNewEntityId('');
        }
    };

    const handleFillColorChange = (fillColor) => {
        setCurrentFillColor(fillColor);
        onFillColorChange(layer.id, fillColor);
    };

    const handleBorderColorChange = (borderColor) => {
        setCurrentBorderColor(borderColor);
        onBorderColorChange(layer.id, borderColor);
    };

    return (
        <div className="layer-controls">
            <div className="justify-content-between align-items-center mb-2">
                <div className="row mt-2 mb-2 mx-2">
                    <div className="row mt-4">
                        <h5 className="col-12">{layer.name}</h5>
                    </div>
                    <div className="col-12 col-lg-2 mb-2 mb-lg-0">
                        <ColorPicker onChange={handleFillColorChange} />
                    </div>
                    <div className="col-12 col-lg-2 mb-2 mb-lg-0">
                        <ColorPicker onChange={handleBorderColorChange} />
                    </div>
                    <div className="col-12 col-lg-3 mb-2 mb-lg-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onToggleVisibility(layer.id)}>
                            {layer.visible ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    <div className="col-12 col-lg-3 mb-2 mb-lg-0">
                        <button className="btn btn-secondary btn-sm w-100" onClick={() => onForceRender(layer.id)}>
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                    <div className="col-12 col-lg-2 mb-2 mb-lg-0">
                        <button className="btn btn-danger btn-sm w-100" title="Delete Layer" onClick={() => onRemoveLayer(layer.id)}>
                            &times;
                        </button>
                    </div>
                </div>
                <div className="row mx-2">
                    <input
                    className="form-control col-12"
                    type="text"
                    placeholder={`Add entity`}
                    value={newEntityId}
                    onChange={(e) => setNewEntityId(e.target.value)}
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
                  {entity.name ? entity.name : "Loading..."}
                  <button className="btn btn-danger btn-sm" onClick={() => onRemoveEntity(layer.id, entity.id)}>
                    &times;
                  </button>
                </li>
              ))}
            </ul>
        </div>
    );
};

export default LayerControls;

