"""
Module: convert_mbtiles_to_pbf.py

This script processes `.mbtiles` files in the current working directory and converts them 
into Mapbox Vector Tile (MVT) format stored in a directory structure compatible with 
MapLibre GL JS or other vector tile consumers.

Features:
- Reads the `minzoom` and `maxzoom` levels from the metadata of `.mbtiles` files.
- Uses `ogr2ogr` to convert `.mbtiles` files into a directory structure of PBF tiles.
- Automatically skips files with missing or invalid zoom level metadata.
- Deletes the original `.mbtiles` file after successful processing.

Requirements:
- Python 3.x
- GDAL with `ogr2ogr` support for MVT format.
- `.mbtiles` files must include valid `minzoom` and `maxzoom` metadata.

Usage:
1. Place this script in the directory containing `.mbtiles` files.
2. Run the script using Python 3: python convert_mbtiles_to_pbf.py
"""

import os
import sqlite3


def handle_zoom_level_error(error, filename):
    """
    Handles errors that occur while reading zoom levels from an `.mbtiles` file.

    Args:
        error (Exception): The exception that was raised.
        filename (str): The name of the `.mbtiles` file being processed.

    Returns:
        tuple: A tuple `(None, None)` indicating that the zoom levels could not be retrieved.
    """
    if isinstance(error, sqlite3.OperationalError):
        print(f"SQLite operational error reading zoom levels from {filename}: {error}")
    elif isinstance(error, sqlite3.DatabaseError):
        print(f"SQLite database error reading zoom levels from {filename}: {error}")
    elif isinstance(error, sqlite3.Error):
        print(f"General SQLite error reading zoom levels from {filename}: {error}")
    elif isinstance(error, ValueError):
        print(f"Value error processing zoom levels from {filename}: {error}")
    elif isinstance(error, OSError):
        print(f"OS error accessing {filename}: {error}")
    else:
        print(f"Unexpected error reading zoom levels from {filename}: {error}")

    return None, None


def get_zoom_levels(filename):
    """
    Retrieves the minimum and maximum zoom levels from the metadata of an `.mbtiles` file.

    This function connects to the SQLite database of the `.mbtiles` file, reads the `minzoom`
    and `maxzoom` values from the `metadata` table, and returns them. If the zoom levels are
    missing or an error occurs, it provides default values or skips the file.

    Args:
        filename (str): The path to the `.mbtiles` file.

    Returns:
        tuple: A tuple containing the minimum zoom level (int) and maximum zoom level (int).
               If an error occurs, returns `(None, None)`.
    """
    # Connect to the SQLite database file
    conn = sqlite3.connect(filename)
    cursor = conn.cursor()

    try:
        # Fetch minzoom and maxzoom from metadata
        cursor.execute("SELECT value FROM metadata WHERE name='minzoom';")
        minzoom_result = cursor.fetchone()
        cursor.execute("SELECT value FROM metadata WHERE name='maxzoom';")
        maxzoom_result = cursor.fetchone()

        # Check if results are None and assign default values
        if minzoom_result is None or maxzoom_result is None:
            print(f"Warning: No zoom levels found in metadata for {filename}. Skipping file.")
            return 1, 12

        minzoom_result = minzoom_result[0]
        maxzoom_result = maxzoom_result[0]
    except (
        sqlite3.OperationalError, sqlite3.DatabaseError, sqlite3.Error, ValueError, OSError
        ) as e:
        return handle_zoom_level_error(e, filename)
    finally:
        # Close the connection
        conn.close()

    return minzoom_result, maxzoom_result


NEW_LINE = "\r\n"
MBTILES_FILE_COUNT = 0

print("Requires Python 3! Use python3 from the command line if needed.")

srcDir = os.getcwd()



# Counting mbtiles files
for file in os.listdir(srcDir):
    if file.endswith(".mbtiles"):
        MBTILES_FILE_COUNT += 1

print(f"{MBTILES_FILE_COUNT} mbtiles file(s) found{NEW_LINE}")

# Processing each mbtiles file
for file in os.listdir(srcDir):
    if file.endswith(".mbtiles"):
        newDirName = os.path.basename(file).split('.')[0]

        # Check if the directory already exists
        if os.path.exists(newDirName):
            print(f"Error: Directory '{newDirName}' already exists. Skipping command.")
            continue  # Skip to the next iteration of the loop

        # This gets the actual zoom levels needed to correctly output the sub-directories
        minzoom, maxzoom = get_zoom_levels(file)

        # Skip the file if zoom levels are not found
        if minzoom is None or maxzoom is None:
            print(f"Skipping {file} due to missing zoom levels.")
            continue

        COMMAND = (
            f'ogr2ogr -f MVT {newDirName} {file} '
            f'-dsco MINZOOM={minzoom} -dsco MAXZOOM={maxzoom} '
            f'-dsco COMPRESS=NO -dsco FORMAT=DIRECTORY'
        )
        print(f'Running {COMMAND}')
        result = os.system(COMMAND)
