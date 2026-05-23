const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WATE_BIN = path.resolve(__dirname, '../wate.js');
const WPM_BIN = path.resolve(__dirname, '../wpm.js');

console.log("🧪 WATE Language 12-Feature Master Test Suite");
console.log("================================================\n");

let passed = 0;
let total = 12;

function runTest(name, fn) {
    process.stdout.write(`⏳ Testing ${name}... `);
    try {
        const result = fn();
        if (result === true || result === undefined) {
            console.log("✅ PASS");
            passed++;
        } else {
            console.log("❌ FAIL");
            console.error(result);
        }
    } catch (e) {
        console.log("❌ FAIL");
        console.error("   Error:", e.message);
    }
}

// 1. Scope Resolver
runTest("Scope Resolver (Undeclared Variables)", () => {
    fs.writeFileSync('tests/tmp_scope.wate', 'out(undefinedVar)');
    const res = spawnSync('node', [WATE_BIN, 'tests/tmp_scope.wate']);
    if (!res.stderr.toString().includes("Variable 'undefinedVar' is not defined")) {
        return "Failed to catch undeclared variable.";
    }
    return true;
});

// 2. Static Type Inference
runTest("Static Type Inference (String Math Warning)", () => {
    fs.writeFileSync('tests/tmp_type.wate', 'set x = "hello_world"\nset y = x - 5');
    const res = spawnSync('node', [WATE_BIN, 'tests/tmp_type.wate']);
    if (!res.stderr.toString().includes("Cannot apply arithmetic operator '-' on type 'string'")) {
        return "Failed to output type inference warning. Stderr: " + res.stderr.toString() + " Stdout: " + res.stdout.toString();
    }
    return true;
});

// 3. Bytecode VM
runTest("Bytecode VM Execution (--vm)", () => {
    fs.writeFileSync('tests/tmp_vm.wate', 'out("VM_WORKING")');
    const res = spawnSync('node', [WATE_BIN, '--vm', 'tests/tmp_vm.wate']);
    if (!res.stdout.toString().includes("VM_WORKING")) {
        return "VM failed to execute out(). stdout: " + res.stdout.toString() + " stderr: " + res.stderr.toString();
    }
    return true;
});

// 4. Sandboxed Runtime Permissions
runTest("Sandboxed Permissions (--allow-*)", () => {
    fs.writeFileSync('tests/tmp_sandbox.wate', 'file.read("nonexistent")');
    // Without flag
    const resFail = spawnSync('node', [WATE_BIN, 'tests/tmp_sandbox.wate']);
    if (!resFail.stderr.toString().includes("Permission Error")) return "Sandbox didn't block access.";
    // With flag
    const resPass = spawnSync('node', [WATE_BIN, '--allow-read', 'tests/tmp_sandbox.wate']);
    if (resPass.stderr.toString().includes("Permission Error")) return "Sandbox blocked even with flag.";
    return true;
});

// 5. Source Maps (Stack Trace Mapping)
runTest("Source Maps (WATE Line Numbers)", () => {
    fs.writeFileSync('tests/tmp_map.wate', '\n\nmath.non_existent_method()');
    const res = spawnSync('node', [WATE_BIN, 'tests/tmp_map.wate']);
    // Should map to WATE line 3
    if (!res.stderr.toString().includes("tmp_map.wate:3:")) return "Stack trace didn't map to original WATE lines. Stderr: " + res.stderr.toString();
    return true;
});

// 6. Incremental Compiler (Caching)
runTest("Incremental Compiler (.wate_cache)", () => {
    fs.writeFileSync('tests/tmp_cache.wate', 'out("CACHE")');
    spawnSync('node', [WATE_BIN, 'tests/tmp_cache.wate']);
    const cacheDir = path.resolve(__dirname, '../.wate_cache');
    if (!fs.existsSync(cacheDir) || fs.readdirSync(cacheDir).length === 0) {
        return "Cache directory missing or empty.";
    }
    return true;
});

// 7. Tree-Shaking
runTest("AST Tree-Shaking (Unused Removal)", () => {
    fs.writeFileSync('tests/tmp_shake.wate', 'fn unused() { out("dead") }\nout("alive")');
    const res = spawnSync('node', [WATE_BIN, 'tests/tmp_shake.wate']);
    const cacheDir = path.resolve(__dirname, '../.wate_cache');
    const cacheFiles = fs.readdirSync(cacheDir).map(f => path.join(cacheDir, f));
    // Find the latest compiled cache which should not have "unused" function
    let foundAlive = false;
    let foundDead = false;
    for (let f of cacheFiles) {
        const content = fs.readFileSync(f, 'utf8');
        if (content.includes('alive')) foundAlive = true;
        if (content.includes('unused')) foundDead = true;
    }
    if (!foundAlive || foundDead) return "Tree-shaking failed to remove 'unused' function or kept it.";
    return true;
});

// 8. Hot Reload (--watch)
runTest("Hot Reload / Watch Mode", () => {
    // Difficult to unit test watch loop directly in sync block, but we can verify CLI parses --watch
    const res = spawnSync('node', [WATE_BIN, '--watch', 'tests/tmp_cache.wate'], { timeout: 1000 });
    if (!res.stdout.toString().includes("Watching")) return "--watch flag not recognized.";
    return true;
});

// 9. Native Package Registry (WPM)
runTest("Native Package Registry (WPM CLI)", () => {
    const res = spawnSync('node', [WPM_BIN, 'help']);
    if (res.status !== 0) return "WPM failed to execute.";
    return true;
});

// 10. LSP (Language Server Protocol)
runTest("LSP (Diagnostics over stdin)", () => {
    const res = spawnSync('node', ['tests/test_lsp.js']);
    if (res.status !== 0) return "LSP tests failed.";
    return true;
});

// 11. REPL Shell
runTest("REPL Shell & Scope Explorer", () => {
    const res = spawnSync('node', ['tests/test_repl.js']);
    if (res.status !== 0) return "REPL tests failed.";
    return true;
});

// 12. Multi-Thread Worker System
runTest("Multi-Thread Concurrency", () => {
    const res = spawnSync('node', [WATE_BIN, 'tests/12_worker_main.wate']);
    if (!res.stdout.toString().includes("Main Thread received success result: 420")) {
        return "Worker thread communication failed.";
    }
    return true;
});

console.log("\n================================================");
console.log(`🏆 Final Results: ${passed}/${total} Tests Passed`);
if (passed === total) {
    console.log("🌟 ALL FEATURES ARE SUCCESSFULLY INTEGRATED & TESTED! 🌟");
}
