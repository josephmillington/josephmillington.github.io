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

// Default to the first year in the dataset
let currentYearIndex = 0

// Create a custom Leaflet layer for the glacier extent
const glacierLayer = L.layerGroup().addTo(map);

// Path to the basin GeoJSON file
const basinDataPath = 'data/basin.geojson';

// Prepare an array to store glacier areas for each year
const glacierAreas = [];


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

// Function to calculate glacier areas for all years and create the line chart
function createLineChart() {
    // Calculate glacier areas for all years
    return Promise.all(years.map(year => d3.json(glacierData[year]).then(data => {
      const totalArea = data.features.reduce((sum, feature) => {
        return sum + turf.area(feature); // Turf.js calculates area in square meters
      }, 0);
      return { year, area: totalArea / 1e6 }; // Convert to square kilometers
    }))).then(results => {
      glacierAreas.push(...results);
  
      // Create the line chart
      const svg = d3.select("#line-chart");
      const margin = { top: 20, right: 30, bottom: 50, left: 50 };
      const width = 800 - margin.left - margin.right; // Match the map frame width
      const height = 400 - margin.top - margin.bottom;
  
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
      // Set up scales
      const x = d3.scaleLinear()
        .domain(d3.extent(glacierAreas, d => d.year))
        .range([0, width]);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(glacierAreas, d => d.area)])
        .range([height, 0]);
  
      // Add X-axis
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")))
        .append("text")
        .attr("fill", "#000")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("text-anchor", "middle")
        .text("Year")
        .style("font-size", "14px"); // Match font size
  
      // Add Y-axis
      g.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("fill", "#000")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Glacier Area (km²)")
        .style("font-size", "14px"); // Match font size
  
      // Add the line
      const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.area));
  
      g.append("path")
        .datum(glacierAreas)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", line);
  
      // Apply consistent font size to axis ticks
      g.selectAll(".tick text")
        .style("font-size", "14px") // Match font size
        .style("font-family", "Arial, sans-serif"); // Match font family
    });
  }

// Function to create the rate of change chart
function createRateOfChangeStepChart() {
    // Ensure glacierAreas has data before proceeding
    if (glacierAreas.length < 2) {
      console.error("Insufficient data in glacierAreas to calculate rate of change.");
      return;
    }
  
    // Calculate the rate of change for each period
    const rateOfChange = glacierAreas.slice(0, -1).map((current, index) => {
      const next = glacierAreas[index + 1]; // Get the next year
      const yearDifference = next.year - current.year;
      const areaDifference = next.area - current.area;
      const rate = areaDifference / yearDifference; // Rate of change (km² per year)
      return { startYear: current.year, endYear: next.year, rate };
    });
  
    // Debugging: Log the rateOfChange array
    console.log("Rate of Change Array:", rateOfChange);
  
    // Create the step chart
    const svg = d3.select("#rate-of-change-chart");
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
  
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Set up scales
    const x = d3.scaleLinear()
      .domain([d3.min(rateOfChange, d => d.startYear), d3.max(rateOfChange, d => d.endYear)])
      .range([0, width]);
  
    const y = d3.scaleLinear()
      .domain([d3.min(rateOfChange, d => d.rate), d3.max(rateOfChange, d => d.rate)])
      .range([0, height]); // Invert the range to flip the Y-axis
  
    // Add X-axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .append("text")
      .attr("fill", "#000")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .text("Year")
      .style("font-size", "14px");
  
    // Add Y-axis
    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .text("Rate of Change (km²/year)")
      .style("font-size", "14px");
  
    // Add the step lines
    rateOfChange.forEach((d, index) => {
      g.append("line")
        .attr("x1", x(d.startYear))
        .attr("x2", x(d.endYear))
        .attr("y1", y(d.rate))
        .attr("y2", y(d.rate))
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);
  
      // Add vertical lines to connect steps
      if (index < rateOfChange.length - 1) {
        g.append("line")
          .attr("x1", x(d.endYear))
          .attr("x2", x(d.endYear))
          .attr("y1", y(d.rate))
          .attr("y2", y(rateOfChange[index + 1].rate))
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4,4"); // Dashed line for transitions
      }
    });
  
    // Apply consistent font size to axis ticks
    g.selectAll(".tick text")
      .style("font-size", "14px")
      .style("font-family", "Arial, sans-serif");
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
  
      // Calculate the change per year in the time period
      const currentYearIndex = years.indexOf(year);
      if (currentYearIndex > 0) {
        const previousYear = years[currentYearIndex - 1];
        const yearDifference = year - previousYear;
  
        d3.json(glacierData[previousYear]).then(prevData => {
          const prevTotalArea = prevData.features.reduce((sum, feature) => {
            return sum + turf.area(feature); // Turf.js calculates area in square meters
          }, 0);
          const prevTotalAreaKm2 = prevTotalArea / 1e6; // Convert to square kilometers
  
          // Calculate absolute and relative change per year
          const absoluteChangePerYear = ((totalAreaKm2 - prevTotalAreaKm2) / yearDifference).toFixed(2);
          const relativeChangePerYear = ((absoluteChangePerYear / prevTotalAreaKm2) * 100).toFixed(2);
  
          // Update the change per year display
          d3.select("#changePerYearValue").text(absoluteChangePerYear);
          d3.select("#changePerYearPercent").text(relativeChangePerYear);
        });
      } else {
        // If there is no previous year, reset the values
        d3.select("#changePerYearValue").text("0");
        d3.select("#changePerYearPercent").text("0");
      }
    });
  }






// Update visualization when the slider value changes
d3.select("#yearSlider").on("input", function () {
    currentYearIndex = +this.value; // Update the global variable
    const selectedYear = years[currentYearIndex];
  
    // Update the label to show the selected year
    d3.select("#yearLabel").text(selectedYear);
  
    // Render the glacier extent for the selected year
    renderGlacier(selectedYear);
  
    // Update the change per year display
    updateChangePerYearDisplay(currentYearIndex);
  
    // Lock the map to the 1850 bounds
    if (lockedBounds) {
      map.fitBounds(lockedBounds);
    }
  });


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

// Initially render the first year (1850)
renderGlacier(1850);

// Call the function to create the line chart, then create the rate of change chart
createLineChart().then(() => {
    createRateOfChangeStepChart();
  });
