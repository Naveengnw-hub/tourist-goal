const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- FINAL, CORRECT CORS CONFIGURATION ---
// This gives permission to your live Netlify website.
const corsOptions = {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://tourism-nwp.netlify.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // This handles the preflight requests shown in your screenshot

app.use(express.json());

// --- Data File Paths ---
const TOURISM_DATA_PATH = path.join(__dirname, 'data', 'NWP_TOURISM_DATA.geojson');
const FEEDBACK_DATA_PATH = path.join(__dirname, 'data', 'feedback.json');
const BOUNDARY_DATA_PATH = path.join(__dirname, 'data', 'NWP_BOUNDARY.geojson');

// --- Helper Functions to Read/Write Data ---
const readData = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return filePath.includes('feedback') ? [] : { type: 'FeatureCollection', features: [] };
        }
        console.error(`Error reading file ${filePath}:`, error);
        throw error;
    }
};

const writeData = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// --- API Endpoints ---

app.get('/api/assets', async (req, res) => {
    try {
        const assets = await readData(TOURISM_DATA_PATH);
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve tourism assets' });
    }
});

app.get('/api/boundary', async (req, res) => {
    try {
        const boundary = await readData(BOUNDARY_DATA_PATH);
        res.json(boundary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve boundary data' });
    }
});

app.get('/api/stats/category-distribution', async (req, res) => {
    try {
        const assetsData = await readData(TOURISM_DATA_PATH);
        const counts = assetsData.features.reduce((acc, feature) => {
            const category = feature.properties.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        const result = Object.entries(counts).map(([category, count]) => ({ category, count: count.toString() }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
});

app.post('/api/feedback', async (req, res) => {
    try {
        const { name, description, latitude, longitude } = req.body;
        if (!name || !description || !latitude || !longitude) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }
        const feedbackData = await readData(FEEDBACK_DATA_PATH);
        const newFeedback = { id: Date.now(), name, description, latitude, longitude, submittedAt: new Date().toISOString() };
        feedbackData.push(newFeedback);
        await writeData(FEEDBACK_DATA_PATH, feedbackData);
        res.json({ success: true, message: 'Thank you for your contribution!' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error occurred.' });
    }
});

const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload-geojson', upload.single('geojsonFile'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    try {
        const newGeoJsonData = JSON.parse(req.file.buffer.toString());
        if (!newGeoJsonData.features) return res.status(400).send('Invalid GeoJSON file format.');
        await writeData(TOURISM_DATA_PATH, newGeoJsonData);
        res.status(200).send(`Successfully uploaded and replaced data with ${newGeoJsonData.features.length} new assets.`);
    } catch (error) {
        res.status(500).send('Failed to process GeoJSON file.');
    }
});

// --- Start the Server ---
function startServer(port) {
    const server = app.listen(port, () => {
        console.log(`✅ Backend server is running on http://localhost:${port}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️  Port ${port} is busy, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('❌ Server error:', err);
        }
    });
}
startServer(PORT);
