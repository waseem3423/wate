const { spawn } = require('child_process');

const repl = spawn('node', ['wate.js']);

let output = '';
repl.stdout.on('data', (data) => {
    output += data.toString();
    console.log("📥 [REPL STDOUT]:", data.toString());
});

repl.stderr.on('data', (data) => {
    console.error("🔥 [REPL STDERR]:", data.toString());
});

// 1. Declare dynamic variable in persistent context session
setTimeout(() => {
    console.log("📤 Sending: set dynamicVar = 250");
    repl.stdin.write("set dynamicVar = 250\n");
}, 500);

// 2. Read and perform arithmetic, proving persistent memory!
setTimeout(() => {
    console.log("📤 Sending: dynamicVar * 2");
    repl.stdin.write("dynamicVar * 2\n");
}, 1000);

// 3. Send unclosed multi-line block!
setTimeout(() => {
    console.log("📤 Sending unclosed block: fn multiLineTest() {");
    repl.stdin.write("fn multiLineTest() {\n");
}, 1500);

// 4. Send closing block statement
setTimeout(() => {
    console.log("📤 Sending close block: out(\"Success!\") }");
    repl.stdin.write("out(\"Success!\") }\n");
}, 2000);

// 5. Invoke the declared multi-line function!
setTimeout(() => {
    console.log("📤 Sending invocation: multiLineTest()");
    repl.stdin.write("multiLineTest()\n");
}, 2500);

// 6. Query interactive .scope helper!
setTimeout(() => {
    console.log("📤 Sending helper command: .scope");
    repl.stdin.write(".scope\n");
}, 3000);

// 7. Close REPL and verify output strings
setTimeout(() => {
    console.log("📤 Sending: exit");
    repl.stdin.write("exit\n");
}, 3500);

setTimeout(() => {
    console.log("\n📊 REPL Verification Checks:");
    const hasPersistence = output.includes('=> 500');
    const hasMultiLine = output.includes('Success!');
    const hasScope = output.includes('dynamicVar = 250');
    
    console.log(`  🔹 Persistent Memory: ${hasPersistence ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`  🔹 Multi-line Indents: ${hasMultiLine ? "PASS ✅" : "FAIL ❌"}`);
    console.log(`  🔹 .scope Helper Query: ${hasScope ? "PASS ✅" : "FAIL ❌"}`);
    
    repl.kill();
    process.exit((hasPersistence && hasMultiLine && hasScope) ? 0 : 1);
}, 4500);
