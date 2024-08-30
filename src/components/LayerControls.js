import React, { useState } from 'react';

const LayerControls = ({ layer, onAddEntity, onRemoveEntity, onToggleVisibility }) => {
    const [newEntity, setNewEntity] = useState('');

    const handleAddEntity = () => {
        if (newEntity) {
            onAddEntity(layer.id, newEntity);
            setNewEntity('');
        }
    };

    return (
        <div className="layer-controls">
            <div className="justify-content-between align-items-center mb-2">
                <div className="row mt-2 mb-2">
                    <h5 className="col-10">{layer.name}</h5>
                    <button className="btn btn-secondary btn-sm col-2" onClick={() => onToggleVisibility(layer.id)}>
                        {layer.visible ? 'Hide' : 'Show'}
                    </button>
                </div>
                <div className="row mx-2">
                    <input
                    className="col-sm-12"
                    type="text"
                    placeholder={`Add ${layer.type}`}
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

