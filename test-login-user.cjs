const axios = require('axios');
async function test() {
  try {
    const reg = await axios.post('http://localhost:3000/api/auth/register', { username: 'testuser', password: 'testpassword' });
    console.log("Reg Response:", reg.data);
    const res = await axios.post('http://localhost:3000/api/auth/login', { username: 'testuser', password: 'testpassword' });
    console.log("Login Response:", res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
