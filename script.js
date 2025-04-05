// Array of years corresponding to our GeoJSON files
const years = [1850, 1931, 1973, 2010, 2016];
// Mapping each year to its corresponding GeoJSON file path
const glacierData = {
  1850: 'data/1850.geojson',
  1931: 'data/1931.geojson',
  1973: 'data/1973.geojson',
  2010: 'data/2010.geojson',
  2016: 'data/2016.geojson'
};

// Initialize the Leaflet map
const map = L.map('map-container', {
  dragging: false, // Disable dragging
  scrollWheelZoom: false, // Disable zooming with the scroll wheel
  doubleClickZoom: false, // Disable double-click zoom
  boxZoom: false, // Disable box zoom
  keyboard: false, // Disable keyboard navigation
  zoomControl: false // Disable zoom controls
}).setView([46.8, 8.2], 8); // Centered on Switzerland

// Add an OpenStreetMap basemap
const osmBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Add a second basemap (optional, e.g., a satellite basemap)
const satelliteBasemap = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  attribution: '&copy; Google Maps',
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

// Create an SVG layer on top of the Leaflet map
const svgLayer = d3.select(map.getPanes().overlayPane).append("svg");
const g = svgLayer.append("g").attr("class", "leaflet-zoom-hide");

// Define a geographic path generator using Leaflet's projection
const path = d3.geoPath().projection(d3.geoTransform({
  point: function (x, y) {
    const point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }
}));

// Variable to store the 1850 bounds
let lockedBounds;

// Variable to store the 1850 glacier area
let area1850 = null;

// Create a custom Leaflet layer for the glacier extent
const glacierLayer = L.layerGroup().addTo(map);

// Path to the basin GeoJSON file
const basinDataPath = 'data/basin.geojson';

// Function to render the basin mask
function renderBasinMask() {
    d3.json(basinDataPath).then(basinData => {
      console.log("Loaded Basin Data:", basinData);
  
      // Create the mask definition
      const defs = svgLayer.append("defs");
      const mask = defs.append("mask").attr("id", "basin-mask");
  
      // Add a large rectangle to cover the entire map
      mask.append("rect")
        .attr("x", -10000) // Large enough to cover the map
        .attr("y", -10000)
        .attr("width", 20000)
        .attr("height", 20000)
        .attr("fill", "white");
  
      // Use the basin polygon shape as the mask
      mask.append("path")
        .attr("d", path(basinData)) // Use the basin polygon's path
        .attr("fill", "black"); // The basin area will be visible
  
      // Apply the mask to the basemap
      d3.select(map.getPanes().overlayPane)
        .attr("mask", "url(#basin-mask)");
    }).catch(error => {
      console.error("Error loading basin data:", error);
    });
  }

// Function to load and render GeoJSON data
function renderGlacier(year) {
    d3.json(glacierData[year]).then(data => {
      console.log(`Loaded GeoJSON for year ${year}:`, data);
  
      // If the year is 1850, calculate and lock the bounds
      if (year === 1850 && !lockedBounds) {
        const bounds = d3.geoBounds(data);
        lockedBounds = [
          [bounds[0][1], bounds[0][0]], // Southwest corner
          [bounds[1][1], bounds[1][0]]  // Northeast corner
        ];
        map.fitBounds(lockedBounds); // Fit the map to the 1850 bounds
      }
  
    // If the year is 1850, calculate and store the total area
    if (year === 1850 && area1850 === null) {
        const totalArea1850 = data.features.reduce((sum, feature) => {
          return sum + turf.area(feature); // Turf.js calculates area in square meters
        }, 0);
        area1850 = totalArea1850 / 1e6; // Convert to square kilometers
      }

    // Clear the existing glacier paths from the custom layer
    glacierLayer.clearLayers();

    // Bind the GeoJSON data to path elements
    const glacierPath = g.selectAll("path").data(data.features);

    // Update existing paths
    glacierPath
      .attr("d", path)
      .attr("fill", "steelblue")
      .attr("stroke", "#333");

    // Enter new paths if none exist
    glacierPath.enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "steelblue")
      .attr("stroke", "#333");

    // Remove old paths
    glacierPath.exit().remove();

    // Add the SVG layer to the custom Leaflet layer
    const svgOverlay = L.svgOverlay(svgLayer.node(), map.getBounds());
    glacierLayer.addLayer(svgOverlay);

    // Calculate the total area of the glacier polygons for the current year
    const totalArea = data.features.reduce((sum, feature) => {
      return sum + turf.area(feature); // Turf.js calculates area in square meters
    }, 0);

    // Convert the area to square kilometers
    const totalAreaKm2 = (totalArea / 1e6).toFixed(2);

    // Update the total area display
    d3.select("#areaValue").text(totalAreaKm2);

    // Calculate the change since 1850
    const changeSince1850 = area1850 !== null ? (totalAreaKm2 - area1850).toFixed(2) : "0.00";

    // Update the change since 1850 display
    d3.select("#changeValue").text(changeSince1850);
  });
}

// Call the function to render the basin mask
renderBasinMask();

// Initially render the first year (1850)
renderGlacier(1850);

// Update visualization when the slider value changes
d3.select("#yearSlider").on("input", function () {
  const yearIndex = +this.value;
  const selectedYear = years[yearIndex];

  // Update the label to show the selected year
  d3.select("#yearLabel").text(selectedYear);

  // Render the glacier extent for the selected year
  renderGlacier(selectedYear);

  // Lock the map to the 1850 bounds
  if (lockedBounds) {
    map.fitBounds(lockedBounds);
  }
});

d3.select(map.getPanes().overlayPane)
  .attr("mask", "url(#basin-mask)");

// Update the SVG layer position and size on map events
map.on("moveend", updateMap);
map.on("zoomend", updateMap);

function updateMap() {
  const bounds = map.getBounds();
  const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());
  const bottomRight = map.latLngToLayerPoint(bounds.getSouthEast());

  svgLayer
    .attr("width", bottomRight.x - topLeft.x)
    .attr("height", bottomRight.y - topLeft.y)
    .style("left", `${topLeft.x}px`)
    .style("top", `${topLeft.y}px`);

  g.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);
  g.selectAll("path").attr("d", path); // Recalculate paths
}

// Add a layer toggle control
const baseMaps = {
  "OpenStreetMap": osmBasemap,
  "Satellite": satelliteBasemap
};

const overlayMaps = {
  "Glacier Extent": glacierLayer
};

L.control.layers(baseMaps, overlayMaps).addTo(map);