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

// Create an SVG container
const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Define a geographic projection (e.g., Mercator)
const projection = d3.geoMercator()
  .center([8.2, 46.8]) // Centered on Switzerland
  .scale(5000) // Adjust scale for zoom level
  .translate([width / 2, height / 2]);

// Define a path generator using the projection
const path = d3.geoPath().projection(projection);

// Create a group for the map layers
const g = svg.append("g");


// Handle line weight with zoom level
let currentZoomLevel = 1; // Default zoom level

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

// Attach the zoom behavior to the SVG
svg.call(zoom);

// Variable to store the 1850 bounds
let lockedBounds;

// Variable to store the 1850 glacier area
let area1850 = null;

let selectedGlacierId = null; // Default to no selection

// Default to the first year in the dataset
let currentYearIndex = 0

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

// Funtion to update the change per year display
function updateChangePerYearDisplay(currentYearIndex) {
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

// Helper to compute total area in km² from a GeoJSON data object
function computeAreaKm2(data) {
  const totalArea = data.features.reduce((sum, feature) => sum + turf.area(feature), 0);
  return totalArea / 1e6;
}

// Helper to update D3 paths for a given selection, class, and style
function updatePaths(selection, data, className, fill, stroke, strokeWidth) {
  const paths = selection.data(data);
  
  // Enter + Update: use the merge pattern (works in D3 v5+)
  paths.enter()
    .append("path")
    .attr("class", className)
    .merge(paths)
    .attr("d", path)
    .attr("fill", fill)
    .attr("stroke", stroke)
    .attr("stroke-width", strokeWidth);
  
  // Exit: remove outdated elements
  paths.exit().remove();
}


async function renderGlacier(year) {
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

    // Clear existing glacier paths
    g.selectAll("path").remove();

    // Render current year's glacier extent
    const glaciers = g.selectAll("path")
      .data(data.features, d => d.properties['sgi-id']); // Use 'sgi-id' as the key

    // Enter: Add new paths
    glaciers.enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d => {
        const glacierId = d.properties['sgi-id'].split('-')[0]; // Extract the main ID
        return glacierId === selectedGlacierId ? "#ffa196" : "#C8E9E9"; // Highlight selected glacier
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 1 / currentZoomLevel) // Adjust stroke width based on current zoom level
      .on("click", (event, d) => {
        const clickedId = d.properties['sgi-id'].split('-')[0]; // Extract the main ID
        console.log(`Clicked glacier with ID: ${clickedId}`);
    
        // Update the selectedGlacierId and dropdown value
        selectedGlacierId = clickedId;
        d3.select("#idSelector").property("value", clickedId); // Update the dropdown selection
    
        // Re-render the map to apply the highlight
        const selectedYear = years[currentYearIndex];
        renderGlacier(selectedYear);
    
        // Optionally zoom to the clicked glacier
        zoomToGlaciers(clickedId);
      })
      .merge(glaciers) // Update: Update existing paths
      .attr("d", path)
      .attr("fill", d => {
        const glacierId = d.properties['sgi-id'].split('-')[0]; // Extract the main ID
        return glacierId === selectedGlacierId ? "#ffa196" : "#C8E9E9"; // Highlight selected glacier
      })
      .attr("stroke-width", 1 / currentZoomLevel); // Adjust stroke width for updated paths



    // Exit: Remove old paths
    glaciers.exit().remove();

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
  // Filter features with the same main ID
  const matchingFeatures = g.selectAll("path")
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
    const svg = d3.select("#retreat-rate-chart");
    const width = +svg.attr("width");
    const height = +svg.attr("height");
  
    // Clear any existing bars
    svg.selectAll("*").remove();
  
    // Calculate the retreat rates for each time period, starting from the second year
    const retreatRates = glacierAreas.slice(1).map((current, index) => {
      const previous = glacierAreas[index]; // Compare with the previous year
      const yearDifference = current.year - previous.year;
      const areaDifference = previous.area - current.area;
      const rate = (areaDifference / yearDifference).toFixed(2); // Retreat rate (km²/year)
      return { year: current.year, rate };
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
      .attr("width", d => xScale(+d.rate))
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

populateIdSelector();
  
populateGlacierAreas(() => {
  // Initially render the first year (1850)
  renderGlacier(1850);

  // Update the stacked bar chart
  updateStackedBar(currentYearIndex);

  // Update the retreat rate chart
  updateRetreatRateChart(currentYearIndex);
});

d3.select("#idSelector").on("change", function () {
  selectedGlacierId = this.value; // Update the selected glacier ID
  console.log(`Selected glacier ID: ${selectedGlacierId}`);

  // Re-render the map for the current year to apply the highlight
  const selectedYear = years[currentYearIndex];
  renderGlacier(selectedYear);

  // Zoom to the selected glacier
  if (selectedGlacierId) {
    zoomToGlaciers(selectedGlacierId);
  }
});

// Update visualization when the slider value changes
d3.select("#yearSlider").on("input", function () {
  currentYearIndex = +this.value; // Update the global variable
  const selectedYear = years[currentYearIndex];

  // Update the label to show the selected year
  d3.select("#yearLabel").text(selectedYear);

  // Render the glacier extent for the selected year
  renderGlacier(selectedYear);

  // Update the stacked bar chart
  updateStackedBar(currentYearIndex);

  // Update the retreat rate chart
  updateRetreatRateChart(currentYearIndex);
});

// Populate the dropdown with unique IDs
populateIdSelector();
