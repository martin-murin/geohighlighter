import React from 'react';
import reactCSS from 'reactcss';
import ReactDOM from 'react-dom';
import { SketchPicker } from 'react-color';

class ColorPicker extends React.Component {
  constructor(props) {
    super(props);
    this.swatchRef = React.createRef();
    this.state = {
      displayColorPicker: false,
      popoverPosition: { top: 0, left: 0 },
      color: props.color ? props.color.rgb : { r: 0, g: 0, b: 0, a: 0.2 },
    };
  }

  // Update internal state when new color is passed from parent
  componentDidUpdate(prevProps) {
    if (prevProps.color !== this.props.color && this.props.color) {
      this.setState({ color: this.props.color.rgb });
    }
  }

  handleClick = () => {
    if (!this.state.displayColorPicker && this.swatchRef.current) {
      const rect = this.swatchRef.current.getBoundingClientRect();
      this.setState({
        displayColorPicker: true,
        popoverPosition: { top: rect.bottom, left: rect.left },
      });
    } else {
      this.setState({ displayColorPicker: false });
    }
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
        background: '#fff',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
        display: 'inline-block',
        cursor: 'pointer',
        border: '1px solid #000', // Solid border for fill
        width: '16px', // compact square
        height: '16px',
      },
      color: {
        background: `rgba(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b}, ${this.state.color.a})`,
        width: '100%',
        height: '100%',
      },
      popover: {
        position: 'absolute', // use fixed to avoid overflow clipping
        zIndex: 2,
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
        background: '#fff',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
        display: 'inline-block',
        cursor: 'pointer',
        border: '1px dashed #333', // Dashed border for the border picker
        width: '16px', // compact square
        height: '16px',
      },
      color: {
        background: `rgba(${this.state.color.r}, ${this.state.color.g}, ${this.state.color.b}, ${this.state.color.a})`,
        width: '100%',
        height: '100%',
      },
      popover: {
        position: 'fixed',
        zIndex: 2000,
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
        <div ref={this.swatchRef} style={styles.swatch} onClick={this.handleClick}>
          <div style={styles.color} />
        </div>
        {this.state.displayColorPicker && ReactDOM.createPortal(
          <div style={{ position: 'fixed', top: this.state.popoverPosition.top + 'px', left: this.state.popoverPosition.left + 'px', zIndex: 9999 }}>
            <div style={styles.cover} onClick={this.handleClose} />
            <SketchPicker color={this.state.color} onChange={this.handleChange} />
          </div>,
          document.body
        )}
      </div>
    );
  }
}

export default ColorPicker;
