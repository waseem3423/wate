const fs = require('fs');
const path = require('path');
const { parseWate } = require('./wate-parser');

class WateLanguageServer {
  constructor() {
    this.buffer = '';
  }

  start() {
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      this.buffer += chunk;
      this.handleBuffer();
    });
  }

  handleBuffer() {
    while (true) {
      const clIndex = this.buffer.indexOf('Content-Length:');
      if (clIndex === -1) break;

      const headerEnd = this.buffer.indexOf('\r\n\r\n', clIndex);
      if (headerEnd === -1) break;

      const lengthStr = this.buffer.substring(clIndex + 15, headerEnd).trim();
      const contentLength = parseInt(lengthStr, 10);

      const messageStart = headerEnd + 4;
      if (this.buffer.length < messageStart + contentLength) {
        break; // Wait for more data
      }

      const rawMessage = this.buffer.substring(messageStart, messageStart + contentLength);
      this.buffer = this.buffer.substring(messageStart + contentLength);

      try {
        const msg = JSON.parse(rawMessage);
        this.handleMessage(msg);
      } catch (err) {
        this.log(`Error parsing LSP message: ${err.message}`);
      }
    }
  }

  handleMessage(msg) {
    if (msg.method === 'initialize') {
      this.sendResponse(msg.id, {
        capabilities: {
          textDocumentSync: 1, // Full synchronization
          hoverProvider: true,
          completionProvider: {
            resolveProvider: false,
            triggerCharacters: ['.', ':']
          }
        }
      });
      return;
    }

    if (msg.method === 'textDocument/didOpen' || msg.method === 'textDocument/didChange') {
      const params = msg.params;
      const doc = params.textDocument;
      const uri = doc.uri;
      const text = doc.text || (params.contentChanges && params.contentChanges[0].text);
      if (text !== undefined) {
        this.validateDocument(uri, text);
      }
      return;
    }

    if (msg.method === 'textDocument/hover') {
      this.sendResponse(msg.id, {
        contents: {
          kind: 'markdown',
          value: `### WATE Language Server\n* **Status**: Connected & active\n* **Diagnostics**: Real-time syntax check verified\n* **Type**: Dynamic lookup standard symbol`
        }
      });
      return;
    }

    if (msg.method === 'textDocument/completion') {
      const completions = [
        { label: 'set', kind: 14, detail: 'Variable declaration keyword' },
        { label: 'const', kind: 14, detail: 'Constant variable declaration' },
        { label: 'fn', kind: 3, detail: 'Function declaration keyword' },
        { label: 'out', kind: 3, detail: 'Standard output print method' },
        { label: 'every', kind: 3, detail: 'Pythonic job scheduler' },
        { label: 'if', kind: 14, detail: 'Conditional statement block' },
        { label: 'else', kind: 14, detail: 'Conditional alternative block' },
        { label: 'while', kind: 14, detail: 'Conditional while loop' },
        { label: 'repeat', kind: 14, detail: 'Count loop' },
        { label: 'foreach', kind: 14, detail: 'Collection iteration loop' },
        { label: 'class', kind: 7, detail: 'OOP Class declaration' }
      ];
      this.sendResponse(msg.id, completions);
      return;
    }

    if (msg.id !== undefined) {
      this.sendResponse(msg.id, null);
    }
  }

  validateDocument(uri, text) {
    const diagnostics = [];
    try {
      parseWate(text, uri);
    } catch (err) {
      if (err.name === 'WateSyntaxError') {
        const token = err.token;
        const line = token ? token.line - 1 : 0;
        const col = token ? token.col - 1 : 0;
        diagnostics.push({
          range: {
            start: { line, character: col },
            end: { line, character: col + (token ? String(token.value).length : 1) }
          },
          severity: 1, // Error severity
          source: 'WATE LSP Server',
          message: err.message
        });
      }
    }

    this.sendNotification('textDocument/publishDiagnostics', {
      uri,
      diagnostics
    });
  }

  sendResponse(id, result) {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id,
      result
    });
    this.sendRaw(body);
  }

  sendNotification(method, params) {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params
    });
    this.sendRaw(body);
  }

  sendRaw(body) {
    const cl = Buffer.byteLength(body, 'utf8');
    const response = `Content-Length: ${cl}\r\n\r\n${body}`;
    process.stdout.write(response);
  }

  log(msg) {
    this.sendNotification('window/logMessage', {
      type: 4,
      message: `[WATE LSP] ${msg}`
    });
  }
}

module.exports = WateLanguageServer;
