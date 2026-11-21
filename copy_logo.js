const fs = require('fs');
const path = require('path');

const userUploadedDir = 'C:\\Users\\fredo\\.gemini\\antigravity\\brain\\8898fc97-e091-4f8d-bc2f-d9568c4eb8a5\\.user_uploaded';
const assetsDir = path.join(__dirname, 'public', 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Find all logo files in .user_uploaded
if (fs.existsSync(userUploadedDir)) {
  const files = fs.readdirSync(userUploadedDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  if (files.length > 0) {
    files.sort((a, b) => fs.statSync(path.join(userUploadedDir, b)).mtime - fs.statSync(path.join(userUploadedDir, a)).mtime);
    const newestFile = path.join(userUploadedDir, files[0]);
    console.log('Copying newest logo from:', newestFile);
    fs.copyFileSync(newestFile, path.join(assetsDir, 'logo.jpg'));
    fs.copyFileSync(newestFile, path.join(assetsDir, 'logo.png'));
    fs.copyFileSync(newestFile, path.join(assetsDir, 'herbo-logo-gold.jpg'));
    console.log('Successfully copied to logo.jpg, logo.png, herbo-logo-gold.jpg');
    console.log('File size:', fs.statSync(path.join(assetsDir, 'logo.jpg')).size, 'bytes');
  } else {
    console.log('No files found in', userUploadedDir);
  }
} else {
  console.log('Directory not found:', userUploadedDir);
}
