const fs = require('fs');
const path = require('path');

function getVenvInfo(rootDir) {
  const root = rootDir || path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, 'venv'),
    path.join(root, 'backend', '.venv'),
    path.join(root, '.venv')
  ];

  const isWin = process.platform === 'win32';

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      const pythonPath = isWin
        ? path.join(cand, 'Scripts', 'python.exe')
        : path.join(cand, 'bin', 'python');
      const uvicornPath = isWin
        ? path.join(cand, 'Scripts', 'uvicorn.exe')
        : path.join(cand, 'bin', 'uvicorn');
      const pipPath = isWin
        ? path.join(cand, 'Scripts', 'pip.exe')
        : path.join(cand, 'bin', 'pip');

      if (fs.existsSync(pythonPath)) {
        return { venvDir: cand, pythonPath, uvicornPath, pipPath, exists: true };
      }
    }
  }

  // Fallback to system python
  return {
    venvDir: path.join(root, 'venv'),
    pythonPath: isWin ? 'python.exe' : 'python3',
    uvicornPath: isWin ? 'uvicorn.exe' : 'uvicorn',
    pipPath: isWin ? 'pip.exe' : 'pip',
    exists: false
  };
}

module.exports = { getVenvInfo };
