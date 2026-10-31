const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getVenvInfo } = require('./resolve-python');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const backendOnly = args.includes('--backend-only');
const frontendOnly = args.includes('--frontend-only');

console.log('==> SupplySense Setup starting...\n');

// 1. Python virtual environment & backend setup
if (!frontendOnly) {
  let envInfo = getVenvInfo(rootDir);
  if (!envInfo.exists) {
    console.log(`==> No virtual environment found. Creating venv at: ${envInfo.venvDir}`);
    const venvRes = spawnSync('python', ['-m', 'venv', envInfo.venvDir], { stdio: 'inherit' });
    if (venvRes.status !== 0) {
      console.error('[ERROR] Failed to create Python virtual environment.');
      process.exit(venvRes.status || 1);
    }
    envInfo = getVenvInfo(rootDir);
  } else {
    console.log(`==> Using existing virtual environment at: ${envInfo.venvDir}`);
  }

  console.log('\n==> Installing backend Python dependencies...');
  const reqFile = path.join(rootDir, 'backend', 'requirements.txt');
  const pipRes = spawnSync(envInfo.pythonPath, ['-m', 'pip', 'install', '-r', reqFile], {
    cwd: path.join(rootDir, 'backend'),
    stdio: 'inherit'
  });

  if (pipRes.status !== 0) {
    console.error('\n[ERROR] Python dependencies installation failed with exit code ' + pipRes.status);
    process.exit(pipRes.status || 1);
  }
  console.log('==> Python dependencies verified successfully.');
}

// 2. Node / Frontend dependencies setup
if (!backendOnly) {
  console.log('\n==> Installing Node/frontend workspace dependencies...');
  const isWin = process.platform === 'win32';
  const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';
  const pnpmRes = spawnSync(pnpmCmd, ['install'], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (pnpmRes.status !== 0) {
    console.error('\n[ERROR] pnpm install failed with exit code ' + pnpmRes.status);
    process.exit(pnpmRes.status || 1);
  }
  console.log('==> Node/frontend dependencies verified successfully.');
}

console.log('\n==> Setup completed successfully!');
console.log('You can now run: npm run dev\n');
