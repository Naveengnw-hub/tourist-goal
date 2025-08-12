const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Final, Correct CORS Configuration ---
const corsOptions = {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://tourism-nwp.netlify.app'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// --- Data File Paths ---
const TOURISM_DATA_PATH = path.join(__dirname, 'data', 'NWP_TOURISM_DATA.geojson');
const FEEDBACK_DATA_PATH = path.join(__dirname, 'data', 'feedback.json');
const BOUNDARY_DATA_PATH = path.join(__dirname, 'data', 'NWP_BOUNDARY.geojson');

// --- Helper Function to Read/Write Data (with better error logging) ---
const readData = async (filePath) => {
    try {
        // NEW: Check if file exists before trying to read
        await fs.access(filePath);
        console.log(`File found: ${filePath}`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // This log will now show up on Railway if a file is missing
        console.error(`CRITICAL ERROR reading file ${filePath}:`, error);
        if (error.code === 'ENOENT') { // ENOENT means "Error NO ENTity" (file not found)
            return filePath.includes('feedback') ? [] : { type: 'FeatureCollection', features: [] };
        }
        throw error; // Re-throw other errors
    }
};

const writeData = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// --- API Endpoints ---
app.get('/api/assets', async (req, res) => { /* ... existing code ... */ });
app.get('/api/boundary', async (req, res) => { /* ... existing code ... */ });
app.get('/api/stats/category-distribution', async (req, res) => { /* ... existing code ... */ });
app.post('/api/feedback', async (req, res) => { /* ... existing code ... */ });
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload-geojson', upload.single('geojsonFile'), async (req, res) => { /* ... existing code ... */ });


// --- Start the Server ---
function startServer(port) {
    const server = app.listen(port, () => {
        // This is the message that was missing from your logs
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

// Wrapping startServer in a self-invoking async function to use await
(async () => {
    console.log("Server starting up...");
    // NEW: We will check for a critical file before starting the server
    try {
        await fs.access(BOUNDARY_DATA_PATH);
        console.log("Boundary data file found. Proceeding to start server.");
        startServer(PORT);
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! CRITICAL STARTUP FAILURE:                  !!!");
        console.error("!!! Boundary data file NOT FOUND.             !!!");
        console.error(`!!! Path searched: ${BOUNDARY_DATA_PATH}        !!!`);
        console.error("!!! The server cannot start without data.     !!!");
        console.error("!!! Please ensure the /backend/data directory !!!");
        console.error("!!! and its GeoJSON files are in GitHub.      !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        process.exit(1); // Exit the process with an error code
    }
})();

// Re-pasting the API endpoints here to ensure they are not missed
app.get('/api/assets', async (req, res) => { try { const d = await readData(TOURISM_DATA_PATH); res.json(d); } catch (e) { res.status(500).json({ e: 'Failed' }); } });
app.get('/api/boundary', async (req, res) => { try { const d = await readData(BOUNDARY_DATA_PATH); res.json(d); } catch (e) { res.status(500).json({ e: 'Failed' }); } });
app.get('/api/stats/category-distribution', async (req, res) => { try { const d = await readData(TOURISM_DATA_PATH); const c = d.features.reduce((a, f) => { const cat = f.properties.category || 'Uncategorized'; a[cat] = (a[cat] || 0) + 1; return a; }, {}); const r = Object.entries(c).map(([cat, cnt]) => ({ category: cat, count: cnt.toString() })); res.json(r); } catch (e) { res.status(500).json({ e: 'Failed' }); } });
app.post('/api/feedback', async (req, res) => { try { const { name, description, latitude, longitude } = req.body; if (!name || !description || !latitude || !longitude) { return res.status(400).json({ success: false, error: 'All fields are required.' }); } const d = await readData(FEEDBACK_DATA_PATH); d.push({ id: Date.now(), name, description, latitude, longitude, submittedAt: new Date().toISOString() }); await writeData(FEEDBACK_DATA_PATH, d); res.json({ success: true, message: 'Thank you!' }); } catch (e) { res.status(500).json({ e: 'Failed' }); } });
app.post('/api/upload-geojson', upload.single('geojsonFile'), async (req, res) => { if (!req.file) return res.status(400).send('No file.'); try { const d = JSON.parse(req.file.buffer.toString()); if (!d.features) return res.status(400).send('Invalid GeoJSON.'); await writeData(TOURISM_DATA_PATH, d); res.status(200).send(`Success: ${d.features.length} new assets.`); } catch (e) { res.status(500).send('Failed to process file.'); } });