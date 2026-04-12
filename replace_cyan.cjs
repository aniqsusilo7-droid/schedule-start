const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'Silo.tsx');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/cyan/g, 'teal');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
