const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', { username: 'admin', password: 'testpassword' });
    console.log("Login OK:", res.data.success);
    const me = await axios.get('http://localhost:3000/api/auth/me', { headers: { Authorization: 'Bearer ' + res.data.token } });
    console.log("Me OK:", me.data.authenticated);
  } catch(e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}
test();
