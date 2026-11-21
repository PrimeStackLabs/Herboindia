const fs = require('fs');
const path = require('path');

// Read logo.jpg
const logoPath = path.join(__dirname, 'public', 'assets', 'logo.jpg');
const buf = fs.readFileSync(logoPath);

console.log('Logo size:', buf.length);

