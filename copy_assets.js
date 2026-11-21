const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\fredo\\.gemini\\antigravity\\brain\\8898fc97-e091-4f8d-bc2f-d9568c4eb8a5';
const destDir = path.join(__dirname, 'public', 'assets', 'products');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyLatest(prefix, targetName) {
  try {
    const files = fs.readdirSync(brainDir).filter(f => f.startsWith(prefix) && f.endsWith('.jpg'));
    if (files.length > 0) {
      files.sort((a, b) => fs.statSync(path.join(brainDir, b)).mtime - fs.statSync(path.join(brainDir, a)).mtime);
      const src = path.join(brainDir, files[0]);
      const dest = path.join(destDir, targetName);
      fs.copyFileSync(src, dest);
      console.log(`Copied ${files[0]} -> ${targetName}`);
    } else {
      console.log(`No files found for prefix: ${prefix}`);
    }
  } catch (e) {
    console.error('Error copying:', e.message);
  }
}

copyLatest('tablets_', 'tablets.jpg');
copyLatest('oil_', 'oil.jpg');
copyLatest('cream_', 'cream.jpg');
copyLatest('combo_', 'combo.jpg');
