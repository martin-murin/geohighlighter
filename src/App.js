import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';

function App() {
    const [countries, setCountries] = useState([]);
    const [layersVisible, setLayersVisible] = useState(true);

    const addCountry = (country) => {
        if (!countries.includes(country)) {
            setCountries([...countries, country]);
        }
    };

    const removeCountry = (countryToRemove) => {
        setCountries(countries.filter(c => c !== countryToRemove));
    };

    const handleForceRender = () => {
        setCountries([]);

        // Re-add countries one by one with a slight delay
        countries.forEach((country, index) => {
            setTimeout(() => {
                setCountries(prevCountries => [...prevCountries, country]);
            }, index * 3000); // 300ms delay between each addition
        });
    };

    const handleToggleVisibility = () => {
        setLayersVisible(!layersVisible);
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-md-3 col-sm-12">
                    <Sidebar countries={countries} onAddCountry={addCountry} onRemoveCountry={removeCountry} onForceRender={handleForceRender} onToggleVisibility={handleToggleVisibility} layersVisible={layersVisible}/>
                </div>
                <div className="col-md-9 col-sm-12" style={{ height: "100vh" }}>
                    <MapComponent countries={countries} layersVisible={layersVisible} />
                </div>
            </div>
        </div>
    );
}

export default App;

