const { spawn } = require('child_process');

const lsp = spawn('node', ['wate.js', '--lsp']);

let output = '';
lsp.stdout.on('data', (data) => {
    output += data.toString();
    console.log("📥 [LSP STDOUT OUTPUT]:", data.toString());
});

lsp.stderr.on('data', (data) => {
    console.error("🔥 [LSP STDERR]:", data.toString());
});

// 1. Send Initialize Request
const initMsg = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {}
});
const initFrame = `Content-Length: ${Buffer.byteLength(initMsg, 'utf8')}\r\n\r\n${initMsg}`;
console.log("📤 Sending: initialize");
lsp.stdin.write(initFrame);

// 2. Wait 500ms and send a malformed didOpen document notification containing a syntax error!
setTimeout(() => {
    const errorScript = `set x = 10\nset y = 20\nconst z = \n`; // syntax error at line 3 column 10 (missing expression)
    const openMsg = JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
            textDocument: {
                uri: "file:///test.wate",
                languageId: "wate",
                version: 1,
                text: errorScript
            }
        }
    });
    const openFrame = `Content-Length: ${Buffer.byteLength(openMsg, 'utf8')}\r\n\r\n${openMsg}`;
    console.log("📤 Sending: didOpen with malformed WATE syntax");
    lsp.stdin.write(openFrame);
}, 500);

// 3. Wait 1500ms and kill LSP server
setTimeout(() => {
    console.log("\n🛑 Terminating LSP check. Active output received:", output.includes('textDocument/publishDiagnostics') ? "YES (Diagnostics OK!)" : "NO");
    lsp.kill();
    process.exit(output.includes('textDocument/publishDiagnostics') ? 0 : 1);
}, 2000);
