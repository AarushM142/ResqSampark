const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, 'app/api');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(API_DIR);
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add await if not present
  content = content.replace(/(?<!await\s)getIncidents\(/g, 'await getIncidents(');
  content = content.replace(/(?<!await\s)getIncident\(/g, 'await getIncident(');
  content = content.replace(/(?<!await\s)createIncident\(/g, 'await createIncident(');
  content = content.replace(/(?<!await\s)updateIncident\(/g, 'await updateIncident(');
  content = content.replace(/(?<!await\s)addResourceRequest\(/g, 'await addResourceRequest(');
  content = content.replace(/(?<!await\s)updateResourceRequest\(/g, 'await updateResourceRequest(');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log('Updated', file);
  }
}

console.log('Refactored files:', changedCount);
