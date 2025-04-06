'''
clean_glacier_id_columns.py

This script processes GeoJSON files representing glacier extent and adds a new field 
named 'sgi-id' to the 'properties' of each feature. The 'sgi-id' field is created 
non-destructively by copying the value of the existing 'SGI' field, if it exists.

The script iterates through all GeoJSON files in the directory, processes each file, 
and saves the updated data to a new file with the prefix 'updated_' added to the 
original filename. This ensures the original files remain unchanged.

Usage:
    - Place the GeoJSON files in the '../data' directory.
    - Run the script from the terminal: `python clean_glacier_id_columns.py`.
    - Check the '../data' directory for the updated files.

Dependencies:
    - Python 3.x
    - json (standard library)
'''

import os
import json

# Define the directory containing the GeoJSON files
BASE_DIR = os.path.dirname(os.path.dirname( __file__ ))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Iterate through all files in the directory
for filename in os.listdir(DATA_DIR):
    if filename.endswith(".geojson"):  # Process only GeoJSON files
        file_path = os.path.join(DATA_DIR, filename)

        # Open and load the GeoJSON file
        with open(file_path, "r", encoding="utf-8") as file:
            geojson_data = json.load(file)

        # Iterate through the features and add the 'sgi-id' field if 'SGI' exists
        for feature in geojson_data.get("features", []):
            if "SGI" in feature.get("properties", {}):
                feature["properties"]["sgi-id"] = feature["properties"]["SGI"]

        # Save the updated GeoJSON
        with open(file_path, "w", encoding="utf-8") as new_file:
            json.dump(geojson_data, new_file, ensure_ascii=False, indent=2)

        print(f"Processed and saved: {file_path}")
