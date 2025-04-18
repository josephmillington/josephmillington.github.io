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

const basemapData = {
  'ne_10m_admin_0_countries': 'data/ne_10m_admin_0_countries.geojson',
  'ne_10m_admin_1_state_provinces': 'data/ne_10m_admin_1_state_provinces.geojson',
};

// Initialize the MapLibre map
const map = new maplibregl.Map({
  container: 'map-container',
  style: {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf', // Add glyphs URL
    sources: {
      glaciers: {
        type: 'geojson',
        data: glacierData[defaultYear] // Load the default year's data
      },
      countries: {
        type: 'geojson',
        data: basemapData['ne_10m_admin_0_countries'] // Country boundaries data
      },
      provinces: {
        type: 'geojson',
        data: basemapData['ne_10m_admin_1_state_provinces'] // State/province boundaries data
      }
    },
    layers: [
      {
        id: 'countries-layer',
        type: 'line', // Use line type for boundaries
        source: 'countries',
        paint: {
          'line-color': '#666', // Grey for country boundaries
          'line-width': 1
        }
      },

      {
        id: 'provinces-layer',
        type: 'line', // Use line type for boundaries
        source: 'provinces',
        paint: {
          'line-color': '#aaa', // Lighter grey for state/province boundaries
          'line-width': 0.5
        }
      },
      {
        id: 'provinces-labels', // Add province/state labels
        type: 'symbol',
        source: 'provinces',
        layout: {
          'text-field': ['get', 'name'], // Use the 'name' property from your GeoJSON
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 10, // Font size for province labels
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#555',
          'text-halo-color': '#FBFBF8',
          'text-halo-width': 2
        }
      },
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
  center: [8.6, 46.5], // Adjust to your map's center
  zoom: 7.5
});



// CALCULATE AREAS //

// Helper to compute total area in km² from a GeoJSON data object
//function computeAreaKm2(data) {
  //totalArea = data.features.reduce((sum, feature) => sum + turf.area(feature), 0)
  //return (totalArea / 1e6).toFixed(2);
//}

// Function to update the HTML element with the computed area
//function displayTotalGlacierArea(geojsonData) {
  // Compute the total glacier area in km²
  //const totalAreaKm2 = computeAreaKm2(geojsonData);
  // Update the element with id 'areaValue' with the computed area
  //document.getElementById('areaValue').innerText = totalAreaKm2;
//}











// Prepare an array to store glacier areas for each year
const glacierAreas = [];

function populateGlacierAreas(callback) {
  console.log("populateGlacierAreas function called");

  // Clear the glacierAreas array
  glacierAreas.length = 0;

  // Load GeoJSON data for each year and calculate the glacier area per glacier id
  const promises = years.map(year => {
    console.log(`Loading GeoJSON for year: ${year}`);
    return d3.json(glacierData[year]).then(data => {
      console.log(`GeoJSON loaded for year: ${year}`, data);

      // Create an object to store areas aggregated by glacier id
      const areasByGlacier = {};

      // Iterate over each feature in the GeoJSON data
      data.features.forEach(feature => {
        // Extract the glacier id from the feature properties
        const glacierId = feature.properties['glacier-id'];
        // Calculate area in square meters using Turf.js
        const featureArea = turf.area(feature); 
        
        // Accumulate the area (in m²) per glacier id
        if (areasByGlacier[glacierId]) {
          areasByGlacier[glacierId] += featureArea;
        } else {
          areasByGlacier[glacierId] = featureArea;
        }
      });

      // Convert the areas from m² to km² for each glacier
      for (const id in areasByGlacier) {
        areasByGlacier[id] = areasByGlacier[id] / 1e6;
      }

      // Store the year along with the aggregated areas by glacier id
      glacierAreas.push({ year, areas: areasByGlacier });
    }).catch(error => {
      console.error(`Error loading GeoJSON for year: ${year}`, error);
    });
  });

  // Once all data is loaded and processed
  Promise.all(promises).then(() => {
    console.log("All GeoJSON data loaded and processed");
    console.log("Glacier areas:", glacierAreas);
    
    // Sort the results by year if needed
    glacierAreas.sort((a, b) => a.year - b.year);

    // Add a total area property to each entry in glacierAreas
    glacierAreas.forEach(entry => {
      entry.totalArea = Object.values(entry.areas).reduce((sum, area) => sum + area, 0);
    });

    if (callback) callback();
  }).catch(error => {
    console.error("Error in Promise.all:", error);
  });
}






// STACKED BAR CHART //

let currentYearIndex = 0 // Default to the first year in the dataset

function updateStackedBar(currentYearIndex, glacierId = null) {
  const svg = d3.select("#stacked-bar-full");
  
  // Get the computed dimensions from the SVG's bounding box
  const bbox = svg.node().getBoundingClientRect();
  const width = bbox.width;
  const height = bbox.height;

  // Clear any existing bars
  svg.selectAll("*").remove();
  
  // Filter data
  const filtered1850 = glacierAreas
    .filter(d => d.year === 1850)
    .filter(d => d); // Remove null values

  const filteredCurrent = glacierAreas
    .filter(d => d.year === glacierAreas[currentYearIndex].year)
    .filter(d => d); // Remove null values

  // Sum areas for the selected group or all glaciers
  const area1850 = d3.sum(filtered1850, d => d.totalArea);
  const currentArea = d3.sum(filteredCurrent, d => d.totalArea);
  const remainingProportion = area1850 ? currentArea / area1850 : 0;
  const lostProportion = 1 - remainingProportion;

  console.log("Glacier ID:", glacierId || "ALL");
  console.log("Current area:", currentArea);
  console.log("Remaining proportion:", remainingProportion);
  console.log("Lost proportion:", lostProportion);

  if (isNaN(remainingProportion) || isNaN(lostProportion)) {
    console.error("Invalid proportions for stacked bar chart");
    return;
  }

  // Define segments
  const segments = [
    { proportion: lostProportion, color: "#ffa196" },
    { proportion: remainingProportion, color: "#C8E9E9", areaValue: currentArea.toFixed(1) + " km²" }
  ];

  // Draw the bar
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

  // Add areaValue text label at the left edge of the blue bar
  svg.selectAll(".area-label")
    .data(segments.filter(d => d.color === "#C8E9E9"))
    .enter()
    .append("text")
    .attr("class", "area-label")
    .attr("x", width * lostProportion + 5)
    .attr("y", height / 2)
    .attr("dy", "0.35em")
    .text(d => d.areaValue)
    .style("fill", "#333")
    .style("font-size", "14px")
    .style("font-weight", "bold");
}










function updateHorizontalBarChart(selectedYear, selectedGlacierPersistentId, chartId = "glacier-bar-chart") {
  const svg = d3.select("#" + chartId);
  const margin = { top: 20, right: 20, bottom: 30, left: 30 };
  
  // Retrieve the computed width from the SVG's bounding box
  const bbox = svg.node().getBoundingClientRect();
  const computedWidth = bbox.width;
  const width = computedWidth - margin.left - margin.right;
  
  // Retrieve the data for the selected year.
  const yearData = glacierAreas.find(d => d.year === selectedYear);
  if (!yearData) {
    console.error("No data found for year", selectedYear);
    return;
  }

  const sortOption = document.getElementById("sort-options").value;
  
  // Convert the glacier area data into an array of objects.
  let glacierEntries = Object.entries(yearData.areas).map(([glacierId, area]) => ({
    glacierId,
    area
  }));

  // Find and separate the selected glacier.
  const selectedGlacier = glacierEntries.find(d => d.glacierId === selectedGlacierPersistentId);
  glacierEntries = glacierEntries.filter(d => d.glacierId !== selectedGlacierPersistentId);

  // Apply sorting to the remaining entries.
  if (sortOption === "id") {
    glacierEntries.sort((a, b) => a.glacierId.localeCompare(b.glacierId));
  } else if (sortOption === "area") {
    glacierEntries.sort((a, b) => b.area - a.area);
  }

  // Get the glacier limit from user input.
  const glacierLimitInput = document.getElementById("glacier-limit").value;
  let limit;
  if (glacierLimitInput === "all") {
    limit = glacierEntries.length + (selectedGlacier ? 1 : 0);
  } else {
    limit = parseInt(glacierLimitInput, 10);
  }

  // If there is a selected glacier, reserve the top slot for it.
  if (selectedGlacier) {
    glacierEntries = glacierEntries.slice(0, Math.max(0, limit - 1));
    glacierEntries.unshift(selectedGlacier);
  } else {
    glacierEntries = glacierEntries.slice(0, limit);
  }

  const barHeight = 20;
  const numberOfBars = glacierEntries.length;
  const totalHeight = numberOfBars * barHeight;
  document.getElementById(chartId).style.height = totalHeight + "px";

  // Clear existing svg elements.
  svg.selectAll("*").remove();
  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  const innerHeight = totalHeight - margin.top - margin.bottom;

  // Always use the baseline (1850) data to set up a fixed X-axis.
  const baselineData = glacierAreas.find(d => d.year === 1850);
  if (!baselineData) {
    console.error("No baseline data found for year 1850");
    return;
  }
  // Calculate global maximum baseline area from all glaciers.
  const globalMax = d3.max(Object.values(baselineData.areas));

  // Define an X scale that remains constant across years.
  const x = d3.scaleLinear()
              .domain([0, globalMax])
              .range([0, width * 0.9]); // Limit bar width to 90% of the chart width

  // Create a band scale for glacier IDs.
  const y = d3.scaleBand()
              .domain(glacierEntries.map(d => d.glacierId))
              .range([0, innerHeight])
              .padding(0.1);

  // For the baseline year, draw simple blue bars.
  if (selectedYear === "1850") {
    g.selectAll(".bar")
     .data(glacierEntries)
     .enter()
     .append("rect")
     .attr("class", "bar")
     .attr("x", 0)
     .attr("y", d => y(d.glacierId))
     .attr("height", y.bandwidth())
     .attr("width", d => x(d.area)) 
     .attr("fill", d => d.glacierId === selectedGlacierPersistentId ? "#0056b3" : "#C8E9E9");
  } else {
    // For non-baseline years, draw the retreat (red) segment first on the left,
    // then the current glacier area (blue) to its right.
    g.selectAll(".retreat")
     .data(glacierEntries)
     .enter()
     .append("rect")
     .attr("class", "retreat")
     .attr("x", 0)
     .attr("y", d => y(d.glacierId))
     .attr("height", y.bandwidth())
     .attr("width", d => {
       const baselineVal = baselineData.areas[d.glacierId];
       const diff = baselineVal - d.area;
       return diff > 0 ? x(diff) : 0;
     })
     .attr("fill", "#ffa196");

    g.selectAll(".bar")
     .data(glacierEntries)
     .enter()
     .append("rect")
     .attr("class", "bar")
     // Position the blue bar immediately to the right of the red bar.
     .attr("x", d => {
       const baselineVal = baselineData.areas[d.glacierId];
       const diff = baselineVal - d.area;
       return diff > 0 ? x(diff) : 0;
     })
     .attr("y", d => y(d.glacierId))
     .attr("height", y.bandwidth())
     .attr("width", d => x(d.area))
     .attr("fill", d => d.glacierId === selectedGlacierPersistentId ? "#0056b3" : "#C8E9E9");
  }

  // Add the y-axis labels.
  g.append("g")
   .attr("class", "y-axis")
   .call(d3.axisLeft(y))
   .selectAll(".tick text")
   .style("font-weight", d => d === selectedGlacierPersistentId ? "bold" : "normal")
   .style("fill", d => d === selectedGlacierPersistentId ? "#0056b3" : "#000")
   .style("font-size", "10px");

  // Add area labels.
  g.selectAll(".label")
   .data(glacierEntries)
   .enter()
   .append("text")
   .attr("class", "label")
   .attr("x", d => {
     let offset = 0;
     if (selectedYear !== "1850") {
       // Offset the label by the width of the red retreat bar.
       const baselineVal = baselineData.areas[d.glacierId];
       const diff = baselineVal - d.area;
       offset = diff > 0 ? x(diff) : 0;
     }
     return offset + x(d.area) + 5;
   })
   .attr("y", d => y(d.glacierId) + y.bandwidth() / 2)
   .attr("dy", "0.35em")
   .text(d => d.area.toFixed(1))
   .style("fill", "#333")
   .style("font-size", "10px");
}














// Extract set of glacier IDs from input features
function extractGlacierIDs(features) {
  const idSet = new Set();
  features.forEach((feature) => {
    const glacierId = feature.properties['glacier-id'];
    if (glacierId) {
      idSet.add(glacierId);
      }});
  return idSet;
}


// Populate the dropdown selector with glacier IDs
function populateIdSelector() {

  // Query features from the source to extract unique glacier IDs
  const features = map.querySourceFeatures('glaciers');
  const idSet = extractGlacierIDs(features);

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
    map.flyTo({
      center: [8.6, 46.5], // Longitude, latitude
      zoom:  7.5, // Zoom level
      speed: 1.5, // Optional, controls animation speed
      curve: 1, // Optional, controls animation curve
      essential: true // This makes the transition work even for users with reduced motion settings
    });
    return;
  }

  // Preprocess the features to extract simplified IDs
  const features = map.querySourceFeatures('glaciers');
  const matchingFeatures = features.filter((feature) => {
    const fullId = feature.properties['glacier-id'];
    //console.log("Full ID:", fullId); // Debugging log
    return fullId === glacierId; // Match against the selected glacier ID
  });

  console.log("Zooming to glacier ID:", glacierId); // Debugging log

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






















// Global variable to track selected feature IDs
let selectedStateIds = [];

// Global variable to track selected glacier identifier (persistent ID)
let selectedGlacierPersistentId = null;

// Function to clear current selection from the map
function clearGlacierSelection() {
  selectedStateIds.forEach(id => {
    map.setFeatureState({ source: 'glaciers', id: id }, { selected: false });
  });
  selectedStateIds = [];
  console.log("Cleared previous glacier selections.");
}



// Function to update glacier selection using a persistent glacier ID
function updateGlacierSelection(selectedGlacierId) {
  clearGlacierSelection();

  console.log("Applying selection for glacier with persistent ID:", selectedGlacierId);
  if (!selectedGlacierId || selectedGlacierId === 'undefined') {
    console.log("Glacier ID is missing or invalid.");
    return;
  }
  
  // Query features using the persistent glacier ID (not the auto-generated feature.id)
  const featuresWithSameId = map.querySourceFeatures('glaciers', {
    sourceLayer: 'glaciers-layer',
    filter: ['==', ['get', 'glacier-id'], selectedGlacierId]
  });
  
  // Use the new feature ids from the updated data for highlighting
  selectedStateIds = featuresWithSameId.map(feature => feature.id);
  selectedStateIds.forEach(id => {
    map.setFeatureState({ source: 'glaciers', id: id }, { selected: true });
  });
  
  console.log("Updated selection on the map for glacier ID:", selectedGlacierId);

  selectedGlacierPersistentId = selectedGlacierId; // Store the persistent glacier ID
}







function updateVisualizations() {
  const selectedYearIndex = parseInt(document.getElementById("yearSlider").value, 10);
  const selectedYear = years[selectedYearIndex];
  const sortOption = document.getElementById("sort-options").value; // Get sort option from dropdown

  console.log("Selected year:", selectedYear); // Debugging log
  console.log("Selected year index:", selectedYearIndex); // Debugging log

  // Update the horizontal bar chart with the current year and sorting option
  updateHorizontalBarChart(selectedYear, selectedGlacierPersistentId, "glacier-bar-chart", sortOption);

  // Update other visualizations or data
  updateStackedBar(selectedYearIndex);

  console.log("Persistent glacier ID:", selectedGlacierPersistentId); // Debugging log
  
  

  // Fetch and update the GeoJSON data
  fetch(glacierData[selectedYear])
    .then((response) => response.json())
    .then((data) => {
      data.features.forEach((feature, index) => {
        if (!feature.id) {
          feature.id = index;
        }
      });

      const source = map.getSource("glaciers");

      if (source && source._data) { // Check if source data exists
        source.setData(data);
      } else {
        console.error("Glacier source not found or not loaded yet.");
      }

      if (source) {
        map.querySourceFeatures("glaciers", { sourceLayer: "glaciers-layer" }).forEach(feature => {
          map.setFeatureState({ source: "glaciers", id: feature.id }, { selected: false });
        });
        source.setData(data);
      } else {
        console.error("Glacier source not found.");
      }

      map.once("idle", () => {
        if (selectedGlacierPersistentId) {
          updateGlacierSelection(selectedGlacierPersistentId);
        }
      });

      //displayTotalGlacierArea(data);
    })
    .catch((error) => {
      console.error("Error loading GeoJSON data:", error);
    });
}



















// Handle dropdown selection
document.getElementById('idSelector').addEventListener('change', (event) => {

  const glacierId = this.value;
  const dropdown = document.getElementById('idSelector');
  const selectedYearIndex = parseInt(document.getElementById("yearSlider").value, 10);
  const selectedYear = years[selectedYearIndex];


  // Grey out the dropdown and show the 'Return to All' button if a specific glacier is selected
  if (glacierId !== 'undefined') {
    dropdown.disabled = true; // Disable the dropdown
    document.getElementById('returnToAll').style.display = 'inline'; // Show the button
    console.log("Dropdown disabled and button shown"); // Debugging log
    
  } else {
    // Reset to default state if 'All' is selected
    dropdown.disabled = false;
    document.getElementById('returnToAll').style.display = 'none'; // Hide the button
  }

  const selectedGlacierId = event.target.value;
  zoomToGlacier(selectedGlacierId);
  // Reset the previously selected glacier's state
  if (selectedStateId !== null) {
    map.setFeatureState(
      { source: 'glaciers', id: selectedStateId },
      { selected: false }
    );
  }
  
  // Set the new selected glacier's state
  selectedStateId = selectedGlacierId; // Track the currently selected feature ID

  if (selectedStateId == 'undefined') {
    console.log('Glacier ID (', selectedStateId, ') is missing.');
  }
  else {
    // Find all features with the same glacier-id
    console.log("Finding features with glacier ID:", selectedStateId); // Debugging log
    const featuresWithSameId = map.querySourceFeatures('glaciers', {
      sourceLayer: 'glaciers-layer',
      filter: ['==', ['get', 'glacier-id'], selectedStateId]
    });

    // Highlight all features with the same glacier-id
    selectedStateIds = featuresWithSameId.map((feature) => feature.id); // Update the global tracking variable
    selectedStateIds.forEach((id) => {
      map.setFeatureState(
        { source: 'glaciers', id: id },
        { selected: true }
      );
    });
  }

  console.log("stacked-bar-glacier for year index", currentYearIndex, "and glacierID", selectedGlacierId); // Debugging log
  updateHorizontalBarChart(selectedYear, selectedGlacierId, "glacier-bar-chart"); // Update the horizontal bar chart for the glacier group
  
});

document.getElementById('returnToAll').addEventListener('click', function () {
  const dropdown = document.getElementById('idSelector');

  // Clear any selected features
  clearGlacierSelection();
  // Reset the stored persistent selection ID
  selectedGlacierPersistentId = null;
  console.log("All glaciers returned to normal.");

  // Reset the dropdown to 'All'
  dropdown.value = 'All';
  dropdown.disabled = false; // Enable the dropdown again
  this.style.display = 'none'; // Hide the 'Return to All' button

  updateVisualizations()

  // Reset the map view
  map.flyTo({
    center: [8.6, 46.5], // Longitude, latitude
    zoom: 7.5, // Zoom level
    speed: 1.2,
    curve: 1,
    essential: true
  });

  // Unselect previously highlighted glaciers
  if (selectedStateIds && selectedStateIds.length > 0) {
    selectedStateIds.forEach((id) => {
      map.setFeatureState(
        { source: 'glaciers', id: id },
        { selected: false } // Reset the selected state
      );
    });
    selectedStateIds = []; // Clear the tracking variable
  }

  console.log("Reset to 'All': Cleared highlighted glaciers, reset the map view, and enabled the dropdown.");
});

document.getElementById("glacier-limit").addEventListener("change", () => {
  updateVisualizations(); // or just updateHorizontalBarChart(...) if calling directly
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

  populateGlacierAreas(() => {
    // Update the stacked bar chart (which should now reference entry.totalArea when needed)
    updateVisualizations(currentYearIndex);
  });
  
  // Slider listener
  document.getElementById("yearSlider").addEventListener("input", () => {
    updateVisualizations();
  });
  
  // Dropdown listener
  document.getElementById("sort-options").addEventListener("change", () => {
    updateVisualizations();
  });
  
  
  d3.select("#idSelector").on("change", function() {
    selectedGlacierPersistentId = d3.select(this).property("value");
    updateGlacierSelection(selectedGlacierPersistentId);
    updateVisualizations();
  });

});


// Add click event listener for glaciers
map.on('click', 'glaciers-layer', (e) => {
  if (e.features && e.features.length > 0) {
    const clickedFeature = e.features[0];
    const glacierId = clickedFeature.properties['glacier-id']; // Use 'glacier-id' for grouping
    console.log('Clicked glacier ID:', glacierId);

    if (!glacierId) {
      console.error('Glacier ID is missing.');
      return;
    }

    // Reset the previously selected glaciers' states
    if (selectedStateIds && selectedStateIds.length > 0) {
      selectedStateIds.forEach((id) => {
        map.setFeatureState(
          { source: 'glaciers', id: id },
          { selected: false }
        );
      });
    }

    // Find all features with the same glacier-id
    const featuresWithSameId = map.querySourceFeatures('glaciers', {
      sourceLayer: 'glaciers-layer',
      filter: ['==', ['get', 'glacier-id'], glacierId]
    });

    // Highlight all features with the same glacier-id
    selectedStateIds = featuresWithSameId.map((feature) => feature.id); // Update the global tracking variable
    selectedStateIds.forEach((id) => {
      map.setFeatureState(
        { source: 'glaciers', id: id },
        { selected: true }
      );
    });

    // Set the dropdown to the clicked glacier's ID
    const idSelector = document.getElementById('idSelector');
    idSelector.value = glacierId;

    console.log("stacked-bar-glacier for year index", currentYearIndex, "and glacierID", glacierId); // Debugging log

    // Calculate the combined bounding box manually
    let combinedBounds = null;
    featuresWithSameId.forEach((feature) => {
      const featureBounds = turf.bbox(feature);
      if (!combinedBounds) {
        combinedBounds = featureBounds; // Initialize with the first feature's bounds
      } else {
        combinedBounds = [
          Math.min(combinedBounds[0], featureBounds[0]), // Min Longitude
          Math.min(combinedBounds[1], featureBounds[1]), // Min Latitude
          Math.max(combinedBounds[2], featureBounds[2]), // Max Longitude
          Math.max(combinedBounds[3], featureBounds[3])  // Max Latitude
        ];
      }
    });

    if (combinedBounds) {
      // Zoom to the glacier group's extent
      map.fitBounds(combinedBounds, {
        padding: 50,
        maxZoom: 14,
        duration: 1000
      });
    } else {
      console.error('No bounds found for glacier features.');
    }
  }
});

// Change cursor to pointer when hovering over glaciers
map.on('mouseenter', 'glaciers-layer', () => {
  map.getCanvas().style.cursor = 'pointer';
});



// Create a popup, but don't add it to the map yet
const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false
});

map.on('mousemove', 'glaciers-layer', (e) => {
  if (e.features && e.features.length > 0) {
    const feature = e.features[0];

    // Set the popup content using the attributes of the feature
    const glacierId = feature.properties['glacier-id'];
    const totalArea = feature.properties['total-area'];
    const year = feature.properties['year'];

    const popupContent = `
      <div>
        <strong>Glacier ID:</strong> ${glacierId}<br>
        <strong>Total Area:</strong> ${totalArea}<br>
        <strong>Year:</strong> ${year}
      </div>
    `;

    // Set the popup coordinates and content
    popup.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);

    // Change the cursor style to indicate interactivity
    map.getCanvas().style.cursor = 'pointer';
  }
});

map.on('mouseleave', 'glaciers-layer', () => {
  // Remove the popup when the mouse leaves the layer
  popup.remove();

  // Reset the cursor style
  map.getCanvas().style.cursor = '';
});









