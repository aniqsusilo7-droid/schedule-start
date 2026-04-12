const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'Demonomer.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace indigo with teal
content = content.replace(/indigo/g, 'teal');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
