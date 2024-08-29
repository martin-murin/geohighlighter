import React from 'react';

const HighlightedCountriesList = ({ countries, onRemoveCountry }) => {
    return (
        <ul className="list-group">
            {countries.map((country, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                    {country}
                    <button className="btn btn-danger btn-sm" onClick={() => onRemoveCountry(country)}>
                        &times;
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default HighlightedCountriesList;

