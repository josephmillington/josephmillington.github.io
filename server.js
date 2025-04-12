const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8000;

// Serve static files
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.pbf')) {
            res.setHeader('Content-Type', 'application/x-protobuf');
        }
    }
}));

// Handle missing .pbf files and serve the blank tile
app.use((req, res, next) => {
    if (req.path.endsWith('.pbf')) {
        const tilePath = path.join(__dirname, req.path);
        const blankTilePath = path.join(__dirname, 'tiles/empty/empty.pbf');

        if (fs.existsSync(tilePath)) {
            console.log(`Tile found: ${req.path}`);
        } else {
            console.warn(`Tile not found: ${req.path}. Serving blank tile.`);
            res.setHeader('Content-Type', 'application/x-protobuf');
            return res.status(200).sendFile(blankTilePath);
        }
    }
    next();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});