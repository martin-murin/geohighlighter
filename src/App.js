import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';

function App() {
    const [countries, setCountries] = useState([]);

    const addCountry = (country) => {
        if (!countries.includes(country)) {
            setCountries([...countries, country]);
        }
    };

    const removeCountry = (countryToRemove) => {
        setCountries(countries.filter(c => c !== countryToRemove));
    };

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-md-3 col-sm-12">
                    <Sidebar countries={countries} onAddCountry={addCountry} onRemoveCountry={removeCountry} />
                </div>
                <div className="col-md-9 col-sm-12" style={{ height: "100vh" }}>
                    <MapComponent countries={countries} />
                </div>
            </div>
        </div>
    );
}

export default App;

