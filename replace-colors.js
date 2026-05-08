import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.push('./tailwind.config.js');
files.push('./index.html');

let count = 0;
files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace dark-xxx with app-xxx
  content = content.replace(/dark-bg/g, 'app-bg');
  content = content.replace(/dark-surface/g, 'app-surface');
  content = content.replace(/dark-border/g, 'app-border');
  content = content.replace(/dark-text/g, 'app-text');
  content = content.replace(/dark-muted/g, 'app-muted');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
});
console.log(`Replaced in ${count} files.`);
