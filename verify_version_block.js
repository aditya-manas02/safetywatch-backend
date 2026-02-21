async function testVersionBlocking() {
    const baseUrl = 'https://safetywatch-backend.onrender.com/api';
    const versions = ['1.4.6', '1.4.7'];

    for (const v of versions) {
        console.log(`\n--- Testing Version: ${v} ---`);
        try {
            // Testing a route that requires version check (e.g. users/profile)
            // Even if it returns 401 Unauthorized, we can see if it's blocked by 426 first
            const resp = await fetch(`${baseUrl}/users/profile`, {
                headers: {
                    'x-app-version': v,
                    'x-requested-with': 'com.safetywatch.app'
                }
            });

            console.log(`Status: ${resp.status}`);
            const data = await resp.json().catch(() => ({}));
            console.log('Response:', JSON.stringify(data, null, 2));

            if (v === '1.4.6' && resp.status === 426) {
                console.log('✅ SUCCESS: Version 1.4.6 was correctly blocked.');
            } else if (v === '1.4.7' && resp.status !== 426) {
                console.log('✅ SUCCESS: Version 1.4.7 bypasses the version check.');
            }
        } catch (err) {
            console.error('Error:', err.message);
        }
    }
}

testVersionBlocking();
