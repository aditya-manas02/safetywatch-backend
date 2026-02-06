
import fetch from 'node-fetch';

const BASE_URL = 'https://safetywatch-backend.onrender.com';

async function testEndpoints() {
  console.log('Testing Live Endpoints...');

  try {
    // 1. Check Root
    const rootRes = await fetch(`${BASE_URL}/`);
    console.log(`GET /: ${rootRes.status}`);
    const rootData = await rootRes.json();
    console.log('Root Data:', rootData);

    // 2. Check a known route (incidents)
    const incRes = await fetch(`${BASE_URL}/api/incidents`);
    console.log(`GET /api/incidents: ${incRes.status}`);

    // 3. Check the PROBLEM route (Area Codes)
    // Expecting 403 (forbidden) or 400, NOT 404
    const url = `${BASE_URL}/api/area-codes/generate`;
    const acRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    console.log(`POST ${url}: ${acRes.status}`);
    
    if (acRes.status === 404) {
        console.error('❌ CRITICAL: Route NOT FOUND on live server.');
    } else {
        console.log('✅ Route exists (Auth/Validation error expected).');
        const text = await acRes.text();
        console.log('Response:', text);
    }

  } catch (err) {
    console.error('Request failed:', err.message);
  }
}

testEndpoints();
