async function testPublicRoutes() {
    const rotues = [
        'https://safetywatch-backend.onrender.com/api/stats/public',
        'https://safetywatch-backend.onrender.com/api/incidents/latest'
    ];

    for (const url of rotues) {
        console.log('Testing:', url);
        try {
            const resp = await fetch(url + '?t=' + Date.now(), {
                method: 'GET',
                // NO x-app-version header, it should be blocked IF NOT exempted
            });

            console.log('Status:', resp.status);
            const data = await resp.json();
            console.log('Success:', !!data);
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
}

testPublicRoutes();
