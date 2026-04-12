const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove all classes starting with dark:
    content = content.replace(/dark:[a-zA-Z0-9/-]+/g, '');
    // Clean up multiple spaces
    content = content.replace(/  +/g, ' ');
    fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
    path.join(__dirname, 'App.tsx'),
    path.join(__dirname, 'components', 'Silo.tsx'),
    path.join(__dirname, 'components', 'Timeline.tsx'),
    path.join(__dirname, 'components', 'Demonomer.tsx')
];

files.forEach(processFile);
console.log('Done');
