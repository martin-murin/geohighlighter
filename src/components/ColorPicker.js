import React from 'react';
import reactCSS from 'reactcss';
import { SketchPicker } from 'react-color';

class ColorPicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      displayColorPicker: false,
      color: props.color ? props.color.rgb : { r: 0, g: 0, b: 0, a: 0.2 }, // Initialize with props.color
    };
  }

  // Update internal state when new color is passed from parent
  componentDidUpdate(prevProps) {
    if (prevProps.color !== this.props.color && this.props.color) {
      this.setState({ color: this.props.color.rgb });
    }
  }

  handleClick = () => {
    this.setState({ displayColorPicker: !this.state.displayColorPicker });
  };

  handleClose = () => {
    this.setState({ displayColorPicker: false });
  };

  handleChange = (color) => {
    this.setState({ color: color.rgb });
    if (this.props.onChange) {
      this.props.onChange(color); // Pass the selected color to the parent
    }
  };

  render() {
    const { pickerType } = this.props; // Assuming 'pickerType' is passed as a prop ('fill' or 'border')

    // Swatch styles for fill and border pickers
    const fillSwatchStyles = {
      swatch: {
        padding: '5px',
        background: '#fff',
        borderRadius: '1px',
        boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
        display: 'inline-block',
        cursor: 'pointer',
        border: '2px solid #000', // Solid border for fill
        width: '40px', // Larger size for fill
        height: '20px',
      },
      color: {
        background: `rgba(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b}, ${this.state.color.a})`,
        width: '100%',
        height: '100%',
      },
      popover: {
        position: 'absolute',
        zIndex: '2',
      },
      cover: {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
    };

    const borderSwatchStyles = {
      swatch: {
        padding: '5px',
        background: '#fff',
        borderRadius: '1px',
        boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
        display: 'inline-block',
        cursor: 'pointer',
        border: '2px dashed #333', // Dashed border for the border picker
        width: '40px', // Smaller size for border
        height: '16px',
      },
      color: {
        background: `rgba(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b}, ${this.state.color.a})`,
        width: '100%',
        height: '100%',
      },
      popover: {
        position: 'absolute',
        zIndex: '2',
      },
      cover: {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      },
    };

    const styles = reactCSS({
      'default': pickerType === 'fill' ? fillSwatchStyles : borderSwatchStyles,
    });

    return (
      <div>
        <div style={styles.swatch} onClick={this.handleClick}>
          <div style={styles.color} />
        </div>
        {this.state.displayColorPicker ? (
          <div style={styles.popover}>
            <div style={styles.cover} onClick={this.handleClose} />
            <SketchPicker color={this.state.color} onChange={this.handleChange} />
          </div>
        ) : null}
      </div>
    );
  }
}

export default ColorPicker;

