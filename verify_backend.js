// No import needed for fetch in Node 20+

async function testBackend() {
    const url = 'https://safetywatch-backend.onrender.com/api/translate/ping?t=' + Date.now();
    const body = {
        text: 'Hello world',
        targetLanguage: 'hi'
    };

    console.log('Testing backend translate endpoint:', url);
    try {
        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                'x-app-version': '1.4.6'
            }
        });

        console.log('Status:', resp.status);
        const data = await resp.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testBackend();
