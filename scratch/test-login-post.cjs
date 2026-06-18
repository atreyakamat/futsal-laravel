async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/super-admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'superadmin@example.com',
        password: 'SuperAdmin@123'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response body:', data);
  } catch (err) {
    console.error(err);
  }
}
main();
