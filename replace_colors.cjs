const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace indigo with teal
content = content.replace(/indigo/g, 'teal');

// Replace cyan with teal in specific places
content = content.replace(/text-cyan-600/g, 'text-teal-600');
content = content.replace(/text-cyan-400/g, 'text-teal-400');
content = content.replace(/bg-cyan-500/g, 'bg-teal-500');
content = content.replace(/bg-cyan-100/g, 'bg-teal-100');
content = content.replace(/text-cyan-800/g, 'text-teal-800');
content = content.replace(/border-cyan-500/g, 'border-teal-500');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
