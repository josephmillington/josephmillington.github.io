"""
Script: convert_geojson_to_mbtiles.py

Description:
This script converts all GeoJSON files in the current
working directory to MBTiles files using Tippecanoe.
Each GeoJSON file is processed individually, and the
resulting MBTiles file is saved in the same directory
with the same base name as the input file.

Requirements:
- Tippecanoe must be installed and available in the system's PATH.
- Python 3 must be installed.

Usage:
1. Place this script in the directory containing your GeoJSON files.
2. Open a terminal and navigate to the directory.
3. Run the script using Python 3:
   python3 convert_geojson_to_mbtiles.py

Example:
If you have `example.geojson` in the directory, this script will generate `example.mbtiles`.

Arguments:
- None. The script processes all `.geojson` files in the current working directory.

Notes:
- The script assumes Tippecanoe is installed and accessible via the `tippecanoe` command.
- The script overwrites existing MBTiles files with the same name.
"""

import os
import subprocess

def convert_geojson_to_mbtiles(tippecanoe_path="tippecanoe", zoom_levels=(6, 14)):
    """
    Converts each GeoJSON file in the current working directory to a separate MBTiles file.

    Args:
        tippecanoe_path (str): Path to the Tippecanoe executable (default: "tippecanoe").
        zoom_levels (tuple): Minimum and maximum zoom levels (default: (6, 14)).
    """
    # Get the current working directory
    current_directory = os.getcwd()

    # Iterate through all GeoJSON files in the current directory
    for filename in os.listdir(current_directory):
        if filename.endswith(".geojson"):
            input_path = os.path.join(current_directory, filename)
            output_filename = os.path.splitext(filename)[0] + ".mbtiles"
            output_path = os.path.join(current_directory, output_filename)

            print(f"Converting {filename} to {output_filename}...")

            # Run Tippecanoe command with --generate-ids
            command = [
                tippecanoe_path,
                "-o", output_path,
                "-z", str(zoom_levels[1]),
                "-Z", str(zoom_levels[0]),
                "--generate-ids",  # Add unique IDs to features
                "-f",  # Force overwrite if the file exists
                input_path
            ]

            try:
                subprocess.run(command, check=True)
                print(f"Successfully created {output_filename}")
            except subprocess.CalledProcessError as e:
                print(f"Error converting {filename}: {e}")

# Example usage
if __name__ == "__main__":
    convert_geojson_to_mbtiles()
