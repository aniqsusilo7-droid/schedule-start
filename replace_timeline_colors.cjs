const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'Timeline.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace indigo with teal
content = content.replace(/indigo/g, 'teal');
content = content.replace(/#4f46e5/g, '#0d9488'); // teal-600

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
