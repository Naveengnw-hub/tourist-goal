document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    const form = document.getElementById('geojson-upload-form');
    const status = document.getElementById('geojson-upload-status');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('geojsonFile');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a GeoJSON file to upload.');
            return;
        }

        const fd = new FormData();
        fd.append('geojsonFile', file);

        status.style.color = '#444';
        status.textContent = 'Uploading, please wait...';

        try {
            const res = await fetch(`${API_BASE_URL}/api/upload-geojson`, {
                method: 'POST',
                body: fd
            });

            // Get the text response from the server regardless of success
            const text = await res.text();

            if (res.ok) {
                status.style.color = 'green';
                status.textContent = text; // Show success message from server
                form.reset();
                // Optional: Force a page reload to see the new data on the map
                alert('Data uploaded successfully! The page will now reload.');
                window.location.reload();
            } else {
                // If the server returned an error (like 400 or 500), throw it
                throw new Error(text);
            }
        } catch (err) {
            status.style.color = 'red';
            // Show the specific error message from the server or a network error
            status.textContent = 'Upload failed: ' + err.message;
        }
    });
});
