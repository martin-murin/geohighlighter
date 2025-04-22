import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import './IconPicker.css';
import iconList from '../iconList.json';

// Common icon base names (only those existing in iconFiles)
const COMMON_BASES = [
  'geo-alt-fill','geo-alt','pin-map-fill','pin-map',
  'star-fill','star','circle-fill','circle',
  'flag-fill','flag','heart-fill','heart',
  'house-fill','house','compass-fill','compass','globe'
];
// Filter only existing common icons
const COMMON_ICONS = COMMON_BASES.filter(base => iconList.includes(base)).map(base => `bi bi-${base}`);

// Build list of all icons from manifest
const ALL_ICONS = iconList.map(baseName => {
  const name = baseName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  return { baseName, name, className: `bi bi-${baseName}` };
});

function IconPicker({ currentIcon, onSelect }) {
  const [show, setShow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Filter by search term
  const filteredIcons = ALL_ICONS.filter(({ name, className }) =>
    name.toLowerCase().includes(searchTerm.toLowerCase()) || className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpen = () => setShow(true);
  const handleClose = () => setShow(false);
  const handleSelect = className => {
    onSelect(className);
    handleClose();
  };

  return (
    <>
      <Button variant="light" size="sm" onClick={handleOpen}>
        {currentIcon ? <i className={currentIcon} style={{ fontSize: '1.2rem' }} /> : <span>?</span>}
      </Button>
      <Modal show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select Marker Icon</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Commonly Used</h6>
          <div className="icon-picker-grid common-icons-grid">
            {COMMON_ICONS.map(cls => (
              <div key={cls} className="icon-picker-item text-center" onClick={() => handleSelect(cls)}>
                <i className={cls} style={{ fontSize: '1.5rem' }} />
              </div>
            ))}
          </div>
          <hr />
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Search icons..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="icon-picker-grid">
            {filteredIcons.map(({ className, name }) => (
              <div key={className} className="icon-picker-item text-center" onClick={() => handleSelect(className)}>
                <i className={className} style={{ fontSize: '1.5rem' }} />
                <div className="icon-name" style={{ fontSize: '0.75rem' }}>{name}</div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default IconPicker;
