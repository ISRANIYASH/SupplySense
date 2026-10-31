const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getVenvInfo } = require('./resolve-python');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const envInfo = getVenvInfo(rootDir);

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || '8000';

let cmd, args;
if (fs.existsSync(envInfo.uvicornPath)) {
  cmd = envInfo.uvicornPath;
  args = ['main:app', '--reload', '--host', host, '--port', String(port)];
} else {
  cmd = envInfo.pythonPath;
  args = ['-m', 'uvicorn', 'main:app', '--reload', '--host', host, '--port', String(port)];
}

console.log(`[API] Starting FastAPI using ${cmd} on http://${host}:${port}`);
const proc = spawn(cmd, args, {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, PYTHONUNBUFFERED: '1' }
});

proc.on('close', (code) => {
  process.exit(code || 0);
});

// Clean shutdown on SIGINT/SIGTERM
process.on('SIGINT', () => {
  proc.kill('SIGINT');
});
process.on('SIGTERM', () => {
  proc.kill('SIGTERM');
});
