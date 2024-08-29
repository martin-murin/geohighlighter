import React, { useState } from 'react';

const CountryInput = ({ onAddCountry }) => {
    const [countryName, setCountryName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (countryName.trim()) {
            onAddCountry(countryName.trim());
            setCountryName(''); // Clear the input after adding
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-3">
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Enter country name"
                    value={countryName}
                    onChange={(e) => setCountryName(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Add</button>
            </div>
        </form>
    );
};

export default CountryInput;
