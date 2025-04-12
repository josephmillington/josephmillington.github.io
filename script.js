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


let selectedStateId = null; // Track the currently selected glacier

// Define the base URL for the tiles and the default year
// const baseUrl = `${window.location.origin}`;
const defaultYear = 1850;

// Array of years corresponding to the GeoJSON data
const years = [1850, 1931, 1973, 2010, 2016];

// Mapping each year to its corresponding GeoJSON file path
const glacierData = {
  1850: 'data/1850.geojson',
  1931: 'data/1931.geojson',
  1973: 'data/1973.geojson',
  2010: 'data/2010.geojson',
  2016: 'data/2016.geojson'
};

// Initialize the MapLibre map
const map = new maplibregl.Map({
  container: 'map-container',
  style: {
    version: 8,
    sources: {
      glaciers: {
        type: 'geojson',
        data: glacierData[defaultYear] // Load the default year's data
      }
    },
    layers: [
      {
        id: 'glaciers-layer',
        type: 'fill',
        source: 'glaciers',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#0056b3', // Darker blue for selected glaciers
            '#C8E9E9'  // Default glacier color
          ],
          'fill-outline-color': '#333'
        }
      }
    ]
  },
  center: [8.2, 46.8], // Adjust to your map's center
  zoom: 6
});



// CALCULATE AREAS //

// Helper to compute total area in km² from a GeoJSON data object
function computeAreaKm2(data) {
  const totalArea = data.features.reduce((sum, feature) => sum + turf.area(feature), 0)
  return (totalArea / 1e6).toFixed(2);
}

// Function to update the HTML element with the computed area
function displayTotalGlacierArea(geojsonData) {
  // Compute the total glacier area in km²
  const totalAreaKm2 = computeAreaKm2(geojsonData);
  // Update the element with id 'areaValue' with the computed area
  document.getElementById('areaValue').innerText = totalAreaKm2;
}











// Prepare an array to store glacier areas for each year
const glacierAreas = [];

function populateGlacierAreas(callback) {
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





// STACKED BAR CHART //

let currentYearIndex = 0 // Default to the first year in the dataset

// Function to create the stacked bar chart
function updateStackedBar(currentYearIndex) {
  const svg = d3.select("#stacked-bar");
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  // Clear any existing bars
  svg.selectAll("*").remove();

  // Get the glacier area for the current year and 1850
  const area1850 = glacierAreas[0]?.area || 0; // Get the area for 1850
  const currentArea = glacierAreas[currentYearIndex]?.area || 0;
  const remainingProportion = area1850 ? currentArea / area1850 : 0;
  const lostProportion = 1 - remainingProportion;

  console.log("Current area:", currentArea); // Debugging log
  console.log("Remaining proportion:", remainingProportion); // Debugging log
  console.log("Lost proportion:", lostProportion); // Debugging log

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













// Populate the dropdown selector with glacier IDs
function populateIdSelector() {
  const idSet = new Set();

  // Query features from the source to extract unique glacier IDs
  const features = map.querySourceFeatures('glaciers');
  features.forEach((feature) => {
    const glacierId = feature.properties['sgi-id'];
    if (glacierId) {
      // Extract the part of the ID until a letter follows a digit
      const simplifiedId = glacierId.match(/^[A-Za-z]*\d+/)?.[0];
      if (simplifiedId) {
        idSet.add(simplifiedId);
      }
    }
  });

  // Populate the dropdown
  const idSelector = document.getElementById('idSelector');
  idSelector.innerHTML = ''; // Clear existing options
  const allOption = document.createElement('option');
  allOption.value = 'All';
  allOption.textContent = 'All Glaciers';
  idSelector.appendChild(allOption);

  Array.from(idSet).sort().forEach((id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = id;
    idSelector.appendChild(option);
  });
}

// Zoom to the selected glacier
function zoomToGlacier(glacierId) {
  if (glacierId === 'All') {
    // Reset to the full extent of the default year's data
    map.fitBounds(map.getBounds(), {
      padding: 50,
      maxZoom: 11,
      duration: 1000
    });
    return;
  }

  // Preprocess the features to extract simplified IDs
  const features = map.querySourceFeatures('glaciers');
  const matchingFeatures = features.filter((feature) => {
    const fullId = feature.properties['sgi-id'];
    const simplifiedId = fullId.match(/^[A-Za-z]*\d+/)?.[0]; // Extract simplified ID
    return simplifiedId === glacierId; // Match against the selected glacier ID
  });

  if (matchingFeatures.length > 0) {
    // Calculate the bounding box of the matching features
    const bounds = matchingFeatures.reduce((bounds, feature) => {
      return bounds.extend(turf.bbox(feature));
    }, new maplibregl.LngLatBounds());

    // Zoom to the bounding box
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 14,
      duration: 1000
    });
  } else {
    console.warn(`No glacier found with ID: ${glacierId}`);
  }
}







populateGlacierAreas(() => {

  // Update the stacked bar chart
  updateStackedBar(currentYearIndex);

});











// Update the map when the slider value changes
document.getElementById('yearSlider').addEventListener('input', (event) => {
  const selectedYearIndex = parseInt(event.target.value, 10);
  const selectedYear = years[selectedYearIndex];

  // Update the displayed year in the UI
  document.getElementById('active-year').innerText = selectedYear;

  // Fetch the new GeoJSON data for the selected year
  fetch(glacierData[selectedYear])
    .then((response) => response.json())
    .then((data) => {
      // Assign unique IDs to features
      data.features.forEach((feature, index) => {
        feature.id = index; // Assign a unique ID to each feature
      });

      // Update the GeoJSON source with the new data
      const source = map.getSource('glaciers');
      if (source) {
        source.setData(data);
      } else {
        console.error('Glacier source not found.');
      }

      // Reset the selected glacier state
      if (selectedStateId !== null) {
        map.setFeatureState(
          { source: 'glaciers', id: selectedStateId },
          { selected: false }
        );
        selectedStateId = null;
      }

      // Update the dropdown with IDs for the selected year
      map.once('idle', () => {
        populateIdSelector();
      });

      // Calculate and display the total glacier area
      displayTotalGlacierArea(data);
    })
    .catch((error) => {
      console.error('Error loading GeoJSON data:', error);
    });

});






// Update visualization when the slider value changes
d3.select("#yearSlider").on("input", function () {
  currentYearIndex = +this.value; // Update the global variable
  const selectedYear = years[currentYearIndex];

  console.log("Selected year:", selectedYear); // Debugging log
  console.log("Current year index:", currentYearIndex); // Debugging log

  // Update the label to show the selected year
  d3.select("#yearLabel").text(selectedYear);

  // Update the stacked bar chart
  updateStackedBar(currentYearIndex);

});









// Handle dropdown selection
document.getElementById('idSelector').addEventListener('change', (event) => {
  const selectedGlacierId = event.target.value;
  zoomToGlacier(selectedGlacierId);
});

// Populate the dropdown on map load
map.on('load', () => {
  const source = map.getSource('glaciers');
  if (source) {
    // Fetch and parse the GeoJSON data
    fetch(glacierData[defaultYear])
      .then((response) => response.json())
      .then((data) => {
        // Add unique IDs to features
        data.features.forEach((feature, index) => {
          feature.id = index; // Assign a unique ID to each feature
        });
        source.setData(data);

        // Populate the dropdown with IDs for the default year
        populateIdSelector();
      })
      .catch((error) => {
        console.error('Error loading GeoJSON data:', error);
      });
  }
});

// Add click event listener for glaciers
map.on('click', 'glaciers-layer', (e) => {
  if (e.features && e.features.length > 0) {
    const clickedFeature = e.features[0];
    const featureId = clickedFeature.id; // Use the 'id' field from the vector tiles
    const glacierId = clickedFeature.properties['SGI']; // Use 'SGI' for user interaction

    console.log('Clicked glacier ID:', glacierId);
    console.log('Clicked feature ID:', featureId); // Log the feature ID

    if (featureId === undefined || featureId === null) {
      console.error('Feature ID is missing. Ensure each feature has a unique "id" property.');
      return;
    }

    // Reset the previously selected glacier's state
    if (selectedStateId !== null) {
      map.setFeatureState(
        { source: 'glaciers', id: selectedStateId },
        { selected: false }
      );
    }

    // Set the new selected glacier's state
    selectedStateId = featureId; // Track the currently selected feature ID
    map.setFeatureState(
      { source: 'glaciers', id: selectedStateId },
      { selected: true }
    );

    // Set the dropdown to the clicked glacier's ID
    const idSelector = document.getElementById('idSelector');
    idSelector.value = glacierId;

    // Calculate the bounding box of the clicked glacier
    const bounds = turf.bbox(clickedFeature);

    // Zoom to the glacier's extent
    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 14,
      duration: 1000
    });
  }
});

// Change cursor to pointer when hovering over glaciers
map.on('mouseenter', 'glaciers-layer', () => {
  map.getCanvas().style.cursor = 'pointer';
});

// Reset cursor when leaving glaciers
map.on('mouseleave', 'glaciers-layer', () => {
  map.getCanvas().style.cursor = '';
});