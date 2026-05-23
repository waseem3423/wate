const { spawnSync } = require('child_process');
const res = spawnSync('node', ['wate.js', '--watch', 'tests/tmp_cache.wate'], { timeout: 1000 });
console.log(res.stdout ? res.stdout.toString() : '');
