const fs = require('fs');
const path = require('path');

function removeDarkClasses(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove dark:something
    content = content.replace(/dark:[a-zA-Z0-9\-\/\[\]\.]+/g, '');
    // Clean up multiple spaces inside quotes
    content = content.replace(/className="([^"]+)"/g, (match, p1) => {
        return `className="${p1.replace(/\s+/g, ' ').trim()}"`;
    });
    content = content.replace(/className={`([^`]+)`}/g, (match, p1) => {
        return `className={\`${p1.replace(/\s+/g, ' ').trim()}\`}`;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
}

const dir = path.join(__dirname, 'components');
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.tsx')) {
        removeDarkClasses(path.join(dir, file));
    }
});
console.log('Done');
