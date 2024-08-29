import React from 'react';
import CountryInput from './CountryInput';
import HighlightedCountriesList from './HighlightedCountriesList';

const Sidebar = ({ countries, onAddCountry, onRemoveCountry }) => {
    return (
        <div className="p-3" style={{ width: '100%' }}>
            <h3>Highlighted Countries</h3>
            <CountryInput onAddCountry={onAddCountry} />
            <HighlightedCountriesList countries={countries} onRemoveCountry={onRemoveCountry} />
        </div>
    );
};

export default Sidebar;
