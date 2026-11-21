/**
 * Herbo India - Concurrent Development Runner
 * Starts both backend (port 3000) and frontend (port 5173) simultaneously.
 */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('===============================================================');
console.log('🌿 Starting Herbo India Fullstack Development Services...');
console.log('===============================================================');

// Start Backend Process
const backend = spawn('node', ['server.js'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3000' }
});

// Start Frontend Process
const frontend = spawn('node', ['server.js'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '5173' }
});

function handleExit(code) {
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(code || 0);
}

process.on('SIGINT', () => handleExit(0));
process.on('SIGTERM', () => handleExit(0));
backend.on('close', (code) => {
  if (code !== 0) console.error(`Backend process exited with code ${code}`);
});
frontend.on('close', (code) => {
  if (code !== 0) console.error(`Frontend process exited with code ${code}`);
});
