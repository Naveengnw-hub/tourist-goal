document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = API_CONFIG.BASE_URL;
    const map = L.map('map').setView([7.8, 80.5], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    async function loadAnalysisData(){
        try{
            const [statsRes, assetsRes, boundaryRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/stats/category-distribution`),
                fetch(`${API_BASE_URL}/api/assets`),
                fetch(`${API_BASE_URL}/api/boundary`)
            ]);
            const stats = await statsRes.json();
            const assets = await assetsRes.json();
            const boundary = await boundaryRes.json();
            renderCategoryChart(stats);
            displayInsights(stats);
            displayBoundary(boundary);
            displayHeat(assets);
        }catch(e){
            document.getElementById('insights').innerHTML = `<p style="color:red;">Failed to load analysis. Start backend.</p>`;
        }
    }

    function renderCategoryChart(data){
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const sorted = data.sort((a,b)=>parseInt(b.count)-parseInt(a.count));
        new Chart(ctx, {
            type:'bar',
            data:{
                labels: sorted.map(i=>i.category),
                datasets:[{ label:'Number of assets', data: sorted.map(i=>i.count) }]
            },
            options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, title:{display:true, text:'Asset Distribution'} } }
        });
    }

    function displayInsights(data){
        const container = document.getElementById('insights');
        if (!data.length) { container.innerHTML = '<p>No data available.</p>'; return; }
        const total = data.reduce((s,i)=>s+parseInt(i.count,10),0);
        const top = data.reduce((p,c)=> parseInt(p.count,10)>parseInt(c.count,10)?p:c);
        container.innerHTML = `<h3>Key Insights</h3><p><strong>Total Assets:</strong> ${total}</p><p><strong>Top Category:</strong> ${top.category} (${top.count})</p>`;
    }

    function displayBoundary(boundary){
        if(boundary) L.geoJSON(boundary, { style:{ color:'#8B4513', weight:3, fill:false }}).addTo(map);
    }

    function displayHeat(assets){
        if(!assets?.features?.length) return;
        const heatPoints = assets.features.map(a=>[a.geometry.coordinates[1], a.geometry.coordinates[0], 0.5]);
        if (window.L && window.L.heat) {
            L.heatLayer(heatPoints, { radius:25, blur:15 }).addTo(map);
            map.fitBounds(L.geoJSON(assets).getBounds());
        }
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
    script.onload = loadAnalysisData;
    document.head.appendChild(script);
});