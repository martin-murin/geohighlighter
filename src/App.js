import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';

function App() {
    const [layers, setLayers] = useState([
        { id: 1, name: 'Default Layer', type: 'country', entities: [], visible: true }
    ]);
    //const [countries, setCountries] = useState([]);
    //const [layersVisible, setLayersVisible] = useState(true);

    const addEntityToLayer = (layerId, entity) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, entities: [...layer.entities, entity] }
                : layer
        ));
    };

    const removeEntityFromLayer = (layerId, entity) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, entities: layer.entities.filter(e => e !== entity) }
                : layer
        ));
    };

    const toggleLayerVisibility = (layerId) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, visible: !layer.visible }
                : layer
        ));
    };

    const addNewLayer = (name) => {
        const newLayer = {
            id: Date.now(),
            name,
            entities: [],
            visible: true,
        };
        setLayers([...layers, newLayer]);
    };

    const handleRemoveLayer = (layerId) => {
        setLayers(prevLayers => prevLayers.filter(layer => layer.id !== layerId));
    };

    const handleForceRender = (layerId) => {
        setLayers(prevLayers => {
            const layer = prevLayers.find(l => l.id === layerId);
            const otherLayers = prevLayers.filter(l => l.id !== layerId);

            return [
                ...otherLayers,
                {
                    ...layer,
                    entities: [],
                },
            ];
        });

        const layer = layers.find(l => l.id === layerId);
        layer.entities.forEach((entity, index) => {
            setTimeout(() => {
                setLayers(prevLayers =>
                    prevLayers.map(l =>
                        l.id === layerId ? { ...l, entities: [...l.entities, entity] } : l
                    )
                );
            }, 5000); // 300ms delay between each addition
        });
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-md-3 col-sm-12">
                    <Sidebar
                        layers={layers}
                        onAddEntity={addEntityToLayer}
                        onRemoveEntity={removeEntityFromLayer}
                        onToggleLayerVisibility={toggleLayerVisibility}
                        onAddLayer={addNewLayer}
                        onRemoveLayer={handleRemoveLayer}
                        onForceRender={handleForceRender}
                    />
                </div>
                <div className="col-md-9 col-sm-12" style={{ height: "100vh" }}>
                    <MapComponent layers={layers} />
                </div>
            </div>
        </div>
    );
}

export default App;

