---
layout: post
title: "An Atlas-Style Map of Japan"
author: "Joseph Millington"
categories: maps
tags: [sample]
image: japan_preview.png
---

This project sought to create an atlas-style map of Japan in a poster format, with cities, major waterbodies, and islands labelled.

The project was used as a test to experiment with vector hillshading. The hillshading in the final project uses aspect and slope calculated from SRTM elevation data to shade HydroATLAS river basins, with layer blending being used to 'bake' this shading into the underlying terrain tinting.

City labels were created from OpenStreetMap data, with waterbody labels added using existing maps of Japan as reference. A soft shadow was also applied beneath Japan's constituent islands to increase visual clarity and help them stand out against other landmasses shown within the map. 

QGIS' geometry generator is used to wrap labels to the curved graticules. Natural Earth bathymetry data is used as a high-level illustration of the sea floor terrain.

[comment]: <> (need to replace full map with one with scale and attribution)
[comment]: <> (need to add links here)

![alt text](./assets/img/japan_full.png "Japan Image")