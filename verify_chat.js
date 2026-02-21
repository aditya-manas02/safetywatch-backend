async function testChat() {
    const url = 'https://safetywatch-backend.onrender.com/api/chat';
    const body = {
        message: 'Hello Nexus, are you operational?',
        history: []
    };

    console.log('Testing AI Chat endpoint:', url);
    try {
        const resp = await fetch(url + '?t=' + Date.now(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-version': '1.4.6'
            },
            body: JSON.stringify(body)
        });

        console.log('Status:', resp.status);
        const data = await resp.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

testChat();
