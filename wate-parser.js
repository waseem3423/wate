#!/usr/bin/env node
'use strict';

/**
 * WATE Recursive Descent AST Parser & Transpiler v10.5
 * ------------------------------------------------------------
 * Features:
 *  - Fully AST-based: Lexer -> Parser -> AST -> JS Code Generator
 *  - Premium Visual Errors with code caret pointing
 *  - Supports f-strings (single, double, and triple quotes) recursively
 *  - Labeled loops, guard clauses, match statements, list comprehensions
 *  - All Level 1 & Level 2 features fully covered with absolute stability
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Token Types
// ============================================================
const TT = Object.freeze({
  EOF: 'EOF',
  IDENT: 'IDENT',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  F_STRING: 'F_STRING',
  KEYWORD: 'KEYWORD',
  OP: 'OP',
  PUNC: 'PUNC',
  NEWLINE: 'NEWLINE'
});

const KEYWORDS = new Set([
  'set', 'const', 'fn', 'async', 'return',
  'if', 'else', 'elseif', 'elif', 'while', 'loop',
  'foreach', 'for', 'in', 'repeat', 'times',
  'import', 'try', 'catch', 'finally', 'throw', 'class', 'extends', 'static',
  'break', 'continue', 'await', 'do',
  'True', 'False', 'true', 'false', 'Null', 'None', 'null', 'Undefined', 'undefined',
  'and', 'or', 'not', 'is', 'guard', 'match', 'default',
  'interface', 'implements', 'method'
]);

const BOOLEAN_NULL_MAP = Object.freeze({
  True: 'true', False: 'false',
  true: 'true', false: 'false',
  Null: 'null', None: 'null', null: 'null',
  Undefined: 'undefined', undefined: 'undefined'
});

// ============================================================
// Premium Errors with Line Caret
// ============================================================
class WateSyntaxError extends Error {
  constructor(message, token, filePath, source = '') {
    super(message);
    this.name = 'WateSyntaxError';
    this.token = token;
    this.filePath = filePath;
    this.source = source;
  }
}

// ============================================================
// Lexer / Tokenizer
// ============================================================
class Lexer {
  constructor(input, filePath = '<input>') {
    this.input = String(input || '').replace(/\r\n/g, '\n');
    this.filePath = filePath;
    this.i = 0;
    this.line = 1;
    this.col = 1;
  }

  eof() { return this.i >= this.input.length; }
  peek(n = 0) { return this.input[this.i + n] || ''; }

  advance() {
    const ch = this.input[this.i++];
    if (ch === '\n') { this.line++; this.col = 1; }
    else this.col++;
    return ch;
  }

  token(type, value, line, col) {
    return { type, value, line, col };
  }

  isAlpha(ch) { return /[A-Za-z_]/.test(ch); }
  isDigit(ch) { return /[0-9]/.test(ch); }
  isAlphaNum(ch) { return /[A-Za-z0-9_]/.test(ch); }

  skipSpacesAndComments() {
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\v' || ch === '\f') {
        this.advance();
        continue;
      }
      if (ch === '#') {
        if (this.isAlpha(this.peek(1))) {
          break;
        }
        while (!this.eof() && this.peek() !== '\n') this.advance();
        continue;
      }
      break;
    }
  }

  readNumber() {
    const line = this.line, col = this.col;
    let value = '';
    while (!this.eof() && this.isDigit(this.peek())) value += this.advance();
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      value += this.advance();
      while (!this.eof() && this.isDigit(this.peek())) value += this.advance();
    }
    return this.token(TT.NUMBER, value, line, col);
  }

  readIdentifier() {
    const line = this.line, col = this.col;
    let value = '';
    while (!this.eof() && this.isAlphaNum(this.peek())) value += this.advance();
    return this.token(KEYWORDS.has(value) ? TT.KEYWORD : TT.IDENT, value, line, col);
  }

  readStringLiteral(isFString) {
    const line = this.line, col = this.col;
    const quote = this.peek();
    let isTriple = false;

    if (this.peek(0) === quote && this.peek(1) === quote && this.peek(2) === quote) {
      isTriple = true;
      this.advance(); this.advance(); this.advance();
    } else {
      this.advance();
    }

    let value = '';
    while (!this.eof()) {
      if (isTriple) {
        if (this.peek(0) === quote && this.peek(1) === quote && this.peek(2) === quote) {
          this.advance(); this.advance(); this.advance();
          return this.token(isFString ? TT.F_STRING : TT.STRING, value, line, col);
        }
      } else {
        if (this.peek() === quote) {
          this.advance();
          return this.token(isFString ? TT.F_STRING : TT.STRING, value, line, col);
        }
      }

      const nextCh = this.advance();
      if (nextCh === '\\') {
        const next = this.advance();
        const escapes = { n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"', "'": "'" };
        value += escapes[next] !== undefined ? escapes[next] : next;
      } else {
        value += nextCh;
      }
    }
    throw new WateSyntaxError(`Unterminated ${isFString ? 'f-' : ''}string literal`, { line, col }, this.filePath, this.input);
  }

  nextToken() {
    this.skipSpacesAndComments();
    if (this.eof()) return this.token(TT.EOF, '', this.line, this.col);

    const line = this.line, col = this.col;
    const ch = this.peek();

    if (ch === '\n') { this.advance(); return this.token(TT.NEWLINE, '\n', line, col); }

    // F-strings detection
    if (ch === 'f' && (this.peek(1) === '"' || this.peek(1) === "'")) {
      this.advance(); // consume 'f'
      return this.readStringLiteral(true);
    }

    if (ch === '#' && this.isAlpha(this.peek(1))) {
      this.advance();
      const line = this.line, col = this.col - 1;
      let value = '#';
      while (!this.eof() && this.isAlphaNum(this.peek())) {
        value += this.advance();
      }
      return this.token(TT.IDENT, value, line, col);
    }

    if (this.isDigit(ch)) return this.readNumber();
    if (this.isAlpha(ch)) return this.readIdentifier();
    if (ch === '"' || ch === "'") return this.readStringLiteral(false);

    const three = ch + this.peek(1) + this.peek(2);
    const two = ch + this.peek(1);
    const ops3 = ['===', '!=='];
    const ops2 = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '=>', '**', ':='];
    const singles = '{}[](),.;:?'; // ? added here
    const oneOps = '+-*/%<>=!.';

    if (ops3.includes(three)) {
      this.advance(); this.advance(); this.advance();
      return this.token(TT.OP, three, line, col);
    }
    if (ops2.includes(two)) {
      this.advance(); this.advance();
      return this.token(TT.OP, two, line, col);
    }
    if (singles.includes(ch)) {
      this.advance();
      return this.token(TT.PUNC, ch, line, col);
    }
    if (oneOps.includes(ch)) {
      this.advance();
      return this.token(TT.OP, ch, line, col);
    }

    throw new WateSyntaxError(`Unexpected character '${ch}'`, { line, col }, this.filePath, this.input);
  }

  tokenize() {
    const tokens = [];
    let t;
    do {
      t = this.nextToken();
      tokens.push(t);
    } while (t.type !== TT.EOF);
    return tokens;
  }
}

// ============================================================
// Parser
// ============================================================
class Parser {
  constructor(tokens, filePath = '<input>', source = '') {
    this.tokens = tokens;
    this.filePath = filePath;
    this.source = source;
    this.pos = 0;
  }

  current() { return this.tokens[this.pos] || this.tokens[this.tokens.length - 1]; }
  prev() { return this.tokens[this.pos - 1]; }
  eof() { return this.current().type === TT.EOF; }

  error(msg, token = this.current()) { throw new WateSyntaxError(msg, token, this.filePath, this.source); }

  match(type, value = null) {
    const t = this.current();
    if (t && t.type === type && (value === null || t.value === value)) {
      this.pos++;
      return t;
    }
    return null;
  }

  check(type, value = null) {
    const t = this.current();
    return t && t.type === type && (value === null || t.value === value);
  }

  expect(type, value = null, msg = null) {
    const t = this.match(type, value);
    if (!t) this.error(msg || `Expected ${value || type}, got '${this.current().value}'`);
    return t;
  }

  skipNewlines() { while (this.match(TT.NEWLINE)) {} }

  parseProgram() {
    const body = [];
    this.skipNewlines();
    while (!this.eof()) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    return { type: 'Program', body };
  }

  parseStatement() {
    this.skipNewlines();
    const t = this.current();

    // Labeled loop statement check (outer: loop...)
    if (t.type === TT.IDENT && this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === TT.PUNC && this.tokens[this.pos + 1].value === ':') {
      const label = this.expect(TT.IDENT).value;
      this.expect(TT.PUNC, ':');
      const body = this.parseStatement();
      return { type: 'LabeledStatement', label, body, loc: t };
    }

    if (this.check(TT.KEYWORD, 'set')) {
      const next1 = this.tokens[this.pos + 1];
      const next2 = this.tokens[this.pos + 2];
      if (next1 && next1.type === TT.IDENT && next2 && next2.type === TT.PUNC && (next2.value === '.' || next2.value === '[')) {
        this.pos++;
        const expr = this.parseExpression();
        this.match(TT.PUNC, ';');
        return { type: 'ExpressionStatement', expression: expr, loc: t };
      }
    }

    if (this.check(TT.KEYWORD, 'import')) return this.parseImport();
    if (this.check(TT.KEYWORD, 'set') || this.check(TT.KEYWORD, 'const')) return this.parseVariableDeclaration();
    if (this.check(TT.KEYWORD, 'async') || this.check(TT.KEYWORD, 'fn')) return this.parseFunctionDeclaration();
    if (this.check(TT.KEYWORD, 'return')) return this.parseReturn();
    if (this.check(TT.KEYWORD, 'break')) return this.parseBreak();
    if (this.check(TT.KEYWORD, 'continue')) return this.parseContinue();
    if (this.check(TT.KEYWORD, 'throw')) return this.parseThrow();
    if (this.check(TT.KEYWORD, 'do')) return this.parseDoWhile();
    if (this.check(TT.KEYWORD, 'if')) return this.parseIf();
    if (this.check(TT.KEYWORD, 'while')) return this.parseWhile();
    if (this.check(TT.KEYWORD, 'loop')) return this.parseLoop();
    if (this.check(TT.KEYWORD, 'repeat')) return this.parseRepeat();
    if (this.check(TT.KEYWORD, 'foreach')) return this.parseForeach();
    if (this.check(TT.KEYWORD, 'try')) return this.parseTryCatch();
    if (this.check(TT.KEYWORD, 'class')) return this.parseClassDeclaration();
    if (this.check(TT.KEYWORD, 'interface')) return this.parseInterface();
    if (this.check(TT.KEYWORD, 'guard')) return this.parseGuard();
    if (this.check(TT.KEYWORD, 'match')) return this.parseMatch();
    if (this.check(TT.PUNC, '{')) return this.parseBlock();

    const expr = this.parseExpression();
    this.match(TT.PUNC, ';');
    return { type: 'ExpressionStatement', expression: expr, loc: t };
  }

  parseImport() {
    const loc = this.expect(TT.KEYWORD, 'import');
    const source = this.expect(TT.STRING, null, 'Expected import path string').value;
    this.match(TT.PUNC, ';');

    let resolvedPath = null;

    // Check #1: Relative file path
    if (this.filePath && this.filePath !== '<input>') {
      const p = path.resolve(path.dirname(path.resolve(this.filePath)), source);
      const pWate = p.endsWith('.wate') ? p : p + '.wate';
      if (fs.existsSync(pWate)) resolvedPath = pWate;
      else if (fs.existsSync(p)) resolvedPath = p;
    }

    // Check #2: Inside local wate_packages (relative to script)
    if (!resolvedPath && this.filePath && this.filePath !== '<input>') {
      const dir = path.dirname(path.resolve(this.filePath));
      const p1 = path.resolve(dir, 'wate_packages', source, 'index.wate');
      const p2 = path.resolve(dir, 'wate_packages', source + '.wate');
      if (fs.existsSync(p1)) resolvedPath = p1;
      else if (fs.existsSync(p2)) resolvedPath = p2;
    }

    // Check #3: Inside current working directory's wate_packages
    if (!resolvedPath) {
      const p3 = path.resolve(process.cwd(), 'wate_packages', source, 'index.wate');
      const p4 = path.resolve(process.cwd(), 'wate_packages', source + '.wate');
      if (fs.existsSync(p3)) resolvedPath = p3;
      else if (fs.existsSync(p4)) resolvedPath = p4;
    }

    // Perform Recursive AST Inlining if resolved!
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      const sourceCode = fs.readFileSync(resolvedPath, 'utf-8');
      const importedAST = parseWate(sourceCode, resolvedPath);
      return { type: 'ImportBlock', source, body: importedAST.body, loc };
    }

    return { type: 'ImportStatement', source, loc };
  }

  parseVariableDeclaration() {
    const kindTok = this.current();
    const kind = this.match(TT.KEYWORD, 'const') ? 'const' : (this.expect(TT.KEYWORD, 'set'), 'let');
    const declarations = [];

    do {
      const id = this.parseBindingPattern();
      let init = null;
      if (this.match(TT.OP, '=') || this.match(TT.OP, ':=')) {
        if (id.type === 'ArrayPattern') {
          const elements = [];
          do {
            elements.push(this.parseExpression());
          } while (this.match(TT.PUNC, ','));
          init = { type: 'ArrayExpression', elements };
        } else {
          init = this.parseExpression();
        }
      }
      declarations.push({ id, init });
    } while (this.match(TT.PUNC, ','));

    this.match(TT.PUNC, ';');
    return { type: 'VariableDeclaration', kind, declarations, loc: kindTok };
  }

  parseBindingPattern() {
    // Array destructuring
    if (this.match(TT.PUNC, '[')) {
      const elements = [];
      if (!this.check(TT.PUNC, ']')) {
        do { elements.push(this.expect(TT.IDENT, null, 'Expected identifier in array pattern').value); }
        while (this.match(TT.PUNC, ','));
      }
      this.expect(TT.PUNC, ']');
      return { type: 'ArrayPattern', elements };
    }
    // Object destructuring
    if (this.match(TT.PUNC, '{')) {
      const props = [];
      if (!this.check(TT.PUNC, '}')) {
        do { props.push(this.expect(TT.IDENT, null, 'Expected identifier in object pattern').value); }
        while (this.match(TT.PUNC, ','));
      }
      this.expect(TT.PUNC, '}');
      return { type: 'ObjectPattern', properties: props };
    }
    // Multiple comma-separated inline assignments (e.g. set a, b, c)
    const firstIdent = this.expect(TT.IDENT, null, 'Expected variable name').value;
    if (this.check(TT.PUNC, ',')) {
      const elements = [firstIdent];
      while (this.match(TT.PUNC, ',')) {
        elements.push(this.expect(TT.IDENT, null, 'Expected variable name').value);
      }
      return { type: 'ArrayPattern', elements };
    }
    return { type: 'Identifier', name: firstIdent };
  }

  parseFunctionDeclaration() {
    const loc = this.current();
    let async = false, generator = false;
    if (this.match(TT.KEYWORD, 'async')) async = true;
    this.expect(TT.KEYWORD, 'fn', 'Expected fn');
    if (this.match(TT.OP, '*')) generator = true;
    const name = this.expect(TT.IDENT, null, 'Expected function name').value;
    const params = this.parseParams();
    const body = this.parseBlock();
    return { type: 'FunctionDeclaration', name, params, body, async, generator, loc };
  }

  parseParams() {
    this.expect(TT.PUNC, '(', 'Expected (');
    const params = [];
    if (!this.check(TT.PUNC, ')')) {
      do { params.push(this.expect(TT.IDENT, null, 'Expected parameter name').value); }
      while (this.match(TT.PUNC, ','));
    }
    this.expect(TT.PUNC, ')', 'Expected )');
    return params;
  }

  parseReturn() {
    const loc = this.expect(TT.KEYWORD, 'return');
    let argument = null;
    if (!this.check(TT.NEWLINE) && !this.check(TT.PUNC, '}') && !this.check(TT.PUNC, ';') && !this.check(TT.EOF)) {
      argument = this.parseExpression();
    }
    this.match(TT.PUNC, ';');
    return { type: 'ReturnStatement', argument, loc };
  }

  parseBreak() {
    const loc = this.expect(TT.KEYWORD, 'break');
    this.match(TT.PUNC, ';');
    return { type: 'BreakStatement', loc };
  }

  parseContinue() {
    const loc = this.expect(TT.KEYWORD, 'continue');
    this.match(TT.PUNC, ';');
    return { type: 'ContinueStatement', loc };
  }

  parseThrow() {
    const loc = this.expect(TT.KEYWORD, 'throw');
    const argument = this.parseExpression();
    this.match(TT.PUNC, ';');
    return { type: 'ThrowStatement', argument, loc };
  }

  parseDoWhile() {
    const loc = this.expect(TT.KEYWORD, 'do');
    const body = this.parseBlock();
    this.expect(TT.KEYWORD, 'while', 'Expected while after do block');
    const test = this.parseParenOrLooseExpression();
    this.match(TT.PUNC, ';');
    return { type: 'DoWhileStatement', test, body, loc };
  }

  parseIf() {
    const loc = this.expect(TT.KEYWORD, 'if');
    const test = this.parseParenOrLooseExpression();
    const consequent = this.parseBlock();
    let alternate = null;

    if (this.match(TT.KEYWORD, 'elseif') || this.match(TT.KEYWORD, 'elif')) {
      this.pos--;
      const alias = this.current().value;
      this.current().value = 'if';
      alternate = this.parseIf();
      this.current().value = alias;
    } else if (this.match(TT.KEYWORD, 'else')) {
      alternate = this.check(TT.KEYWORD, 'if') ? this.parseIf() : this.parseBlock();
    }

    return { type: 'IfStatement', test, consequent, alternate, loc };
  }

  parseWhile() {
    const loc = this.expect(TT.KEYWORD, 'while');
    const test = this.parseParenOrLooseExpression();
    const body = this.parseBlock();
    return { type: 'WhileStatement', test, body, loc };
  }

  parseLoop() {
    const loc = this.expect(TT.KEYWORD, 'loop');
    this.expect(TT.PUNC, '(');
    const count = this.parseExpression();
    this.expect(TT.PUNC, ')');
    const body = this.parseBlock();
    return { type: 'LoopStatement', count, body, loc };
  }

  parseRepeat() {
    const loc = this.expect(TT.KEYWORD, 'repeat');
    const count = this.parseExpression();
    this.expect(TT.KEYWORD, 'times', 'Expected times after repeat count');
    const body = this.parseBlock();
    return { type: 'RepeatStatement', count, body, loc };
  }

  parseForeach() {
    const loc = this.expect(TT.KEYWORD, 'foreach');
    const item = this.expect(TT.IDENT, null, 'Expected foreach variable').value;
    this.expect(TT.KEYWORD, 'in', 'Expected in');
    const iterable = this.parseExpression();
    const body = this.parseBlock();
    return { type: 'ForeachStatement', item, iterable, body, loc };
  }

  parseTryCatch() {
    const loc = this.expect(TT.KEYWORD, 'try');
    const block = this.parseBlock();
    
    let param = null;
    let handler = null;
    if (this.match(TT.KEYWORD, 'catch')) {
      this.expect(TT.PUNC, '(');
      param = this.expect(TT.IDENT, null, 'Expected catch parameter').value;
      this.expect(TT.PUNC, ')');
      handler = this.parseBlock();
    }
    
    let finalizer = null;
    if (this.match(TT.KEYWORD, 'finally')) {
      finalizer = this.parseBlock();
    }
    
    if (!handler && !finalizer) {
      this.error('Expected catch or finally after try block');
    }
    
    return { type: 'TryCatchStatement', block, param, handler, finalizer, loc };
  }

  parseGuard() {
    const loc = this.expect(TT.KEYWORD, 'guard');
    const test = this.parseExpression();
    this.expect(TT.KEYWORD, 'else', 'Expected else after guard condition');
    const body = this.parseBlock();
    return { type: 'GuardStatement', test, body, loc };
  }

  parseMatch() {
    const loc = this.expect(TT.KEYWORD, 'match');
    const discriminant = this.parseExpression();
    this.expect(TT.PUNC, '{');
    this.skipNewlines();
    const cases = [];
    while (!this.check(TT.PUNC, '}') && !this.eof()) {
      const pattern = this.parseMatchPattern();
      this.expect(TT.OP, '=>');
      const consequent = this.parseStatement();
      cases.push({ pattern, consequent });
      this.skipNewlines();
    }
    this.expect(TT.PUNC, '}');
    return { type: 'MatchStatement', discriminant, cases, loc };
  }

  parseMatchPattern() {
    const t = this.current();
    if (this.match(TT.IDENT, '_') || this.match(TT.KEYWORD, 'default') || this.match(TT.KEYWORD, '_')) {
      return { type: 'MatchDefaultPattern' };
    }
    if (this.match(TT.PUNC, '{')) {
      const properties = [];
      if (!this.check(TT.PUNC, '}')) {
        do {
          const key = this.expect(TT.IDENT, null, 'Expected property key').value;
          this.expect(TT.PUNC, ':');
          const value = this.parseExpression();
          properties.push({ key, value });
        } while (this.match(TT.PUNC, ','));
      }
      this.expect(TT.PUNC, '}');
      return { type: 'MatchObjectPattern', properties };
    }
    return { type: 'MatchValuePattern', value: this.parseExpression() };
  }

  parseClassDeclaration() {
    const loc = this.expect(TT.KEYWORD, 'class');
    const name = this.expect(TT.IDENT, null, 'Expected class name').value;
    let superClass = null;
    if (this.match(TT.KEYWORD, 'extends')) superClass = this.expect(TT.IDENT, null, 'Expected superclass name').value;

    if (!global.WateClasses) global.WateClasses = new Set();
    global.WateClasses.add(name);

    const interfaces = [];
    if (this.match(TT.KEYWORD, 'implements')) {
      do {
        interfaces.push(this.expect(TT.IDENT, null, 'Expected interface name').value);
      } while (this.match(TT.PUNC, ','));
    }

    this.expect(TT.PUNC, '{');
    const methods = [];
    this.skipNewlines();
    while (!this.check(TT.PUNC, '}') && !this.eof()) {
      let isStatic = false, async = false, generator = false;
      if (this.match(TT.KEYWORD, 'static')) isStatic = true;
      if (this.match(TT.KEYWORD, 'async')) async = true;
      if (this.match(TT.KEYWORD, 'fn')) {
        if (this.match(TT.OP, '*')) generator = true;
      }

      let kind = 'method';
      if ((this.check(TT.IDENT, 'get') || this.check(TT.KEYWORD, 'get')) && this.tokens[this.pos + 1] && (this.tokens[this.pos + 1].type === TT.IDENT || this.tokens[this.pos + 1].type === TT.KEYWORD)) {
        this.pos++;
        kind = 'get';
      } else if ((this.check(TT.IDENT, 'set') || this.check(TT.KEYWORD, 'set')) && this.tokens[this.pos + 1] && (this.tokens[this.pos + 1].type === TT.IDENT || this.tokens[this.pos + 1].type === TT.KEYWORD)) {
        this.pos++;
        kind = 'set';
      }

      const tok = this.current();
      let fieldOrMethodName = '';
      if (this.match(TT.IDENT) || this.match(TT.KEYWORD)) {
        fieldOrMethodName = tok.value;
      } else {
        this.error('Expected field or method name');
      }

      if (this.match(TT.PUNC, '(')) {
        const params = [];
        if (!this.check(TT.PUNC, ')')) {
          do { params.push(this.expect(TT.IDENT, null, 'Expected parameter name').value); }
          while (this.match(TT.PUNC, ','));
        }
        this.expect(TT.PUNC, ')', 'Expected )');
        const body = this.parseBlock();
        methods.push({ type: 'MethodDefinition', name: fieldOrMethodName, params, body, isStatic, async, generator, kind });
      } else {
        let value = null;
        if (this.match(TT.OP, '=')) {
          value = this.parseExpression();
        }
        this.match(TT.PUNC, ';');
        methods.push({ type: 'FieldDefinition', name: fieldOrMethodName, value, isStatic });
      }
      this.skipNewlines();
    }
    this.expect(TT.PUNC, '}');

    // --- COMPILE-TIME INTERFACE VALIDATION ---
    if (interfaces.length > 0) {
      const declaredMethodNames = new Set(methods.filter(m => m.type === 'MethodDefinition').map(m => m.name));
      const registered = global.WateInterfaces || {};

      for (const iface of interfaces) {
        const required = registered[iface];
        if (required) {
          const missing = required.filter(m => !declaredMethodNames.has(m));
          if (missing.length > 0) {
            throw new WateSyntaxError(
              `Class '${name}' implements interface '${iface}' but is missing required methods: [${missing.join(', ')}]`,
              loc,
              this.filePath,
              this.source
            );
          }
        }
      }
    }

    return { type: 'ClassDeclaration', name, superClass, interfaces, methods, loc };
  }

  parseInterface() {
    const loc = this.expect(TT.KEYWORD, 'interface');
    const name = this.expect(TT.IDENT, null, 'Expected interface name').value;
    this.expect(TT.PUNC, '{');
    const methods = [];
    this.skipNewlines();
    while (!this.check(TT.PUNC, '}') && !this.eof()) {
      this.expect(TT.KEYWORD, 'method');
      const methodName = this.expect(TT.IDENT, null, 'Expected method name').value;
      this.match(TT.PUNC, ';');
      methods.push(methodName);
      this.skipNewlines();
    }
    this.expect(TT.PUNC, '}');

    if (!global.WateInterfaces) global.WateInterfaces = {};
    global.WateInterfaces[name] = methods;

    return { type: 'InterfaceDeclaration', name, methods, loc };
  }

  parseParenOrLooseExpression() {
    if (this.match(TT.PUNC, '(')) {
      const expr = this.parseExpression();
      this.expect(TT.PUNC, ')');
      return expr;
    }
    return this.parseExpression();
  }

  parseBlock() {
    this.expect(TT.PUNC, '{', 'Expected block opening {');
    const body = [];
    this.skipNewlines();
    while (!this.check(TT.PUNC, '}') && !this.eof()) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    this.expect(TT.PUNC, '}', 'Expected block closing }');
    return { type: 'BlockStatement', body };
  }

  parseExpression(precedence = 0) {
    let left = this.parsePrefix();

    while (true) {
      const t = this.current();
      if (!t) break;

      // Conditional (Ternary) Operator `? :` has precedence 1.5
      if (precedence < 1.5 && this.match(TT.PUNC, '?')) {
        const consequent = this.parseExpression();
        this.expect(TT.PUNC, ':', 'Expected : in ternary expression');
        const alternate = this.parseExpression(1);
        left = { type: 'ConditionalExpression', test: left, consequent, alternate };
        continue;
      }

      if (this.check(TT.PUNC, '(')) {
        left = this.finishCall(left);
        continue;
      }
      if (this.match(TT.PUNC, '.')) {
        const propTok = this.current();
        if (this.match(TT.IDENT) || this.match(TT.KEYWORD)) {
          left = { type: 'MemberExpression', object: left, property: { type: 'Identifier', name: propTok.value }, computed: false };
        } else {
          this.error('Expected property name');
        }
        continue;
      }
      if (this.match(TT.PUNC, '[')) {
        const prop = this.parseExpression();
        this.expect(TT.PUNC, ']');
        left = { type: 'MemberExpression', object: left, property: prop, computed: true };
        continue;
      }

      const opInfo = this.currentBinaryOp();
      if (!opInfo || opInfo.prec < precedence) break;

      this.pos += opInfo.consumeCount;
      const right = this.parseExpression(opInfo.prec + (opInfo.rightAssoc ? 0 : 1));
      left = { type: 'BinaryExpression', operator: opInfo.op, left, right, loc: t };
    }

    return left;
  }

  currentBinaryOp() {
    const t = this.current();
    if (!t) return null;

    // Check for "is not"
    if (t.type === TT.KEYWORD && t.value === 'is') {
      const next = this.tokens[this.pos + 1];
      if (next && next.type === TT.KEYWORD && next.value === 'not') {
        return { op: 'is not', prec: 4, rightAssoc: false, consumeCount: 2 };
      }
      return { op: 'is', prec: 4, rightAssoc: false, consumeCount: 1 };
    }

    // Check for "not in"
    if (t.type === TT.KEYWORD && t.value === 'not') {
      const next = this.tokens[this.pos + 1];
      if (next && next.type === TT.KEYWORD && next.value === 'in') {
        return { op: 'not in', prec: 5, rightAssoc: false, consumeCount: 2 };
      }
    }

    const map = {
      '=': [1, true], '+=': [1, true], '-=': [1, true], '*=': [1, true], '/=': [1, true], ':=': [1, true],
      'or': [2, false], '||': [2, false],
      'and': [3, false], '&&': [3, false],
      '==': [4, false], '!=': [4, false], '===': [4, false], '!==': [4, false],
      '<': [5, false], '<=': [5, false], '>': [5, false], '>=': [5, false], 'in': [5, false],
      '+': [6, false], '-': [6, false],
      '*': [7, false], '/': [7, false], '%': [7, false],
      '**': [8, true]
    };
    const key = t.value;
    if ((t.type === TT.OP || t.type === TT.KEYWORD) && map[key]) {
      const [prec, rightAssoc] = map[key];
      return { op: key, prec, rightAssoc, consumeCount: 1 };
    }
    return null;
  }

  parsePrefix() {
    const t = this.current();

    // Anonymous / Expression Function Closure (e.g. fn(req, res) { ... })
    if (this.check(TT.KEYWORD, 'fn') || (this.check(TT.KEYWORD, 'async') && this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === TT.KEYWORD && this.tokens[this.pos + 1].value === 'fn')) {
      let async = false;
      if (this.match(TT.KEYWORD, 'async')) async = true;
      this.expect(TT.KEYWORD, 'fn');
      let generator = false;
      if (this.match(TT.OP, '*')) generator = true;
      let name = '';
      if (this.check(TT.IDENT)) {
        name = this.match(TT.IDENT).value;
      }
      const params = this.parseParams();
      const body = this.parseBlock();
      return { type: 'FunctionDeclaration', name, params, body, async, generator };
    }

    if (this.match(TT.OP, '!') || this.match(TT.KEYWORD, 'not') || this.match(TT.KEYWORD, 'await') || this.match(TT.OP, '-') || this.match(TT.OP, '+')) {
      const prevTok = this.prev();
      if (prevTok.value === 'await') {
        return { type: 'AwaitExpression', argument: this.parseExpression(9) };
      }
      const op = prevTok.value === 'not' ? '!' : prevTok.value;
      return { type: 'UnaryExpression', operator: op, argument: this.parseExpression(9) };
    }

    if (this.match(TT.NUMBER)) return { type: 'Literal', value: Number(t.value), raw: t.value };
    if (this.match(TT.STRING)) return { type: 'Literal', value: t.value, raw: JSON.stringify(t.value) };

    if (t.type === TT.F_STRING) {
      this.pos++;
      return this.parseFString(t);
    }

    if (t.type === TT.KEYWORD && BOOLEAN_NULL_MAP[t.value]) {
      this.pos++;
      return { type: 'RawLiteral', raw: BOOLEAN_NULL_MAP[t.value] };
    }

    if (this.match(TT.IDENT) || (t.type === TT.KEYWORD && ['out', 'print', 'err', 'warn', 'input'].includes(t.value) && (this.pos++, true))) {
      return { type: 'Identifier', name: t.value };
    }

    if (this.match(TT.PUNC, '(')) {
      const expr = this.parseExpression();
      this.expect(TT.PUNC, ')');
      return expr;
    }

    if (this.match(TT.PUNC, '[')) return this.parseArrayLiteral();
    if (this.match(TT.PUNC, '{')) return this.parseObjectLiteral();

    this.error(`Unexpected token '${t.value}' in expression`, t);
  }

  parseFString(token) {
    const value = token.value;
    const parts = [];
    let lastIdx = 0;
    let i = 0;
    while (i < value.length) {
      if (value[i] === '{') {
        if (i > lastIdx) {
          parts.push({ type: 'Literal', value: value.slice(lastIdx, i) });
        }
        i++;
        let start = i;
        let depth = 1;
        while (i < value.length && depth > 0) {
          if (value[i] === '{') depth++;
          else if (value[i] === '}') {
            depth--;
            if (depth === 0) break;
          }
          i++;
        }
        if (i >= value.length) {
          this.error('Unterminated interpolation in f-string', token);
        }
        const exprStr = value.slice(start, i);
        i++;
        lastIdx = i;

        const subTokens = new Lexer(exprStr, this.filePath).tokenize();
        const subParser = new Parser(subTokens.filter(st => st.type !== TT.EOF), this.filePath, exprStr);
        const exprNode = subParser.parseExpression();
        parts.push({ type: 'Interpolation', expression: exprNode });
      } else {
        i++;
      }
    }
    if (i > lastIdx) {
      parts.push({ type: 'Literal', value: value.slice(lastIdx, i) });
    }
    return { type: 'TemplateLiteral', parts };
  }

  parseArrayLiteral() {
    // List comprehension lookahead check
    let isComprehension = false;
    let depth = 1;
    for (let j = this.pos; j < this.tokens.length; j++) {
      const t = this.tokens[j];
      if (t.type === TT.PUNC && t.value === '[') depth++;
      if (t.type === TT.PUNC && t.value === ']') depth--;
      if (depth === 0) break;
      if (depth === 1 && t.type === TT.KEYWORD && t.value === 'for') {
        isComprehension = true;
        break;
      }
    }

    if (isComprehension) {
      const expr = this.parseExpression();
      this.expect(TT.KEYWORD, 'for');
      const item = this.expect(TT.IDENT, null, 'Expected iteration variable').value;
      this.expect(TT.KEYWORD, 'in');
      const iterable = this.parseExpression();
      let filter = null;
      if (this.match(TT.KEYWORD, 'if')) {
        filter = this.parseExpression();
      }
      this.expect(TT.PUNC, ']');
      return { type: 'ListComprehension', expression: expr, item, iterable, filter };
    }

    const elements = [];
    this.skipNewlines();
    if (!this.check(TT.PUNC, ']')) {
      do {
        this.skipNewlines();
        elements.push(this.parseExpression());
        this.skipNewlines();
      } while (this.match(TT.PUNC, ','));
    }
    this.skipNewlines();
    this.expect(TT.PUNC, ']');
    return { type: 'ArrayExpression', elements };
  }

  parseObjectLiteral() {
    const properties = [];
    this.skipNewlines();
    if (!this.check(TT.PUNC, '}')) {
      do {
        this.skipNewlines();
        const keyTok = this.current();
        let key;
        if (this.match(TT.IDENT) || this.match(TT.STRING) || this.match(TT.KEYWORD)) key = keyTok.value;
        else this.error('Expected object key');
        this.expect(TT.PUNC, ':');
        const value = this.parseExpression();
        properties.push({ key, value });
        this.skipNewlines();
      } while (this.match(TT.PUNC, ','));
    }
    this.skipNewlines();
    this.expect(TT.PUNC, '}');
    return { type: 'ObjectExpression', properties };
  }

  finishCall(callee) {
    this.expect(TT.PUNC, '(');
    const args = [];
    if (!this.check(TT.PUNC, ')')) {
      do { args.push(this.parseExpression()); }
      while (this.match(TT.PUNC, ','));
    }
    this.expect(TT.PUNC, ')');
    return { type: 'CallExpression', callee, arguments: args };
  }
}

// ============================================================
// JavaScript Code Generator
// ============================================================
class CodeGenerator {
  constructor(options = {}) {
    this.loopId = 0;
    this.options = options;
  }

  generate(ast) { return this.gen(ast); }

  gen(node) {
    if (!node) return '';
    let code = this.genRaw(node);
    const statements = [
      'VariableDeclaration', 'ExpressionStatement', 'ReturnStatement', 
      'ThrowStatement', 'IfStatement', 'WhileStatement', 'RepeatStatement', 
      'ForeachStatement', 'TryCatchStatement', 'FunctionDeclaration', 'ClassDeclaration'
    ];
    if (statements.includes(node.type) && node.loc && node.loc.line) {
      code += ` /* WATE_LINE:${node.loc.line} */`;
    }
    return code;
  }

  genRaw(node) {
    if (!node) return '';
    switch (node.type) {
      case 'Program': return node.body.map(n => this.gen(n)).join('\n');
      case 'BlockStatement': return `{\n${this.indent(node.body.map(n => this.gen(n)).join('\n'))}\n}`;
      case 'ImportStatement': return `// [WATE AST Import] ${node.source}\nrequire(${JSON.stringify(node.source)});`;
      case 'ImportBlock': return `// [WATE AST Import: ${node.source}]\n${node.body.map(n => this.gen(n)).join('\n')}\n// [End Import]`;
      case 'VariableDeclaration': return this.genVar(node);
      case 'FunctionDeclaration': return `${node.async ? 'async ' : ''}function${node.generator ? '*' : ''} ${node.name}(${node.params.join(', ')}) ${this.gen(node.body)}`;
      case 'ClassDeclaration': return this.genClass(node);
      case 'InterfaceDeclaration': return `// [WATE AST Interface] ${node.name}`;
      case 'ReturnStatement': return `return${node.argument ? ' ' + this.gen(node.argument) : ''};`;
      case 'BreakStatement': return 'break;';
      case 'ContinueStatement': return 'continue;';
      case 'ThrowStatement': return `throw ${this.gen(node.argument)};`;
      case 'DoWhileStatement': return `do ${this.gen(node.body)} while (${this.gen(node.test)});`;
      case 'AwaitExpression': return `await ${this.gen(node.argument)}`;
      case 'IfStatement': return this.genIf(node);
      case 'WhileStatement': return `while (${this.gen(node.test)}) ${this.gen(node.body)}`;
      case 'LoopStatement': return this.genCountLoop(node.count, node.body, '_wl');
      case 'RepeatStatement': return this.genCountLoop(node.count, node.body, '_wr');
      case 'ForeachStatement': return `for (let ${node.item} of ${this.gen(node.iterable)}) ${this.gen(node.body)}`;
      case 'TryCatchStatement': {
        let code = `try ${this.gen(node.block)}`;
        if (node.handler) code += ` catch (${node.param}) ${this.gen(node.handler)}`;
        if (node.finalizer) code += ` finally ${this.gen(node.finalizer)}`;
        return code;
      }
      case 'ExpressionStatement': return `${this.gen(node.expression)};`;
      case 'Identifier': return node.name;
      case 'Literal': return typeof node.value === 'string' ? JSON.stringify(node.value) : String(node.value);
      case 'RawLiteral': return node.raw;
      case 'ArrayExpression': return `[${node.elements.map(e => this.gen(e)).join(', ')}]`;
      case 'ObjectExpression': return `{ ${node.properties.map(p => `${this.safeKey(p.key)}: ${this.gen(p.value)}`).join(', ')} }`;
      case 'CallExpression': return this.genCall(node);
      case 'MemberExpression': return `${this.gen(node.object)}${node.computed ? `[${this.gen(node.property)}]` : `.${this.gen(node.property)}`}`;
      case 'UnaryExpression': return `${node.operator}${this.gen(node.argument)}`;
      case 'BinaryExpression': return this.genBinary(node);
      case 'ArrayPattern': return `[${node.elements.join(', ')}]`;
      case 'ObjectPattern': return `{ ${node.properties.join(', ')} }`;
      case 'GuardStatement': return `if (!(${this.gen(node.test)})) ${this.gen(node.body)}`;
      case 'LabeledStatement': return `${node.label}: ${this.gen(node.body)}`;
      case 'TemplateLiteral':
        return '`' + node.parts.map(p => {
          if (p.type === 'Literal') {
            return p.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
          } else {
            return '${' + this.gen(p.expression) + '}';
          }
        }).join('') + '`';
      case 'ListComprehension':
        const filterStr = node.filter ? `.filter(${node.item} => ${this.gen(node.filter)})` : '';
        return `${this.gen(node.iterable)}${filterStr}.map(${node.item} => ${this.gen(node.expression)})`;
      case 'ConditionalExpression':
        return `(${this.gen(node.test)} ? ${this.gen(node.consequent)} : ${this.gen(node.alternate)})`;
      case 'MatchStatement': return this.genMatch(node);
      default: throw new Error(`Unknown AST node: ${node.type}`);
    }
  }

  genVar(node) {
    const parts = node.declarations.map(d => `${this.gen(d.id)}${d.init ? ' = ' + this.gen(d.init) : ''}`);
    return `${node.kind} ${parts.join(', ')};`;
  }

  genClass(node) {
    const head = `class ${node.name}${node.superClass ? ' extends ' + node.superClass : ''}`;
    const members = node.methods.map(m => {
      if (m.type === 'FieldDefinition') {
        return `${m.isStatic ? 'static ' : ''}${m.name}${m.value ? ' = ' + this.gen(m.value) : ''};`;
      }
      const prefix = `${m.isStatic ? 'static ' : ''}${m.kind === 'get' ? 'get ' : m.kind === 'set' ? 'set ' : ''}${m.async ? 'async ' : ''}${m.generator ? '*' : ''}`;
      return `${prefix}${m.name}(${m.params.join(', ')}) ${this.gen(m.body)}`;
    }).join('\n');
    return `${head} {\n${this.indent(members)}\n}`;
  }

  genIf(node) {
    let out = `if (${this.gen(node.test)}) ${this.gen(node.consequent)}`;
    if (node.alternate) {
      if (node.alternate.type === 'IfStatement') out += ` else ${this.gen(node.alternate)}`;
      else out += ` else ${this.gen(node.alternate)}`;
    }
    return out;
  }

  genCountLoop(countNode, body, prefix) {
    const v = `${prefix}${this.loopId++}`;
    return `for (let ${v} = 0; ${v} < ${this.gen(countNode)}; ${v}++) ${this.gen(body)}`;
  }

  genCall(node) {
    let callee = this.gen(node.callee);
    if (callee === 'out' || callee === 'print') callee = 'console.log';
    if (callee === 'err') callee = 'console.error';
    if (callee === 'warn') callee = 'console.warn';
    const isClass = global.WateClasses && global.WateClasses.has(callee);
    return `${isClass ? 'new ' : ''}${callee}(${node.arguments.map(a => this.gen(a)).join(', ')})`;
  }

  genBinary(node) {
    let op = node.operator;
    if (op === 'and') op = '&&';
    if (op === 'or') op = '||';
    if (op === 'is') op = '===';
    if (op === 'is not') op = '!==';
    if (op === ':=') op = '=';
    if (op === 'not in') return `!${this.gen(node.right)}.includes(${this.gen(node.left)})`;
    if (op === 'in') return `${this.gen(node.right)}.includes(${this.gen(node.left)})`;
    return `(${this.gen(node.left)} ${op} ${this.gen(node.right)})`;
  }

  genMatch(node) {
    const discName = `_matchDisc`;
    let out = `{\n  const ${discName} = ${this.gen(node.discriminant)};\n`;
    let first = true;
    for (const c of node.cases) {
      let cond = '';
      if (c.pattern.type === 'MatchDefaultPattern') {
        cond = 'true';
      } else if (c.pattern.type === 'MatchObjectPattern') {
        cond = c.pattern.properties.map(p => `${discName}.${p.key} === ${this.gen(p.value)}`).join(' && ');
      } else {
        cond = `${discName} === ${this.gen(c.pattern.value)}`;
      }

      if (first) {
        out += `  if (${cond}) ${this.gen(c.consequent)}\n`;
        first = false;
      } else {
        out += `  else if (${cond}) ${this.gen(c.consequent)}\n`;
      }
    }
    out += `}`;
    return out;
  }

  safeKey(k) { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k); }
  indent(s) { return String(s || '').split('\n').map(l => l ? '  ' + l : l).join('\n'); }
}

// ============================================================
// Scope Resolver & Symbol Table Static Analyzer
// ============================================================
class Scope {
  constructor(parent = null) {
    this.bindings = new Map();
    this.parent = parent;
  }
  define(name, symbol) {
    if (this.bindings.has(name)) return false;
    this.bindings.set(name, symbol);
    return true;
  }
  lookup(name) {
    let current = this;
    while (current) {
      if (current.bindings.has(name)) return current.bindings.get(name);
      current = current.parent;
    }
    return null;
  }
}

class SemanticAnalyzer {
  constructor(filePath, source) {
    this.filePath = filePath;
    this.source = source;
    this.currentScope = new Scope();
  }

  error(msg, node) {
    throw new WateSyntaxError(msg, node ? node.loc : null, this.filePath, this.source);
  }

  inferType(node) {
    if (!node) return 'any';
    const type = node.type;

    switch (type) {
      case 'Literal': {
        const valType = typeof node.value;
        if (valType === 'number') return 'number';
        if (valType === 'string') return 'string';
        if (valType === 'boolean') return 'boolean';
        return 'any';
      }
      case 'RawLiteral': {
        if (node.raw === 'true' || node.raw === 'false') return 'boolean';
        if (node.raw === 'null') return 'null';
        return 'any';
      }
      case 'ArrayExpression':
        return 'array';
      case 'ObjectExpression':
        return 'object';
      case 'FunctionDeclaration':
        return 'function';
      case 'Identifier': {
        const name = node.name;
        const symbol = this.currentScope.lookup(name);
        if (symbol) return symbol.type || 'any';
        if (['math', 'num'].includes(name)) return 'object';
        if (['str'].includes(name)) return 'object';
        return 'any';
      }
      case 'BinaryExpression': {
        const leftType = this.inferType(node.left);
        const rightType = this.inferType(node.right);
        const op = node.operator;
        
        if (['+', '-', '*', '/', '%', '**'].includes(op)) {
          if (leftType === 'number' && rightType === 'number') return 'number';
          if (op === '+' && (leftType === 'string' || rightType === 'string')) return 'string';
          return 'any';
        }
        if (['==', '!=', '===', '!==', 'is', 'is not', '<', '<=', '>', '>=', 'and', 'or', 'in', 'not in'].includes(op)) {
          return 'boolean';
        }
        return 'any';
      }
      case 'PrefixExpression':
      case 'UnaryExpression': {
        const op = node.operator;
        if (op === '!') return 'boolean';
        if (op === '-') return 'number';
        return 'any';
      }
      case 'CallExpression': {
        if (node.callee.type === 'Identifier') {
          const calleeName = node.callee.name;
          if (calleeName === 'every') return 'object';
        }
        return 'any';
      }
      default:
        return 'any';
    }
  }

  analyze(ast) {
    this.visit(ast);
  }

  visit(node) {
    if (!node) return;
    const type = node.type;

    switch (type) {
      case 'Program':
      case 'BlockStatement':
      case 'Block':
      case 'ImportBlock': {
        const oldScope = this.currentScope;
        if (type === 'BlockStatement' || type === 'Block') {
          this.currentScope = new Scope(oldScope);
        }
        for (const stmt of node.body) {
          this.visit(stmt);
        }
        if (type === 'BlockStatement' || type === 'Block') {
          this.currentScope = oldScope;
        }
        break;
      }

      case 'VariableDeclaration': {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            const name = decl.id.name;
            this.visit(decl.init);
            const inferred = this.inferType(decl.init);
            const kind = node.kind;
            if (!this.currentScope.define(name, { kind, type: inferred, node: decl })) {
              this.error(`Redeclaration of '${name}' is not allowed in this scope.`, decl.id);
            }
          } else if (decl.id.type === 'ArrayPattern') {
            this.visit(decl.init);
            for (const elName of decl.id.elements) {
              if (!this.currentScope.define(elName, { kind: node.kind, type: 'any', node: decl })) {
                this.error(`Redeclaration of '${elName}' is not allowed in this scope.`, decl.id);
              }
            }
          } else if (decl.id.type === 'ObjectPattern') {
            this.visit(decl.init);
            for (const propName of decl.id.properties) {
              if (!this.currentScope.define(propName, { kind: node.kind, type: 'any', node: decl })) {
                this.error(`Redeclaration of '${propName}' is not allowed in this scope.`, decl.id);
              }
            }
          }
        }
        break;
      }

      case 'FunctionDeclaration': {
        const name = node.name;
        if (name) {
          if (!this.currentScope.define(name, { kind: 'fn', type: 'function', node })) {
            this.error(`Redeclaration of function '${name}' in this scope.`, node);
          }
        }
        const oldScope = this.currentScope;
        this.currentScope = new Scope(oldScope);
        for (const pName of node.params) {
          if (!this.currentScope.define(pName, { kind: 'param', type: 'any', node })) {
            this.error(`Duplicate parameter name '${pName}' in function.`, node);
          }
        }
        this.visit(node.body);
        this.currentScope = oldScope;
        break;
      }

      case 'ClassDeclaration': {
        const name = node.name;
        if (!this.currentScope.define(name, { kind: 'class', type: 'object', node })) {
          this.error(`Redeclaration of class '${name}'.`, node);
        }
        const oldScope = this.currentScope;
        this.currentScope = new Scope(oldScope);
        this.currentScope.define('this', { kind: 'var', type: 'object', node });
        this.currentScope.define('super', { kind: 'fn', type: 'function', node });
        if (node.methods) {
          for (const member of node.methods) {
            this.visit(member);
          }
        }
        this.currentScope = oldScope;
        break;
      }

      case 'InterfaceDeclaration': {
        const name = node.name;
        if (!this.currentScope.define(name, { kind: 'interface', node })) {
          this.error(`Redeclaration of interface '${name}'.`, node);
        }
        break;
      }

      case 'AssignExpression': {
        if (node.left.type === 'Identifier') {
          const name = node.left.name;
          const symbol = this.currentScope.lookup(name);
          if (!symbol && this.filePath !== '<repl>') {
            this.error(`Variable '${name}' is not defined. You must declare it using 'set' first.`, node.left);
          }
          if (symbol && symbol.kind === 'const') {
            this.error(`Cannot assign to constant variable '${name}'.`, node.left);
          }
        } else {
          this.visit(node.left);
        }
        this.visit(node.right);
        break;
      }

      case 'UpdateExpression': {
        if (node.argument.type === 'Identifier') {
          const name = node.argument.name;
          const symbol = this.currentScope.lookup(name);
          if (!symbol && this.filePath !== '<repl>') {
            this.error(`Variable '${name}' is not defined. You must declare it using 'set' first.`, node.argument);
          }
          if (symbol && symbol.kind === 'const') {
            this.error(`Cannot assign to constant variable '${name}'.`, node.argument);
          }
        } else {
          this.visit(node.argument);
        }
        this.visit(node.value);
        break;
      }

      case 'Identifier': {
        const name = node.name;
        if (name === 'this' || name === 'super') return;
        const symbol = this.currentScope.lookup(name);
        if (!symbol && this.filePath !== '<repl>') {
          const globals = ['file', 'sys', 'http', 'math', 'str', 'input', 'json', 'date', 'color', 'os', 'env', 'regex', 'crypto', 'wpath', 'list', 'num', 'assert', 'timer', 'stack', 'queue', 'table', 'type', 'every', 'out', 'True', 'False', 'null', 'Bot', 'Database', 'AIClient', 'SQLiteDatabase', 'MySQLClient', 'PostgresClient', 'MongoClient', 'csv', 'excel', 'pdf', 'img', 'bot', 'WebApp', 'thread'];
          if (globals.includes(name)) return;
          this.error(`Variable '${name}' is not defined.`, node);
        }
        break;
      }

      case 'ExpressionStatement':
        this.visit(node.expression);
        break;
      case 'ReturnStatement':
      case 'ThrowStatement':
        if (node.argument) this.visit(node.argument);
        break;
      case 'IfStatement':
        this.visit(node.test);
        this.visit(node.consequent);
        if (node.alternate) this.visit(node.alternate);
        break;
      case 'WhileStatement':
      case 'DoWhileStatement':
        this.visit(node.test);
        this.visit(node.body);
        break;
      case 'RepeatStatement':
        this.visit(node.count);
        this.visit(node.body);
        break;
      case 'ForeachStatement': {
        const oldScope = this.currentScope;
        this.currentScope = new Scope(oldScope);
        const name = node.item;
        this.currentScope.define(name, { kind: 'var', type: 'any', node: node.item });
        this.visit(node.iterable);
        this.visit(node.body);
        this.currentScope = oldScope;
        break;
      }
      case 'ListComprehension': {
        const oldScope = this.currentScope;
        this.currentScope = new Scope(oldScope);
        const name = node.item;
        this.currentScope.define(name, { kind: 'var', type: 'any', node: node.item });
        this.visit(node.iterable);
        this.visit(node.expression);
        if (node.filter) this.visit(node.filter);
        this.currentScope = oldScope;
        break;
      }
      case 'TryCatchStatement':
        this.visit(node.block);
        if (node.handler) {
          const oldScope = this.currentScope;
          this.currentScope = new Scope(oldScope);
          const paramName = node.param;
          if (paramName) {
            this.currentScope.define(paramName, { kind: 'var', type: 'object', node });
          }
          this.visit(node.handler);
          this.currentScope = oldScope;
        }
        if (node.finalizer) {
          this.visit(node.finalizer);
        }
        break;
      case 'MatchStatement':
        this.visit(node.discriminant);
        for (const c of node.cases) {
          this.visit(c.consequent);
        }
        break;
      case 'GuardStatement':
        this.visit(node.test);
        this.visit(node.consequent);
        break;
      case 'CallExpression':
        this.visit(node.callee);
        for (const arg of node.arguments) {
          this.visit(arg);
        }
        break;
      case 'MemberExpression':
        this.visit(node.object);
        break;
      case 'BinaryExpression':
      case 'LogicalExpression': {
        this.visit(node.left);
        this.visit(node.right);
        const leftType = this.inferType(node.left);
        const rightType = this.inferType(node.right);
        const op = node.operator;
        if (['-', '*', '/', '%', '**'].includes(op)) {
          if ((leftType === 'string' && leftType !== 'any') || (rightType === 'string' && rightType !== 'any')) {
            console.warn(`\n⚠️ \x1b[33mType Warning [WATE Static Type Inference]: Cannot apply arithmetic operator '${op}' on type 'string'.\x1b[0m`);
          }
        }
        break;
      }
      case 'PrefixExpression':
        this.visit(node.right);
        break;
      case 'ArrayExpression':
        for (const el of node.elements) this.visit(el);
        break;
      case 'ObjectExpression':
        for (const p of node.properties) this.visit(p.value);
        break;
      case 'TemplateLiteral':
        for (const part of node.parts) {
          if (part.type === 'Interpolation') {
            this.visit(part.expression);
          }
        }
        break;
      case 'ClassMethod': {
        const oldScope = this.currentScope;
        this.currentScope = new Scope(oldScope);
        for (const param of node.params) {
          const pName = param;
          this.currentScope.define(pName, { kind: 'param', type: 'any', node: param });
        }
        this.visit(node.body);
        this.currentScope = oldScope;
        break;
      }
    }
  }
}

// ============================================================
// Public API
// ============================================================
function parseWate(source, filePath = '<input>') {
  const tokens = new Lexer(source, filePath).tokenize();
  return new Parser(tokens, filePath, source).parseProgram();
}

function tokenizeWate(source, filePath = '<input>') {
  return new Lexer(source, filePath).tokenize();
}

function generateJS(ast, options = {}) {
  return new CodeGenerator(options).generate(ast);
}

class ASTTreeShaker {
  constructor() {
    this.declared = new Map();
    this.referenced = new Set();
  }

  shake(ast) {
    this.collect(ast);
    this.prune(ast);
    return ast;
  }

  collect(node) {
    if (!node) return;
    if (node.type === 'Identifier') {
      this.referenced.add(node.name);
      return;
    }
    if (node.type === 'FunctionDeclaration') {
      this.declared.set(node.name, node);
      this.collect(node.body);
      return;
    }
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id.type === 'Identifier') this.declared.set(decl.id.name, decl);
        this.collect(decl.init);
      }
      return;
    }
    // Generic robust child collector traversal
    for (const key in node) {
      if (key === 'loc' || key === 'type') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        for (const child of val) {
          if (child && typeof child === 'object') this.collect(child);
        }
      } else if (val && typeof val === 'object') {
        this.collect(val);
      }
    }
  }

  prune(node) {
    if (!node) return;
    if (node.body && Array.isArray(node.body)) {
      node.body = node.body.filter(stmt => {
        if (stmt.type === 'FunctionDeclaration') {
          if (!this.referenced.has(stmt.name)) return false;
        }
        if (stmt.type === 'VariableDeclaration') {
          const activeDecls = stmt.declarations.filter(decl => {
            if (decl.id.type === 'Identifier') return this.referenced.has(decl.id.name);
            return true;
          });
          if (activeDecls.length === 0) return false;
          stmt.declarations = activeDecls;
        }
        return true;
      });
      for (const stmt of node.body) this.prune(stmt);
    }
  }
}

function transpileWate(source, filePath = '<input>', options = {}) {
  const ast = parseWate(source, filePath);
  new SemanticAnalyzer(filePath, source).analyze(ast);
  if (filePath !== '<repl>') {
    new ASTTreeShaker().shake(ast);
  }
  return generateJS(ast, options);
}

module.exports = {
  TT,
  Lexer,
  Parser,
  CodeGenerator,
  WateSyntaxError,
  tokenizeWate,
  parseWate,
  generateJS,
  transpileWate
};

// ============================================================
// CLI Runner
// ============================================================
if (require.main === module) {
  const args = process.argv.slice(2);
  const debug = args.includes('--debug');
  const astOnly = args.includes('--ast');
  const tokensOnly = args.includes('--tokens');
  const file = args.find(a => !a.startsWith('--'));

  if (!file) {
    console.log(`WATE Parser v10.5\nUsage:\n  node wate-parser.js file.wate\n  node wate-parser.js file.wate --debug`);
    process.exit(0);
  }

  try {
    const source = fs.readFileSync(file, 'utf8');
    const tokens = tokenizeWate(source, file);
    if (tokensOnly) {
      console.log(JSON.stringify(tokens, null, 2));
      process.exit(0);
    }
    const ast = new Parser(tokens, file, source).parseProgram();
    if (astOnly) {
      console.log(JSON.stringify(ast, null, 2));
      process.exit(0);
    }
    const js = generateJS(ast);
    if (debug) {
      console.log('\n===== TOKENS =====');
      console.log(tokens.map(t => `${t.type}:${t.value}`).join(' | '));
      console.log('\n===== AST =====');
      console.log(JSON.stringify(ast, null, 2));
      console.log('\n===== JS =====');
    }
    console.log(js);
  } catch (err) {
    if (err.name === 'WateSyntaxError') {
      const token = err.token;
      const line = token ? token.line : '?';
      const col = token ? token.col : '?';
      const fp = err.filePath || '<input>';
      const source = err.source || '';

      console.error(`\x1b[31m❌ WATE Syntax Error\x1b[0m`);
      console.error(`\x1b[36mLine ${line} | Column ${col}\x1b[0m`);
      console.error(`\x1b[90mFile: ${fp}\x1b[0m\n`);
      console.error(`  \x1b[91mUnexpected token: ${err.message}\x1b[0m`);

      if (source && token) {
        const lines = source.split('\n');
        const errorLine = lines[token.line - 1] || '';
        const caret = ' '.repeat(token.col - 1) + '^';
        console.error(`\n\x1b[90m${token.line} | \x1b[0m${errorLine}`);
        console.error(`\x1b[90m${' '.repeat(String(token.line).length)} | \x1b[31m${caret}\x1b[0m\n`);
      }
    } else {
      console.error(`🔥 WATE Runtime Crash:\n${err.stack || err.message}`);
    }
    process.exit(1);
  }
}
