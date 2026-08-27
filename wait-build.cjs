const fs = require('fs');
if (!fs.existsSync('dist/server.cjs')) {
  process.exit(1);
}
