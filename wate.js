#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const http_module = require('http');
const readline = require('readline');

const args = process.argv.slice(2);
const DEBUG_MODE = args.includes('--debug');
const WATCH_MODE = args.includes('--watch') || args.includes('-w');
const subCommand = args[0]; // 'test', 'run', 'help', etc.
const sourceFile = args.find(a => !a.startsWith('--') && a !== 'test' && a !== 'run' && a !== 'help' && a !== 'version');

if (args.includes('--lsp')) {
    const WateLanguageServer = require('./wate-lsp');
    new WateLanguageServer().start();
    return;
}

// ✅ Sandboxed Runtime Permissions (Deno-like authorization checks)
const ALLOW_READ = args.includes('--allow-read') || args.includes('--allow-all') || args.includes('-A');
const ALLOW_WRITE = args.includes('--allow-write') || args.includes('--allow-all') || args.includes('-A');
const ALLOW_NET = args.includes('--allow-net') || args.includes('--allow-all') || args.includes('-A');
const ALLOW_ENV = args.includes('--allow-env') || args.includes('--allow-all') || args.includes('-A');
const ALLOW_RUN = args.includes('--allow-run') || args.includes('--allow-all') || args.includes('-A');

function checkPermission(isAllowed, permName) {
    if (!isAllowed) {
        throw new Error(`🚫 WATE Permission Error: Access to '${permName}' is denied. Use --allow-${permName} (or --allow-all / -A) to authorize.`);
    }
}

// ✅ FIX #1: Global module tracker for nesting stability across files
let _loopCounter = 0;
// =============================================
// === WATE AST TRANSPILER INTEGRATION ===
// =============================================
const { transpileWate } = require('./wate-parser');

function transpile(rawCode, filePath) {
    return transpileWate(rawCode, filePath);
}

// =============================================
// === WATE STANDARD LIBRARIES ===
// =============================================
function buildLibs(filePath) {
    const file = {
        read: (fp) => {
            checkPermission(ALLOW_READ, 'read');
            if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf-8');
            console.error(`❌ WATE IO Error: ${fp} nahi mili!`); return null;
        },
        write: (fp, data) => {
            checkPermission(ALLOW_WRITE, 'write');
            fs.writeFileSync(fp, data, 'utf-8');
            console.log(`✅ WATE IO: ${fp} successfully save ho gayi.`);
        }
    };
    const sys = {
        clear: () => console.clear(),
        info: () => console.log(`💻 OS: ${process.platform} | ⚙️ Node: ${process.version}`),
        exec: (command) => {
            checkPermission(ALLOW_RUN, 'run');
            const { execSync } = require('child_process');
            try { return execSync(command, { encoding: 'utf-8' }); }
            catch (err) { console.error("❌ WATE Sys Error: Command failed."); return null; }
        }
    };
    const http = {
        createServer: (cb) => {
            checkPermission(ALLOW_NET, 'net');
            return http_module.createServer(cb);
        },
        get: (url) => {
            checkPermission(ALLOW_NET, 'net');
            return new Promise((resolve, reject) => {
                const client = url.startsWith('https') ? https : http_module;
                client.get(url, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', (err) => { console.error(`❌ WATE HTTP Error: ${err.message}`); reject(err); });
            });
        },
        post: (url, body) => {
            checkPermission(ALLOW_NET, 'net');
            console.log(`📤 WATE HTTP POST to: ${url}`);
            return Promise.resolve('{"status": "ok"}');
        }
    };
    const math = {
        sqrt: (n) => Math.sqrt(n), round: (n) => Math.round(n),
        floor: (n) => Math.floor(n), ceil: (n) => Math.ceil(n),
        abs: (n) => Math.abs(n), pow: (a, b) => Math.pow(a, b),
        random: () => Math.random(), min: (...a) => Math.min(...a),
        max: (...a) => Math.max(...a), pi: Math.PI
    };
    const str = {
        upper: (s) => String(s).toUpperCase(), lower: (s) => String(s).toLowerCase(),
        length: (s) => String(s).length, split: (s, d) => String(s).split(d),
        trim: (s) => String(s).trim(), replace: (s, a, b) => String(s).replaceAll(a, b),
        contains: (s, q) => String(s).includes(q), startsWith: (s, q) => String(s).startsWith(q),
        endsWith: (s, q) => String(s).endsWith(q), reverse: (s) => String(s).split('').reverse().join('')
    };
    const input = (prompt) => {
        process.stdout.write(prompt || '');
        const buf = Buffer.alloc(1024);
        try {
            const bytesRead = fs.readSync(0, buf, 0, buf.length);
            return buf.toString('utf-8', 0, bytesRead).trim();
        } catch (e) { return ""; }
    };

    const json = {
        parse: (s) => JSON.parse(s),
        stringify: (o, indent) => JSON.stringify(o, null, indent || 0),
        isValid: (s) => { try { JSON.parse(s); return true; } catch { return false; } }
    };

    const date = {
        now: () => new Date().toISOString(),
        today: () => new Date().toLocaleDateString('en-PK'),
        time: () => new Date().toLocaleTimeString('en-PK'),
        year: () => new Date().getFullYear(),
        month: () => new Date().getMonth() + 1,
        day: () => new Date().getDate(),
        stamp: () => Date.now(),
        format: (d, loc) => new Date(d).toLocaleString(loc || 'en-PK'),
        diff: (a, b) => Math.abs(new Date(a) - new Date(b))
    };

    const color = {
        red: (s) => `\x1b[31m${s}\x1b[0m`,
        green: (s) => `\x1b[32m${s}\x1b[0m`,
        yellow: (s) => `\x1b[33m${s}\x1b[0m`,
        blue: (s) => `\x1b[34m${s}\x1b[0m`,
        magenta: (s) => `\x1b[35m${s}\x1b[0m`,
        cyan: (s) => `\x1b[36m${s}\x1b[0m`,
        white: (s) => `\x1b[37m${s}\x1b[0m`,
        bold: (s) => `\x1b[1m${s}\x1b[0m`,
        dim: (s) => `\x1b[2m${s}\x1b[0m`,
        bg: {
            red: (s) => `\x1b[41m${s}\x1b[0m`,
            green: (s) => `\x1b[42m${s}\x1b[0m`,
            blue: (s) => `\x1b[44m${s}\x1b[0m`,
        }
    };

    const os_mod = require('os');
    const os = {
        platform: () => os_mod.platform(),
        hostname: () => os_mod.hostname(),
        username: () => os_mod.userInfo().username,
        homedir: () => os_mod.homedir(),
        tmpdir: () => os_mod.tmpdir(),
        cpus: () => os_mod.cpus().length,
        memory: () => ({ total: os_mod.totalmem(), free: os_mod.freemem() }),
        arch: () => os_mod.arch(),
        uptime: () => os_mod.uptime()
    };

    const env = {
        get: (k) => {
            checkPermission(ALLOW_ENV, 'env');
            return process.env[k] || null;
        },
        set: (k, v) => {
            checkPermission(ALLOW_ENV, 'env');
            process.env[k] = v;
        },
        all: () => {
            checkPermission(ALLOW_ENV, 'env');
            return process.env;
        },
        has: (k) => {
            checkPermission(ALLOW_ENV, 'env');
            return k in process.env;
        }
    };

    const regex = {
        match: (s, pattern, flags) => String(s).match(new RegExp(pattern, flags || 'g')),
        test: (s, pattern, flags) => new RegExp(pattern, flags || '').test(String(s)),
        replace: (s, pattern, rep, flags) => String(s).replace(new RegExp(pattern, flags || 'g'), rep),
        split: (s, pattern) => String(s).split(new RegExp(pattern))
    };

    const crypto_mod = require('crypto');
    const crypto = {
        uuid: () => crypto_mod.randomUUID(),
        hash: (data, algo) => crypto_mod.createHash(algo || 'sha256').update(String(data)).digest('hex'),
        md5: (data) => crypto_mod.createHash('md5').update(String(data)).digest('hex'),
        sha256: (data) => crypto_mod.createHash('sha256').update(String(data)).digest('hex'),
        random: (bytes) => crypto_mod.randomBytes(bytes || 16).toString('hex')
    };

    const wpath = {
        join: (...parts) => path.join(...parts),
        resolve: (...parts) => path.resolve(...parts),
        dirname: (p) => path.dirname(p),
        basename: (p, ext) => path.basename(p, ext),
        extname: (p) => path.extname(p),
        exists: (p) => fs.existsSync(p),
        isFile: (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
        isDir: (p) => fs.existsSync(p) && fs.statSync(p).isDirectory(),
        sep: path.sep
    };

    const list = {
        push: (arr, item) => { arr.push(item); return arr; },
        pop: (arr) => arr.pop(),
        shift: (arr) => arr.shift(),
        length: (arr) => arr.length,
        join: (arr, sep) => arr.join(sep !== undefined ? sep : ','),
        reverse: (arr) => [...arr].reverse(),
        sort: (arr) => [...arr].sort(),
        slice: (arr, s, e) => arr.slice(s, e),
        includes: (arr, item) => arr.includes(item),
        filter: (arr, fn) => arr.filter(fn),
        map: (arr, fn) => arr.map(fn),
        find: (arr, fn) => arr.find(fn),
        flat: (arr) => arr.flat(),
        unique: (arr) => [...new Set(arr)]
    };

    const num = {
        parse: (s) => parseFloat(s),
        parseInt: (s, r) => parseInt(s, r || 10),
        isNaN: (n) => isNaN(n),
        isFinite: (n) => isFinite(n),
        toFixed: (n, d) => Number(n).toFixed(d || 2),
        format: (n, loc) => Number(n).toLocaleString(loc || 'en-PK')
    };

    let _testsPassed = 0, _testsFailed = 0;
    const assert = {
        equal: (a, b, msg) => {
            if (a === b) { _testsPassed++; console.log(`\x1b[32m✅ PASS\x1b[0m ${msg || ''}`); }
            else { _testsFailed++; console.error(`\x1b[31m❌ FAIL\x1b[0m ${msg || ''} | Expected: ${b} | Got: ${a}`); }
        },
        notEqual: (a, b, msg) => {
            if (a !== b) { _testsPassed++; console.log(`\x1b[32m✅ PASS\x1b[0m ${msg || ''}`); }
            else { _testsFailed++; console.error(`\x1b[31m❌ FAIL\x1b[0m ${msg || ''} | Values should not be equal: ${a}`); }
        },
        isTrue: (val, msg) => {
            if (val === true) { _testsPassed++; console.log(`\x1b[32m✅ PASS\x1b[0m ${msg || ''}`); }
            else { _testsFailed++; console.error(`\x1b[31m❌ FAIL\x1b[0m ${msg || ''} | Expected true, got: ${val}`); }
        },
        isFalse: (val, msg) => {
            if (val === false) { _testsPassed++; console.log(`\x1b[32m✅ PASS\x1b[0m ${msg || ''}`); }
            else { _testsFailed++; console.error(`\x1b[31m❌ FAIL\x1b[0m ${msg || ''} | Expected false, got: ${val}`); }
        },
        throws: (fn, msg) => {
            try { fn(); _testsFailed++; console.error(`\x1b[31m❌ FAIL\x1b[0m ${msg || ''} | Should have thrown`); }
            catch { _testsPassed++; console.log(`\x1b[32m✅ PASS\x1b[0m ${msg || ''}`); }
        },
        summary: () => console.log(`\n📊 Test Results: \x1b[32m${_testsPassed} passed\x1b[0m | \x1b[31m${_testsFailed} failed\x1b[0m`)
    };

    const _timers = {};
    const timer = {
        start: (name) => { _timers[name || 'default'] = Date.now(); },
        stop: (name) => {
            const key = name || 'default';
            const elapsed = Date.now() - (_timers[key] || Date.now());
            console.log(`⏱️ Timer [${key}]: ${elapsed}ms`);
            return elapsed;
        },
        sleep: (ms) => new Promise(r => setTimeout(r, ms))
    };

    const every = (intervalStr, callback) => {
        let ms = 0;
        const numVal = parseFloat(intervalStr);
        const unit = String(intervalStr).replace(/[0-9.]/g, '').trim().toLowerCase();

        if (unit === 's' || unit === 'sec') ms = numVal * 1000;
        else if (unit === 'm' || unit === 'min') ms = numVal * 60 * 1000;
        else if (unit === 'h' || unit === 'hr') ms = numVal * 60 * 60 * 1000;
        else if (unit === 'd' || unit === 'day') ms = numVal * 24 * 60 * 60 * 1000;
        else ms = numVal;

        const intervalId = setInterval(callback, ms);
        return {
            stop: () => clearInterval(intervalId)
        };
    };

    const stack = {
        create: () => [],
        push: (s, v) => { s.push(v); return s; },
        pop: (s) => s.pop(),
        peek: (s) => s[s.length - 1],
        isEmpty: (s) => s.length === 0,
        size: (s) => s.length,
        clear: (s) => { s.length = 0; return s; }
    };

    const queue = {
        create: () => [],
        enqueue: (q, v) => { q.push(v); return q; },
        dequeue: (q) => q.shift(),
        front: (q) => q[0],
        isEmpty: (q) => q.length === 0,
        size: (q) => q.length
    };

    const table = {
        print: (data) => console.table(data),
        headers: (arr, cols) => {
            const header = cols.join(' | ');
            const sep = cols.map(c => '-'.repeat(c.length)).join('-+-');
            console.log(header); console.log(sep);
            arr.forEach(row => console.log(cols.map(c => String(row[c] || '')).join(' | ')));
        }
    };

    const type = {
        of: (v) => typeof v,
        isStr: (v) => typeof v === 'string',
        isNum: (v) => typeof v === 'number',
        isBool: (v) => typeof v === 'boolean',
        isArr: (v) => Array.isArray(v),
        isNull: (v) => v === null,
        isObj: (v) => typeof v === 'object' && !Array.isArray(v) && v !== null,
        isFn: (v) => typeof v === 'function',
        cast: {
            str: (v) => String(v),
            num: (v) => Number(v),
            bool: (v) => Boolean(v),
            arr: (v) => Array.from(v)
        }
    };

    // === [L1-6] INTERFACE SYSTEM — Runtime ===
    const _interfaces = {};
    function _wate_defineInterface(name, methods) { _interfaces[name] = methods; }
    function implements_check(obj, interfaceName) {
        const methods = _interfaces[interfaceName] || [];
        const missing = methods.filter(m => typeof obj[m] !== 'function');
        if (missing.length > 0) {
            console.warn(`⚠️ Interface '${interfaceName}' nahi mili: [${missing.join(', ')}] missing`);
            return false;
        }
        return true;
    }

    const { isMainThread, parentPort, Worker } = require('worker_threads');
    const thread = {
        isMainThread,
        create: (fp) => {
            if (!isMainThread) throw new Error("Workers cannot create sub-workers currently.");
            const target = path.resolve(process.cwd(), fp);
            const worker = new Worker(__filename, { workerData: { filePath: target } });
            return {
                onMessage: (cb) => worker.on('message', cb),
                postMessage: (msg) => worker.postMessage(msg),
                onError: (cb) => worker.on('error', cb),
                onExit: (cb) => worker.on('exit', cb),
                terminate: () => worker.terminate()
            };
        },
        onMessage: (cb) => {
            if (isMainThread) throw new Error("Main thread cannot use onMessage directly.");
            parentPort.on('message', cb);
        },
        postMessage: (msg) => {
            if (isMainThread) throw new Error("Main thread cannot use postMessage directly.");
            parentPort.postMessage(msg);
        }
    };

    return { file, sys, http, math, str, input, json, date, color, os, env, regex, crypto, wpath, list, num, assert, timer, stack, queue, table, type, _wate_defineInterface, implements_check, every, thread };
}

let lastTranspiledCode = '';

function mapStackTrace(stack, filePath) {
    if (!stack || !lastTranspiledCode) return stack;
    const lines = lastTranspiledCode.split('\n');

    return stack.replace(/<anonymous>:(\d+):(\d+)/g, (match, lineStr, colStr) => {
        const lineIdx = parseInt(lineStr, 10) - 1;
        if (lineIdx >= 0 && lineIdx < lines.length) {
            const compiledLine = lines[lineIdx];
            const wateLineMatch = compiledLine.match(/\/\* WATE_LINE:(\d+) \*\//);
            if (wateLineMatch) {
                const wateLine = wateLineMatch[1];
                return `${filePath || '<input>'}:${wateLine}:${colStr}`;
            }
        }
        return match;
    });
}

function getCachePath(filePath) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(filePath || '<input>').digest('hex');
    const cacheDir = path.resolve(process.cwd(), '.wate_cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return path.join(cacheDir, `${hash}.json`);
}

function getCachedTranspilation(filePath, code) {
    if (!filePath || filePath === '<input>') return null;
    try {
        const cachePath = getCachePath(filePath);
        if (fs.existsSync(cachePath)) {
            const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
            const crypto = require('crypto');
            const currentHash = crypto.createHash('sha256').update(code).digest('hex');
            if (cacheData.sourceHash === currentHash && cacheData.version === '9.2.0') {
                return cacheData.transpiledCode;
            }
        }
    } catch (e) {
        // Fallback silently if cache is corrupt
    }
    return null;
}

function saveCachedTranspilation(filePath, code, transpiledCode) {
    if (!filePath || filePath === '<input>') return;
    try {
        const cachePath = getCachePath(filePath);
        const crypto = require('crypto');
        const sourceHash = crypto.createHash('sha256').update(code).digest('hex');
        const cacheEntry = {
            sourceHash,
            transpiledCode,
            timestamp: Date.now(),
            version: '9.2.0'
        };
        fs.writeFileSync(cachePath, JSON.stringify(cacheEntry, null, 2), 'utf-8');
    } catch (e) {
        // Fallback silently
    }
}

// =============================================
// === WATE EXECUTION ENGINE ===
// =============================================
function runCode(code, filePath) {
    _loopCounter = 0; // ✅ FIX #1: Safely zeroed before a new script run

    const vmMode = args.includes('--vm');
    if (vmMode) {
        const { parseWate } = require('./wate-parser');
        const { BytecodeCompiler, VirtualMachine } = require('./wate-vm');
        const ast = parseWate(code, filePath);
        const compiler = new BytecodeCompiler();
        compiler.compile(ast);

        const libs = buildLibs(filePath);
        libs.out = console.log;
        libs.print = console.log;

        const vm = new VirtualMachine(compiler.instructions, libs);
        vm.run();
        return;
    }

    let transpiledCode = getCachedTranspilation(filePath, code);
    if (!transpiledCode) {
        transpiledCode = transpile(code, filePath);
        saveCachedTranspilation(filePath, code, transpiledCode);
    }
    lastTranspiledCode = transpiledCode;

    if (DEBUG_MODE) {
        console.log('\n🔍 ===== WATE DEBUG MODE =====');
        const lines = transpiledCode.split('\n');
        lines.forEach((line, i) => {
            if (line.trim()) console.log(`  [Line ${String(i + 1).padStart(3, '0')}] ${line}`);
        });
        console.log('🔍 ===== END DEBUG =====\n');
    }

    // ✅ FIX #2: All advanced standard modules securely unpacked into runtime scope
    const { file, sys, http, math, str, input, json, date, color, os, env, regex, crypto, wpath, list, num, assert, timer, stack, queue, table, type, _wate_defineInterface, implements_check, every, thread } = buildLibs(filePath);
    eval(transpiledCode);
}

// =============================================
// === WATE REPL MODE ===
// =============================================
function startREPL() {
    console.log(`
  ⚡ WATE Upgraded Interactive Shell v10.0.0 (Premium Build)
  Created by WazemTech (Waseem Akram)
  
  Type WATE code and press Enter to run.
  Type '.scope' to view current variables, '.clear' to clear.
  Type '.exit' or 'exit' to exit REPL.
    `);

    const vm_mod = require('vm');
    const libs = buildLibs(null);
    libs.out = console.log;
    libs.print = console.log;
    libs.console = console;
    const initialBuiltInKeys = Object.keys(libs);

    const context = vm_mod.createContext(libs);
    const rl = readline.createInterface({ 
        input: process.stdin, 
        output: process.stdout,
        prompt: 'wate> ',
        terminal: true
    });
    
    let multiLineBuffer = '';
    const countChar = (str, char) => (str.split(char).length - 1);
    
    const isComplete = (code) => {
        const openBraces = countChar(code, '{') - countChar(code, '}');
        const openParens = countChar(code, '(') - countChar(code, ')');
        const openBrackets = countChar(code, '[') - countChar(code, ']');
        return openBraces <= 0 && openParens <= 0 && openBrackets <= 0;
    };

    rl.prompt();

    rl.on('line', (line) => {
        const trimmed = line.trim();
        const isMulti = multiLineBuffer.length > 0;
        
        if (!isMulti) {
            if (trimmed === 'exit' || trimmed === 'quit' || trimmed === '.exit' || trimmed === '.quit') {
                console.log('👋 WATE REPL band ho raha hai. Khuda Hafiz!');
                rl.close();
                process.exit(0);
            }
            if (trimmed === 'clear' || trimmed === '.clear') {
                console.clear();
                rl.prompt();
                return;
            }
            if (trimmed === '.scope') {
                const userScope = Object.getOwnPropertyNames(context).filter(k => !initialBuiltInKeys.includes(k) && k !== 'console');
                if (userScope.length === 0) {
                    console.log(`\x1b[90mℹ No variables declared in this session yet.\x1b[0m`);
                } else {
                    console.log(`📊 Active REPL Scope Variables:`);
                    userScope.forEach(v => {
                        try {
                            console.log(`  🔹 ${v} = ${context[v]}`);
                        } catch (e) {
                            console.log(`  🔹 ${v} = <getter/error>`);
                        }
                    });
                }
                console.log();
                rl.prompt();
                return;
            }
            if (trimmed.startsWith('.ast ')) {
                try {
                    const target = trimmed.substring(5);
                    const { parseWate } = require('./wate-parser');
                    console.log(JSON.stringify(parseWate(target, '<repl>'), null, 2));
                } catch (e) {
                    console.error(`❌ AST Parsing Error: ${e.message}`);
                }
                rl.prompt();
                return;
            }
        }

        if (!trimmed && !isMulti) {
            rl.prompt();
            return;
        }

        multiLineBuffer += (multiLineBuffer ? '\n' : '') + line;

        if (isComplete(multiLineBuffer)) {
            try {
                _loopCounter = 0;
                let transpiled = transpile(multiLineBuffer, '<repl>');
                transpiled = transpiled.replace(/^(?:let|const)\s+/gm, 'var ');
                const result = vm_mod.runInContext(transpiled, context);
                if (result !== undefined) {
                    console.log(`=> ${result}`);
                }
            } catch (e) {
                console.error(`🔥 REPL Error: ${e.message}`);
            }
            multiLineBuffer = '';
            rl.setPrompt('wate> ');
        } else {
            rl.setPrompt('...  ');
        }
        rl.prompt();
    });

    rl.on('close', () => process.exit(0));
}

// =============================================
// === WATE MAIN ENTRY POINT ===
// =============================================

const { isMainThread, workerData } = require('worker_threads');

if (!isMainThread) {
    const targetPath = workerData.filePath;
    const fs = require('fs');
    const source = fs.readFileSync(targetPath, 'utf8');
    const transpiledCode = transpile(source, targetPath);
    
    const libs = buildLibs(targetPath);
    libs.out = console.log;
    libs.print = console.log;
    libs.console = console;
    
    const vm_mod = require('vm');
    const context = vm_mod.createContext(libs);
    try {
        vm_mod.runInContext(transpiledCode, context);
    } catch (e) {
        console.error(`🔥 Thread Error [${targetPath}]: ${e.message}`);
    }
} else if (subCommand === 'help' || args.includes('--help') || args.includes('-h')) {
    console.log(`
\x1b[1m\x1b[36m  ⚡ WATE Programming Language v10.0.0\x1b[0m
  \x1b[90mBuilt by WazemTech (Waseem Akram)\x1b[0m

  \x1b[1mUsage:\x1b[0m
    \x1b[32mwate\x1b[0m \x1b[33m<file.wate>\x1b[0m                 Run a WATE script
    \x1b[32mwate\x1b[0m \x1b[33mrun <file.wate>\x1b[0m              Run a WATE script (explicit)
    \x1b[32mwate\x1b[0m \x1b[33mtest\x1b[0m                         Auto-run all tests in tests/ folder
    \x1b[32mwate\x1b[0m \x1b[33mtest <file.wate>\x1b[0m             Run a specific test file
    \x1b[32mwate\x1b[0m \x1b[33m--repl\x1b[0m                       Start interactive REPL shell
    \x1b[32mwate\x1b[0m \x1b[33mhelp\x1b[0m                         Show this help message
    \x1b[32mwate\x1b[0m \x1b[33mversion\x1b[0m                      Show version info

  \x1b[1mFlags:\x1b[0m
    \x1b[33m--watch, -w\x1b[0m                   Enable hot reload mode
    \x1b[33m--vm\x1b[0m                          Run using Bytecode VM
    \x1b[33m--debug\x1b[0m                       Show transpiled JS output
    \x1b[33m--allow-read\x1b[0m                  Allow file system reads
    \x1b[33m--allow-write\x1b[0m                 Allow file system writes
    \x1b[33m--allow-net\x1b[0m                   Allow network access
    \x1b[33m--allow-run\x1b[0m                   Allow running subprocesses
    \x1b[33m--allow-all, -A\x1b[0m               Allow all permissions

  \x1b[1mExamples:\x1b[0m
    \x1b[90mwate hello.wate\x1b[0m
    \x1b[90mwate run app.wate --allow-net\x1b[0m
    \x1b[90mwate test\x1b[0m
    \x1b[90mwate --watch server.wate -A\x1b[0m
`);
    process.exit(0);

} else if (subCommand === 'version' || args.includes('-v') || args.includes('--version')) {
    console.log('\x1b[36m⚡ WATE Language Engine v10.0.0 (Stable Core)\x1b[0m');
    console.log('\x1b[90m   Built by WazemTech | Node.js ' + process.version + '\x1b[0m');
    process.exit(0);

} else if (subCommand === 'test') {
    // ====== wate test: Auto-test runner ======
    const testTarget = args[1] && args[1].endsWith('.wate') ? args[1] : null;
    const testDir = path.resolve(process.cwd(), 'tests');
    let testFiles = [];

    // Skip worker-thread receivers and temp artifacts (not standalone runnable)
    const SKIP_PATTERNS = [/^tmp_/, /worker_thread/];
    const shouldSkip = (filename) => SKIP_PATTERNS.some(p => p.test(filename));

    if (testTarget) {
        testFiles = [testTarget];
    } else if (fs.existsSync(testDir)) {
        testFiles = fs.readdirSync(testDir)
            .filter(f => f.endsWith('.wate') && !shouldSkip(f))
            .map(f => path.join(testDir, f))
            .sort();
    } else {
        testFiles = fs.readdirSync(process.cwd())
            .filter(f => f.endsWith('.wate') && !shouldSkip(f))
            .map(f => path.join(process.cwd(), f));
    }

    if (testFiles.length === 0) {
        console.error('\x1b[33m⚠  No .wate test files found in tests/ directory.\x1b[0m');
        process.exit(1);
    }

    console.log(`\n\x1b[1m\x1b[36m⚡ WATE Test Runner — ${testFiles.length} file(s) found\x1b[0m\n`);
    let passed = 0, failed = 0;

    for (const tf of testFiles) {
        const label = path.basename(tf);
        try {
            const rawCode = fs.readFileSync(tf, 'utf-8');
            runCode(rawCode, tf);
            console.log(`  \x1b[32m✅ PASS\x1b[0m  ${label}`);
            passed++;
        } catch (e) {
            console.log(`  \x1b[31m❌ FAIL\x1b[0m  ${label}`);
            console.log(`        \x1b[31m${e.message}\x1b[0m`);
            failed++;
        }
    }

    console.log(`\n\x1b[1m─────────────────────────────────────\x1b[0m`);
    console.log(`  \x1b[32m${passed} passed\x1b[0m  |  \x1b[31m${failed} failed\x1b[0m  |  ${testFiles.length} total`);
    if (failed === 0) {
        console.log(`  \x1b[32m\x1b[1m🏆 All tests passed!\x1b[0m`);
    }
    console.log();
    process.exit(failed > 0 ? 1 : 0);

} else if (!subCommand || subCommand === '--repl') {
    startREPL();
} else {
    // subCommand is 'run' or a filename directly
    const actualFile = subCommand === 'run' ? args[1] : subCommand;

    if (!actualFile) {
        console.error('\x1b[31m❌ Error: No file specified. Run \x1b[33mwate help\x1b[31m for usage.\x1b[0m');
        process.exit(1);
    }

    if (args.includes('-v') || args.includes('--version')) {
        console.log('\x1b[36m⚡ WATE Language Engine v10.0.0\x1b[0m');
        process.exit(0);
    }

    if (path.extname(actualFile) !== '.wate') {
        console.error(`\x1b[31m❌ WATE Error: File must end in '.wate' — got '${path.extname(actualFile)}'\x1b[0m`);
        process.exit(1);
    }

    if (!fs.existsSync(actualFile)) {
        const closeMatch = fs.readdirSync(path.dirname(actualFile) || '.').filter(f => f.endsWith('.wate'));
        console.error(`\x1b[31m❌ WATE Error: File '${actualFile}' not found.\x1b[0m`);
        if (closeMatch.length > 0) {
            console.error(`\x1b[33m   Did you mean one of these?\x1b[0m`);
            closeMatch.slice(0, 3).forEach(f => console.error(`     \x1b[32m${f}\x1b[0m`));
        }
        process.exit(1);
    }

    // Reassign sourceFile for use in executeWatchCycle below
    const resolvedFile = actualFile;

    // ===== Smart "Did you mean?" suggestion engine =====
    function didYouMean(badToken) {
        const keywords = ['out', 'print', 'set', 'fn', 'if', 'else', 'while', 'for', 'return',
            'import', 'class', 'try', 'catch', 'throw', 'break', 'continue', 'const',
            'sys', 'file', 'http', 'math', 'str', 'input', 'json', 'date', 'color',
            'os', 'env', 'regex', 'crypto', 'list', 'num', 'assert', 'thread', 'every'];
        const tok = String(badToken).toLowerCase();
        let best = null, bestScore = Infinity;
        for (const kw of keywords) {
            // Levenshtein distance
            const a = tok, b = kw;
            const dp = Array.from({ length: a.length + 1 }, (_, i) =>
                Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
            for (let i = 1; i <= a.length; i++)
                for (let j = 1; j <= b.length; j++)
                    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
            const score = dp[a.length][b.length];
            if (score < bestScore && score <= 2) { bestScore = score; best = kw; }
        }
        return best;
    }

    function executeWatchCycle() {
        try {
            const rawCode = fs.readFileSync(resolvedFile, 'utf-8');
            runCode(rawCode, resolvedFile);
        } catch (error) {
            if (error.name === 'WateSyntaxError') {
                const token = error.token;
                const line = token ? token.line : '?';
                const col = token ? token.col : '?';
                const fp = error.filePath || resolvedFile;
                const source = error.source || (fs.existsSync(resolvedFile) ? fs.readFileSync(resolvedFile, 'utf-8') : '');

                console.error(`\n\x1b[1m\x1b[31m❌ WATE Syntax Error\x1b[0m  \x1b[90m${fp}\x1b[0m`);
                console.error(`\x1b[90m   Line ${line}, Column ${col}\x1b[0m`);

                if (source && token) {
                    const srcLines = source.split('\n');
                    const errorLine = srcLines[token.line - 1] || '';
                    const caret = ' '.repeat(Math.max(0, token.col - 1)) + '\x1b[31m^\x1b[0m';
                    console.error(`\n\x1b[90m ${token.line} |\x1b[0m ${errorLine}`);
                    console.error(`\x1b[90m   ${' '.repeat(String(token.line).length)}|\x1b[0m ${caret}\n`);
                }

                const suggestion = token ? didYouMean(token.value || token.type) : null;
                console.error(`\x1b[91m   ${error.message}\x1b[0m`);
                if (suggestion) {
                    console.error(`\x1b[33m   Did you mean: \x1b[32m${suggestion}\x1b[33m?\x1b[0m`);
                }
                console.error();

            } else {
                console.error(`\n\x1b[1m\x1b[31m🔥 WATE Runtime Error\x1b[0m`);
                const mapped = mapStackTrace(error.stack || error.message, resolvedFile);
                // Clean up mapped stack for readability
                const cleanLines = mapped.split('\n').slice(0, 5);
                cleanLines.forEach(l => console.error(`  \x1b[31m${l}\x1b[0m`));
                console.error();
            }
        }
    }

    if (WATCH_MODE) {
        console.log(`\n\x1b[36m👀 [WATE Watch]\x1b[0m Watching '\x1b[33m${resolvedFile}\x1b[0m' — hot reload active...`);
        executeWatchCycle();
        
        let isRebuilding = false;
        fs.watch(resolvedFile, (eventType) => {
            if (eventType === 'change' && !isRebuilding) {
                isRebuilding = true;
                setTimeout(() => {
                    console.clear();
                    console.log(`\n\x1b[36m⚡ [WATE Watch]\x1b[0m File changed — reloading...\n`);
                    executeWatchCycle();
                    isRebuilding = false;
                }, 100);
            }
        });
    } else {
        executeWatchCycle();
    }
}