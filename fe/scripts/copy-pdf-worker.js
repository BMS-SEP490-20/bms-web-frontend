const fs = require('fs');
const path = require('path');

function copyWorker() {
  const projectRoot = path.resolve(__dirname, '..');
  const src = path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
  const destDir = path.join(projectRoot, 'public');
  const dest = path.join(destDir, 'pdf.worker.min.js');

  if (!fs.existsSync(src)) {
    console.warn('pdf.worker not found at', src);
    console.warn('Make sure `pdfjs-dist` is installed (npm i pdfjs-dist)');
    return;
  }

  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log('Copied pdf.worker.min.js to', dest);
  } catch (err) {
    console.error('Failed to copy pdf.worker:', err);
    process.exitCode = 2;
  }
}

if (require.main === module) {
  copyWorker();
}

module.exports = { copyWorker };
