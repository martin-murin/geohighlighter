import React from 'react';
import CountryInput from './CountryInput';
import HighlightedCountriesList from './HighlightedCountriesList';

const Sidebar = ({ countries, onAddCountry, onRemoveCountry, onForceRender, onToggleVisibility, layersVisible}) => {
    return (
        <div className="p-3 col-sm-12">
            <h3>Highlighted Countries</h3>
            <CountryInput onAddCountry={onAddCountry} />
            <HighlightedCountriesList countries={countries} onRemoveCountry={onRemoveCountry} />
            <button className="btn btn-primary col-sm-4 mt-2 mx-2" onClick={onToggleVisibility}>{layersVisible ? 'Hide Layers' : 'Show Layers'}</button>
            <button className="btn btn-primary col-sm-4 mt-2 mx-2" onClick={onForceRender}>Render All</button>
        </div>
    );
};

export default Sidebar;
