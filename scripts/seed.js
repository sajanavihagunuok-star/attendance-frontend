// scripts/seed.js
const base = process.env.VITE_API_BASE_URL || 'https://attendance-backend-zbpx.onrender.com';

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function seed() {
  console.log('Seeding to', base);
  try {
    await post('/courses', { code: 'CS101', name: 'Intro to CS' }).catch(()=>null);
    await post('/courses', { code: 'MATH01', name: 'Calculus I' }).catch(()=>null);

    // test users
    await post('/users', { email: 'lecturer1@example.com', name: 'Lecturer One', role: 'lecturer' }).catch(()=>null);
    await post('/users', { email: 'student1@example.com', name: 'Student One', role: 'student' }).catch(()=>null);

    console.log('Seed attempted');
  } catch (e) {
    console.error('Seed failed:', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
}

seed();