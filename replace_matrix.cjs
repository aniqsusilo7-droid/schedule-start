const fs = require('fs');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/scheduleMatrix/g, 'scheduleData');
  content = content.replace(/defaultMatrixMinutes/g, 'defaultScheduleMinutes');
  content = content.replace(/Matrix/g, 'Schedule');
  content = content.replace(/matrix/g, 'schedule');
  fs.writeFileSync(filePath, content);
}

replaceInFile('App.tsx');
replaceInFile('components/Timeline.tsx');
console.log('Done');
