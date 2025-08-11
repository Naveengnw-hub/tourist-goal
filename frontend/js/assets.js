document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    const map = L.map('map').setView([7.9, 80.2], 9);
    let allAssets = [];
    let assetLayers = L.layerGroup().addTo(map);
    const assetDescription = document.getElementById('asset-description');

    // --- Form Elements ---
    const userForm = document.getElementById('user-feedback-form');
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    const formMessage = document.getElementById('user-form-message');
    let submissionMarker;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    async function loadMapData() {
        try {
            const [assetsRes, boundaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/assets`),
                fetch(`${API_BASE_URL}/api/boundary`)
            ]);

            if (!assetsRes.ok || !boundaryRes.ok) {
                throw new Error(`The server responded with an error! Status: ${assetsRes.status} / ${boundaryRes.status}`);
            }

            const assets = await assetsRes.json();
            const boundary = await boundaryRes.json();
            allAssets = assets.features;

            displayBoundary(boundary);
            filterAssets('all');

            if (boundary.features.length > 0) {
                map.fitBounds(L.geoJSON(boundary).getBounds());
            }

        } catch (e) {
            assetDescription.innerHTML = `<p style="color:red;">Failed to load map data. Is the backend server running?</p><p style="font-size: smaller;">${e.message}</p>`;
        }
    }

    function displayBoundary(boundary) {
        if (boundary && boundary.features.length > 0) {
            L.geoJSON(boundary, {
                style: { color: '#2c5c3b', weight: 3, fill: false, dashArray: '5, 5' }
            }).addTo(map);
        }
    }

    function filterAssets(category) {
        assetLayers.clearLayers();
        assetDescription.innerHTML = '<h3>Asset Details</h3><p>Click a marker on the map to view its details here.</p>';

        const filteredAssets = category === 'all'
            ? allAssets
            : allAssets.filter(asset => asset.properties.category === category);

        filteredAssets.forEach(asset => {
            const { coordinates } = asset.geometry;
            const { name, category: cat, description } = asset.properties;

            if (coordinates && coordinates.length === 2) {
                const marker = L.marker([coordinates[1], coordinates[0]]);
                marker.on('click', () => {
                    assetDescription.innerHTML = `
                        <h3>${name || 'Unnamed Asset'}</h3>
                        <p><strong>Category:</strong> ${cat || 'N/A'}</p>
                        <p>${description || 'No description available.'}</p>
                    `;
                });
                assetLayers.addLayer(marker);
            }
        });
    }

    // --- Event Listener for Filter Buttons ---
    document.getElementById('filter-controls').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const category = e.target.dataset.category;
            document.querySelectorAll('#filter-controls button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            filterAssets(category);
        }
    });

    // --- Event Listener for Map Click (for user submission) ---
    map.on('click', function (e) {
        const { lat, lng } = e.latlng;
        latInput.value = lat.toFixed(5);
        lonInput.value = lng.toFixed(5);

        if (submissionMarker) {
            submissionMarker.setLatLng(e.latlng);
        } else {
            submissionMarker = L.marker(e.latlng, {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            }).addTo(map);
        }
        formMessage.textContent = '';
    });

    // --- Event Listener for User Form Submission ---
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(userForm).entries());
        if (!data.latitude || !data.longitude) {
            formMessage.style.color = 'red';
            formMessage.textContent = 'Please click on the map to select a location.';
            return;
        }

        formMessage.textContent = 'Submitting...';
        formMessage.style.color = '#444';

        try {
            const res = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                formMessage.style.color = 'green';
                formMessage.textContent = result.message;
                userForm.reset();
                latInput.value = '';
                lonInput.value = '';
                if (submissionMarker) {
                    submissionMarker.remove();
                    submissionMarker = null;
                }
            } else {
                throw new Error(result.error || 'Failed');
            }
        } catch (err) {
            formMessage.style.color = 'red';
            formMessage.textContent = 'Submission failed: ' + err.message;
        }
    });

    loadMapData();
});
