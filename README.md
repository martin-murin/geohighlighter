# Map Highlighter

Map Highlighter is a web application that allows users to create and manage custom map layers by adding entities, adjusting colors, and visualizing geographic data. The app is built with React and leverages the OpenStreetMap (OSM) API for fetching and displaying map entities.

## Features

- **Add Entities**: Search for and add map entities by name or OSM ID.
- **Customize Layers**: Create new layers, change the fill and border colors, and manage visibility.
- **Import/Export Layers**: Save your layers and entities to a JSON file and reload them later.
- **Persistent Map View**: Set and retain the initial map position and zoom level.
- **Responsive Design**: The app layout adjusts for different screen sizes.

## Installation

To run this application locally, follow these steps:

1. **Clone the repository**:

   ```bash
   git clone https://github.com/martin-murin/map-highlighter.git
   cd map-highlighter
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Run the app**:

   ```bash
   npm start
   ```

   The app should now be running on `http://localhost:3000`.

## Usage

1. **Create New Layer**: Use the input field at the bottom of the sidebar to create a new layer.
2. **Add Entities**: Add entities by searching by name or entering an OSM ID.
3. **Customize Layers**: Adjust colors and visibility directly from the sidebar.
4. **Import/Export Layers**: Use the provided buttons to save your layers as a JSON file or load them from an existing file.

## Folder Structure

- **src/components**: Contains the React components like `MapComponent`, `Sidebar`, and `LayerControls`.
- **public/layers_default.json**: The default layer configuration file.
- **src**: Main source code directory.

## License

This project is open-source and available under the [MIT License](LICENSE).

