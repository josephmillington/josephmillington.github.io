/**
 * Module: script.js
 *
 * This script provides functionality for visualizing glacier data over time using MapLibre GL JS and D3.js.
 * It includes features for rendering glacier data, updating visualizations, and interacting with the map.
 *
 * Features:
 * - Displays glacier data for multiple years using vector tiles and GeoJSON.
 * - Allows users to interact with the map via a year slider and glacier ID selector.
 * - Dynamically updates visualizations, including a stacked bar chart and retreat rate chart.
 * - Supports zooming and panning, with dynamic adjustments to line weights based on zoom level.
 * - Calculates and displays glacier area changes over time using Turf.js.
 *
 * Requirements:
 * - MapLibre GL JS for map rendering.
 * - D3.js for data-driven visualizations.
 * - Turf.js for geographic calculations (e.g., area).
 * - Vector tiles and GeoJSON files for glacier data.
 *
 * Usage:
 * 1. Place this script in a directory with the required data files (e.g., GeoJSON and vector tiles).
 * 2. Ensure the HTML file includes the necessary containers (e.g., `#map-container`, `#stacked-bar`).
 * 3. Run a local server to serve the files (e.g., `node server.js`).
 * 4. Open the application in a browser to interact with the map and visualizations.
 *
 * Key Functions:
 * - `populateGlacierAreas(callback)`: Loads glacier data and calculates areas for each year.
 * - `renderGlacier(year, g)`: Renders glacier data for a specific year.
 * - `updatePaths(selection, data, className, fill, stroke, strokeWidth)`: Updates SVG paths dynamically.
 * - `updateStackedBar(currentYearIndex)`: Updates the stacked bar chart for glacier area proportions.
 * - `updateRetreatRateChart(currentYearIndex)`: Updates the retreat rate chart for annual glacier retreat rates.
 * - `zoomToGlaciers(mainId)`: Zooms the map to a specific glacier based on its ID.
 *
 * Notes:
 * - The script assumes the availability of GeoJSON files and vector tiles for the specified years.
 * - Ensure the `glacierData` and `years` arrays are updated to match the available data.
 */


// TODO: handle positive retreat rates (i.e., growth)

// To run Local Server on Windows:

// cd C:\Users\joemi\Documents\GitHub\josephmillington.github.io
// node server.js




const baseUrl = `${window.location.origin}`;

const defaultYear = 1850;

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

// Define the dimensions of the SVG container
const width = 800;
const height = 600;

// MAPLIBREGL
const map = new maplibregl.Map({
  container: 'map-container',
  style: {
    version: 8,
    sources: {
      glaciers: {
        type: 'vector',
        tiles: [`${baseUrl}/tiles/${defaultYear}/{z}/{x}/{y}.pbf`],
        minzoom: 0,
        maxzoom: 11
      }
    },
    layers: [
      {
        id: 'glaciers',
        type: 'fill',
        source: 'glaciers',
        'source-layer': 'glaciers',
        paint: {
          'fill-color': '#C8E9E9',
          'fill-outline-color': '#333'
        }
      }
    ]
  },
  center: [8.2, 46.8],
  zoom: 11
});

// Wait for the map's style to load before adding layers
map.on('style.load', () => {
  console.log('Map style has loaded.');

  // Add the blank layer after the style has loaded
  map.addLayer({
    id: 'blank-layer',
    type: 'fill',
    source: {
      type: 'vector',
      tiles: [`${baseUrl}/tiles/empty/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 11
    },
    'source-layer': 'geojsonLayer', // Replace 'blank' with the actual source-layer name
    paint: {
      'fill-color': '#ffffff',
      'fill-opacity': 0
    }
  });

  console.log('Blank layer added successfully.');
});


// Log tile requests
map.on('dataloading', (e) => {
  if (e.tile && e.tile.url) {
    console.log(`Requesting tile: ${e.tile.url}`);
  } else {
    console.log('No tile URL found in dataloading event, loading blank tile.');
  }
});

map.on('data', (e) => {
  if (e.dataType === 'source' && e.sourceId === 'glaciers') {
    console.log('Glaciers layer successfully loaded.');
  }
});

map.on('error', (e) => {
  if (e.error && e.error.status === 404) {
      console.warn(`Tile not found: ${e.tile?.url || 'Unknown URL'}`);
      // Optionally, handle the missing tile here
  } else if (e.error) {
      console.error('MapLibre error:', e.error.message || e.error);
  } else {
      console.error('Unknown MapLibre error:', e);
  }
});




// Define a geographic projection
const projection = d3.geoMercator()
  .scale(5000) // Adjust the scale as needed
  .translate([width / 2, height / 2]); // Center the projection in the SVG

// Define a geographic path generator using the projection
const path = d3.geoPath().projection(projection);

// Create an SVG container
const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Append a group element to the SVG
const g = svg.append("g");








let currentZoomLevel = 1; // Default zoom level
let lockedBounds; // Variable to store the 1850 bounds
let area1850 = null; // Variable to store the 1850 glacier area
let selectedGlacierId = null; // Default to no selection
let currentYearIndex = 0 // Default to the first year in the dataset

const glacierAreas = []; // Prepare an array to store glacier areas for each year


// Handle line weight with zoom level
const zoom = d3.zoom()
  .scaleExtent([1, 8]) // Set zoom limits
  .on("zoom", (event) => {
    currentZoomLevel = event.transform.k; // Store the current zoom level
    g.attr("transform", event.transform); // Apply zoom and pan transformations

    // Dynamically adjust the stroke width of all paths
    g.selectAll("path").attr("stroke-width", 1 / currentZoomLevel);

    // Log the current zoom level to the console
    console.log(`Current zoom level: ${currentZoomLevel}`);
  });





function populateGlacierAreas(callback) {
  /**
   * Populates the `glacierAreas` array with glacier area data for each year.
   *
   * This function loads GeoJSON data for each year, calculates the total glacier area
   * using Turf.js, and stores the results (in square kilometers) in the `glacierAreas` array.
   * Once all data is processed, it optionally executes a callback function.
   *
   * @param {Function} [callback] - An optional callback function to execute after all glacier areas are populated.
   */
  console.log("populateGlacierAreas function called"); // Debugging log

  // Clear the glacierAreas array
  glacierAreas.length = 0;


  // Load GeoJSON data for each year and calculate the glacier area
  const promises = years.map(year => {
    console.log(`Loading GeoJSON for year: ${year}`); // Debugging log
    return d3.json(glacierData[year]).then(data => {
      console.log(`GeoJSON loaded for year: ${year}`, data); // Debugging log

      // Use Turf.js to calculate the total area in square meters
      const totalArea = data.features.reduce((sum, feature) => {
        return sum + turf.area(feature); // Turf.js calculates area in square meters
      }, 0);

      // Store the year and area (converted to square kilometers)
      glacierAreas.push({ year, area: totalArea / 1e6 }); // Convert from m² to km²
    }).catch(error => {
      console.error(`Error loading GeoJSON for year: ${year}`, error); // Debugging log
    });
  });


  // Wait for all data to be loaded and processed
  Promise.all(promises).then(() => {
    console.log("All GeoJSON data loaded and processed"); // Debugging log
    console.log("Glacier areas:", glacierAreas); // Debugging log
    glacierAreas.sort((a, b) => a.year - b.year);

    if (callback) callback();
  }).catch(error => {
    console.error("Error in Promise.all:", error); // Debugging log
  });
}


// Funtion to update the change per year display
function updateChangePerYearDisplay(currentYearIndex) {
  /**
   * Updates the display for the annual rate of change in glacier area.
   *
   * This function calculates the annual rate of change in glacier area (in km² per year)
   * and the percentage change between the current year and the previous year. It then
   * updates the corresponding HTML elements with the calculated values.
   *
   * @param {number} currentYearIndex - The index of the current year in the `years` array.
   * @throws {Error} If `currentYearIndex` is out of bounds or if `glacierAreas` is not populated.
   */
    if (currentYearIndex > 0) {
      const currentYear = years[currentYearIndex];
      const previousYear = years[currentYearIndex - 1];
      const yearDifference = currentYear - previousYear;
  
      // Calculate the rate of change
      const currentArea = glacierAreas[currentYearIndex].area;
      const previousArea = glacierAreas[currentYearIndex - 1].area;
      const areaDifference = currentArea - previousArea;
      const rateOfChange = (areaDifference / yearDifference).toFixed(2); // km² per year
      const percentChange = ((areaDifference / previousArea) * 100).toFixed(2); // Percentage
  
      // Update the text content dynamically
      d3.select("#change-per-year strong")
        .text(`Annual Rate of Change (${previousYear} to ${currentYear}):`);
      d3.select("#changePerYearValue").text(rateOfChange);
      d3.select("#changePerYearPercent").text(percentChange);
    } else {
      // Handle the first year (no previous year)
      const firstYear = years[currentYearIndex];
      d3.select("#change-per-year strong")
        .text(`Annual Rate of Change (${firstYear}):`);
      d3.select("#changePerYearValue").text("0");
      d3.select("#changePerYearPercent").text("0");
    }
  }


function computeAreaKm2(data) {
  /**
   * Computes the total area in square kilometers from a GeoJSON data object.
   *
   * @param {Object} data - The GeoJSON data object.
   * @returns {number} The total area in square kilometers.
   */
  const totalArea = data.features.reduce((sum, feature) => sum + turf.area(feature), 0);
  return totalArea / 1e6;
}


function updatePaths(selection, data, className, fill, stroke, strokeWidth) {
  const paths = selection.data(data);
  /**
   * Updates the paths in an SVG element based on the provided data.
   *
   * This function uses D3.js to bind data to SVG path elements, creating new paths
   * for data that doesn't yet exist, updating existing paths, and removing outdated paths.
   *
   * @param {d3.Selection} selection - The D3 selection of the parent element to update.
   * @param {Array} data - The array of data to bind to the paths.
   * @param {string} className - The CSS class to apply to the path elements.
   * @param {string} fill - The fill color to apply to the paths.
   * @param {string} stroke - The stroke color to apply to the paths.
   * @param {number} strokeWidth - The stroke width to apply to the paths.
   */
  paths.enter() // Enter + Update: use the merge pattern (works in D3 v5+)
    .append("path")
    .attr("class", className)
    .merge(paths)
    .attr("d", path)
    .attr("fill", fill)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth);
  
  paths.exit().remove(); // Exit: remove outdated elements
}


async function renderGlacier(year, g) {
  /**
   * Renders the glacier data for a specific year.
   *
   * @async
   * @param {number} year - The year to render glacier data for.
   * @param {Object} g - The D3 group element to render the glaciers into.
   * @throws {Error} If there is an issue loading or rendering the data.
   */
  try {
    // Load current year GeoJSON
    const data = await d3.json(glacierData[year]);
    console.log(`Loaded GeoJSON for year ${year}:`, data);

    // For year 1850, calculate and lock bounds and area if not done yet
    if (year === 1850) {
      if (!lockedBounds) {
        const bounds = d3.geoBounds(data);
        lockedBounds = [
          [bounds[0][1], bounds[0][0]], // SW corner
          [bounds[1][1], bounds[1][0]]  // NE corner
        ];
      }
      if (area1850 === null) {
        area1850 = computeAreaKm2(data);
      }
    }

    console.log(`Locked bounds for year 1850:`, lockedBounds);

    // Clear existing glacier paths
    g.selectAll("path").remove();

    // Use updatePaths to render glacier paths
    updatePaths(
      g.selectAll("path"),
      data.features,
      "glacier-path",
      d => d.properties['sgi-id'] === selectedGlacierId ? "#ffa196" : "#C8E9E9", // Fill color
      "#333", // Stroke color
      1 / currentZoomLevel // Stroke width
    );

    // Update area calculations and display for the current year
    const currentAreaKm2 = computeAreaKm2(data).toFixed(2);
    d3.select("#areaValue").text(currentAreaKm2);

    // Calculate change since 1850 (if available)
    const changeSince1850 = area1850 !== null
      ? (currentAreaKm2 - area1850).toFixed(2)
      : "0.00";
    d3.select("#changeValue").text(changeSince1850);

    // Calculate change per year compared to the previous year
    const currentYearIndex = years.indexOf(year);
    if (currentYearIndex > 0) {
      const previousYear = years[currentYearIndex - 1];
      const prevData = await d3.json(glacierData[previousYear]);
      const prevAreaKm2 = computeAreaKm2(prevData);
      const yearDifference = year - previousYear;
      const absoluteChangePerYear = ((currentAreaKm2 - prevAreaKm2) / yearDifference).toFixed(2);
      const relativeChangePerYear = ((absoluteChangePerYear / prevAreaKm2) * 100).toFixed(2);

      d3.select("#changePerYearValue").text(absoluteChangePerYear);
      d3.select("#changePerYearPercent").text(relativeChangePerYear);
    } else {
      d3.select("#changePerYearValue").text("0");
      d3.select("#changePerYearPercent").text("0");
    }
  } catch (error) {
    console.error("Error rendering glacier data:", error);
  }
}


function zoomToGlaciers(mainId) {
  /**
   * Zooms the map to the glaciers with the specified main ID.
   *
   * This function filters the glacier features based on the provided main ID,
   * calculates the bounding box of the matching features, and applies a zoom
   * transformation to center and scale the map to fit the glaciers.
   *
   * @param {string} mainId - The main ID of the glaciers to zoom to.
   * @throws {Error} If no glaciers are found with the specified main ID.
   */
  const matchingFeatures = g.selectAll("path") // Filter features with the same main ID
    .filter(d => d.properties['sgi-id'].split('-')[0] === mainId);

  if (!matchingFeatures.empty()) {
    // Calculate the bounding box of the matching features
    const [[x0, y0], [x1, y1]] = d3.geoPath(projection).bounds({
      type: "FeatureCollection",
      features: matchingFeatures.data()
    });

    // Calculate the scale and translate for zooming
    const scale = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
    const translate = [(width - scale * (x0 + x1)) / 2, (height - scale * (y0 + y1)) / 2];

    // Apply the zoom transformation
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  } else {
    console.warn(`No glaciers found with ID: ${mainId}`);
  }
}


// Function to create the stacked bar chart
function updateStackedBar(currentYearIndex) {
  /**
   * Updates the stacked bar chart to visualize the proportion of glacier area lost and remaining.
   *
   * This function calculates the proportions of glacier area lost and remaining for the selected year
   * relative to the glacier area in 1850. It then dynamically updates the stacked bar chart to reflect
   * these proportions.
   *
   * @param {number} currentYearIndex - The index of the current year in the `years` array.
   * @throws {Error} If the proportions are invalid (e.g., NaN or undefined).
   */
  const svg = d3.select("#stacked-bar");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  // Clear any existing bars
  svg.selectAll("*").remove();

  // Get the glacier area for the current year and 1850
  const currentArea = glacierAreas[currentYearIndex]?.area || 0;
  const remainingProportion = area1850 ? currentArea / area1850 : 0;
  const lostProportion = 1 - remainingProportion;

  // Ensure proportions are valid numbers
  if (isNaN(remainingProportion) || isNaN(lostProportion)) {
    console.error("Invalid proportions for stacked bar chart");
    return;
  }

  // Define the bar segments
  const segments = [
    { proportion: lostProportion, color: "#ffa196" }, // Lost glacier area
    { proportion: remainingProportion, color: "#C8E9E9" } // Remaining glacier area
  ];

  // Create the stacked bar
  let xOffset = 0;
  svg.selectAll("rect")
    .data(segments)
    .enter()
    .append("rect")
    .attr("x", d => {
      const x = xOffset;
      xOffset += d.proportion * width;
      return x;
    })
    .attr("y", 0)
    .attr("width", d => d.proportion * width)
    .attr("height", height)
    .attr("fill", d => d.color);
}


function updateRetreatRateChart(currentYearIndex) {
  /**
   * Updates the retreat rate chart to visualize the annual glacier retreat rates.
   *
   * This function calculates the annual retreat rates (in km² per year) for each time period
   * between consecutive years and dynamically updates the retreat rate chart to reflect these values.
   * It highlights the bar corresponding to the currently selected year.
   *
   * @param {number} currentYearIndex - The index of the current year in the `years` array.
   */
  const svg = d3.select("#retreat-rate-chart");
  const width = +svg.attr("width");

  // Clear any existing bars
  svg.selectAll("*").remove();

  // Calculate the retreat rates for each time period, starting from the second year
  const retreatRates = glacierAreas.slice(1).map((current, index) => {
    const previous = glacierAreas[index]; // Compare with the previous year
    const yearDifference = current.year - previous.year;
    const areaDifference = previous.area - current.area;
    const rate = (areaDifference / yearDifference).toFixed(2); // Retreat rate (km²/year)
    return { year: current.year, rate: Math.max(0, rate) }; // Ensure the rate is non-negative
  });

  // Define the bar height and spacing
  const barHeight = 20;
  const barSpacing = 10;

  // Define the maximum retreat rate for scaling
  const maxRate = d3.max(retreatRates, d => +d.rate);

  // Create a scale for the bar widths
  const xScale = d3.scaleLinear()
    .domain([0, maxRate])
    .range([0, width - 100]); // Leave space for labels

  // Create the bars
  svg.selectAll("rect")
    .data(retreatRates)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * (barHeight + barSpacing))
    .attr("width", d => xScale(+d.rate)) // Use the clamped rate
    .attr("height", barHeight)
    .attr("fill", (d, i) => i + 1 === currentYearIndex ? "#ffa196" : "#C8E9E9"); // Highlight the selected year

  // Add labels for the retreat rates
  svg.selectAll("text")
    .data(retreatRates)
    .enter()
    .append("text")
    .attr("x", d => xScale(+d.rate) + 5) // Position the label to the right of the bar
    .attr("y", (d, i) => i * (barHeight + barSpacing) + barHeight / 2 + 5)
    .attr("fill", "#000")
    .style("font-size", "12px")
    .text(d => `${d.rate} km² per year`);

  // Add year labels to the left of the bars
  svg.selectAll(".year-label")
    .data(retreatRates)
    .enter()
    .append("text")
    .attr("x", -5) // Position the label to the left of the bar
    .attr("y", (d, i) => i * (barHeight + barSpacing) + barHeight / 2 + 5)
    .attr("text-anchor", "end")
    .attr("fill", "#000")
    .style("font-size", "12px")
    .text(d => d.year);
}


function populateIdSelector() {
  /**
   * Populates the dropdown selector with unique glacier IDs.
   *
   * This function iterates through all GeoJSON files for each year, extracts unique glacier IDs
   * (based on the `sgi-id` property), and populates a dropdown menu with these IDs.
   *
   * @throws {Error} If there is an issue loading or processing the GeoJSON data.
   */
  const idSet = new Set(); // Use a Set to store unique IDs
  
  // Iterate through all GeoJSON files
  const promises = years.map(year => {
    return d3.json(glacierData[year]).then(data => {
      data.features.forEach(feature => {
        const sgiId = feature.properties['sgi-id']; // Get the 'sgi-id' field
        if (sgiId) {
          // Extract the main ID (before the '-')
          const mainId = sgiId.split('-')[0];
          idSet.add(mainId); // Add the main ID to the Set
        }
      });
    });
  });
  
  // Once all data is loaded, populate the dropdown
  Promise.all(promises).then(() => {
    const idSelector = d3.select("#idSelector");
  
    // Add an option for each unique ID
    Array.from(idSet).sort().forEach(id => {
      idSelector.append("option")
        .attr("value", id)
        .text(id);
    });
  
    console.log("Dropdown populated with IDs:", Array.from(idSet));
  });
}






d3.select("#idSelector").on("change", function () {
  selectedGlacierId = this.value;
  console.log(`Selected glacier ID: ${selectedGlacierId}`);

  if (!selectedGlacierId || selectedGlacierId === "All IDs") {
    if (lockedBounds) {
      // Reset the zoom to the extent of the 1850 data
      const [[x0, y0], [x1, y1]] = lockedBounds;
      const scale = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
      const translate = [(width - scale * (x0 + x1)) / 2, (height - scale * (y0 + y1)) / 2];

      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
      console.log("Reset zoom to the extent of the 1850 data.");
    } else {
      console.warn("Locked bounds for 1850 data are not available.");
    }
  } else {
    // Highlight the selected glacier
    map.setPaintProperty('glaciers', 'fill-color', [
      'case',
      ['==', ['get', 'sgi-id'], selectedGlacierId],
      '#ffa196',
      '#C8E9E9'
    ]);

    // Zoom to the selected glacier
    zoomToGlaciers(selectedGlacierId);
  }
});



// Update visualization when the slider value changes
d3.select("#yearSlider").on("input", function () {
  currentYearIndex = +this.value;
  const selectedYear = years[currentYearIndex];

  // Update the label to show the selected year
  d3.select("#yearLabel").text(selectedYear);

  // Update the vector tile source to show the selected year's data
  map.getSource('glaciers').setTiles([`${baseUrl}/tiles/${selectedYear}/{z}/{x}/{y}.pbf`]);
  console.log(`Updated tile source to: ${baseUrl}/tiles/${selectedYear}/{z}/{x}/{y}.pbf`);

  updateChangePerYearDisplay(currentYearIndex);
  updateStackedBar(currentYearIndex);
  updateRetreatRateChart(currentYearIndex);

});


populateIdSelector();
  
populateGlacierAreas(() => {
  renderGlacier(1850, g); // Initially render the first year (1850)
  updateStackedBar(currentYearIndex); // Update the stacked bar chart
  updateRetreatRateChart(currentYearIndex); // Update the retreat rate chart
});

