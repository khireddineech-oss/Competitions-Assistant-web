const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', { username: 'admin', password: 'testpassword' });
    console.log(JSON.stringify(res.data));
  } catch (err) {}
}
test();
