const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', { username: 'admin', password: 'testpassword' });
    console.log("Login Response:", res.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
