const fs = require('fs');
const path = require('path');
const cacheDir = path.resolve(__dirname, '../.wate_cache');
const files = fs.readdirSync(cacheDir);

// Find the most recently modified file in cache
let latestFile = null;
let latestTime = 0;
for (const f of files) {
  const stat = fs.statSync(path.join(cacheDir, f));
  if (stat.mtimeMs > latestTime) {
    latestTime = stat.mtimeMs;
    latestFile = f;
  }
}

if (!latestFile) {
  console.log('SHAKE_FAIL');
  process.exit(0);
}

const content = fs.readFileSync(path.join(cacheDir, latestFile), 'utf8');
if (content.includes('dead_177')) {
  console.log('SHAKE_FAIL');
} else if (content.includes('alive')) {
  console.log('SHAKE_PASS');
} else {
  console.log('SHAKE_FAIL');
}
