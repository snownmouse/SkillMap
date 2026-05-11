import fs from 'fs';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let count = 0;
files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace white/X with black/X or similar suitable for light mode
  content = content.replace(/white\/[0-9]+/g, 'black/5');
  // Also text-white should probably be text-app-text unless it's on a dark button
  // I will leave text-white alone as it might be on btn-primary which is dark
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
});
console.log(`Replaced white/opacity in ${count} files.`);
