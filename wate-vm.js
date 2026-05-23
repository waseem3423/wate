// ============================================================
// WATE Stack-Based Virtual Machine (VM) & Bytecode Compiler
// ============================================================

class BytecodeCompiler {
  constructor() {
    this.instructions = [];
  }

  compile(node) {
    if (!node) return;
    const type = node.type;

    switch (type) {
      case 'Program':
      case 'BlockStatement':
      case 'Block':
      case 'ImportBlock':
        for (const stmt of node.body) {
          this.compile(stmt);
        }
        break;

      case 'VariableDeclaration':
        for (const decl of node.declarations) {
          this.compile(decl.init);
          this.instructions.push({ op: 'STORE_VAR', name: decl.id.name });
        }
        break;

      case 'Identifier':
        this.instructions.push({ op: 'LOAD_VAR', name: node.name });
        break;

      case 'Literal':
        this.instructions.push({ op: 'PUSH_CONST', value: node.value });
        break;

      case 'RawLiteral':
        if (node.raw === 'true') this.instructions.push({ op: 'PUSH_CONST', value: true });
        else if (node.raw === 'false') this.instructions.push({ op: 'PUSH_CONST', value: false });
        else if (node.raw === 'null') this.instructions.push({ op: 'PUSH_CONST', value: null });
        break;

      case 'BinaryExpression': {
        const op = node.operator;
        if (op === '=' || op === ':=') {
          this.compile(node.right);
          if (node.left.type === 'Identifier') {
            this.instructions.push({ op: 'STORE_VAR', name: node.left.name });
          } else if (node.left.type === 'MemberExpression') {
            // Member assignment support!
            this.compile(node.left.object);
            if (node.left.property.type === 'Identifier') {
              this.instructions.push({ op: 'PUSH_CONST', value: node.left.property.name });
            } else {
              this.compile(node.left.property);
            }
            this.instructions.push({ op: 'SET_ITEM' });
          }
        } else {
          this.compile(node.left);
          this.compile(node.right);
          this.instructions.push({ op: 'BINARY_OP', operator: op });
        }
        break;
      }

      case 'PrefixExpression':
      case 'UnaryExpression':
        this.compile(node.argument || node.right);
        this.instructions.push({ op: 'UNARY_OP', operator: node.operator });
        break;

      case 'IfStatement': {
        this.compile(node.test);
        const jumpIfFalseInst = { op: 'JUMP_IF_FALSE', offset: 0 };
        this.instructions.push(jumpIfFalseInst);
        
        this.compile(node.consequent);
        
        if (node.alternate) {
          const jumpInst = { op: 'JUMP', offset: 0 };
          this.instructions.push(jumpInst);
          jumpIfFalseInst.offset = this.instructions.length;
          
          this.compile(node.alternate);
          jumpInst.offset = this.instructions.length;
        } else {
          jumpIfFalseInst.offset = this.instructions.length;
        }
        break;
      }

      case 'WhileStatement': {
        const loopStart = this.instructions.length;
        this.compile(node.test);
        const jumpIfFalseInst = { op: 'JUMP_IF_FALSE', offset: 0 };
        this.instructions.push(jumpIfFalseInst);
        
        this.compile(node.body);
        this.instructions.push({ op: 'JUMP', offset: loopStart });
        jumpIfFalseInst.offset = this.instructions.length;
        break;
      }

      case 'RepeatStatement': {
        this.compile(node.count);
        const loopIndexName = `_repeat_idx_${this.instructions.length}`;
        this.instructions.push({ op: 'STORE_VAR', name: loopIndexName });
        
        const loopStart = this.instructions.length;
        this.instructions.push({ op: 'LOAD_VAR', name: loopIndexName });
        this.instructions.push({ op: 'PUSH_CONST', value: 0 });
        this.instructions.push({ op: 'BINARY_OP', operator: '>' });
        
        const jumpIfFalseInst = { op: 'JUMP_IF_FALSE', offset: 0 };
        this.instructions.push(jumpIfFalseInst);
        
        this.compile(node.body);
        
        this.instructions.push({ op: 'LOAD_VAR', name: loopIndexName });
        this.instructions.push({ op: 'PUSH_CONST', value: 1 });
        this.instructions.push({ op: 'BINARY_OP', operator: '-' });
        this.instructions.push({ op: 'STORE_VAR', name: loopIndexName });
        this.instructions.push({ op: 'POP' });
        
        this.instructions.push({ op: 'JUMP', offset: loopStart });
        jumpIfFalseInst.offset = this.instructions.length;
        break;
      }

      case 'ForeachStatement': {
        this.compile(node.iterable);
        const iterName = `_foreach_iter_${this.instructions.length}`;
        const idxName = `_foreach_idx_${this.instructions.length}`;
        
        this.instructions.push({ op: 'STORE_VAR', name: iterName });
        this.instructions.push({ op: 'PUSH_CONST', value: 0 });
        this.instructions.push({ op: 'STORE_VAR', name: idxName });
        
        const loopStart = this.instructions.length;
        
        this.instructions.push({ op: 'LOAD_VAR', name: idxName });
        this.instructions.push({ op: 'LOAD_VAR', name: iterName });
        this.instructions.push({ op: 'MEMBER_ACCESS', property: 'length' });
        
        this.instructions.push({ op: 'BINARY_OP', operator: '<' });
        const jumpIfFalseInst = { op: 'JUMP_IF_FALSE', offset: 0 };
        this.instructions.push(jumpIfFalseInst);
        
        this.instructions.push({ op: 'LOAD_VAR', name: iterName });
        this.instructions.push({ op: 'LOAD_VAR', name: idxName });
        this.instructions.push({ op: 'GET_ITEM' });
        this.instructions.push({ op: 'STORE_VAR', name: node.item });
        this.instructions.push({ op: 'POP' });
        
        this.compile(node.body);
        
        this.instructions.push({ op: 'LOAD_VAR', name: idxName });
        this.instructions.push({ op: 'PUSH_CONST', value: 1 });
        this.instructions.push({ op: 'BINARY_OP', operator: '+' });
        this.instructions.push({ op: 'STORE_VAR', name: idxName });
        this.instructions.push({ op: 'POP' });
        
        this.instructions.push({ op: 'JUMP', offset: loopStart });
        jumpIfFalseInst.offset = this.instructions.length;
        break;
      }

      case 'CallExpression': {
        for (const arg of node.arguments) {
          this.compile(arg);
        }
        this.compile(node.callee);
        this.instructions.push({ op: 'CALL', argCount: node.arguments.length });
        break;
      }

      case 'MemberExpression':
        this.compile(node.object);
        if (node.property.type === 'Identifier') {
          this.instructions.push({ op: 'MEMBER_ACCESS', property: node.property.name });
        } else {
          this.compile(node.property);
          this.instructions.push({ op: 'GET_ITEM' });
        }
        break;

      case 'ArrayExpression': {
        for (const el of node.elements) {
          this.compile(el);
        }
        this.instructions.push({ op: 'ARRAY_LIT', count: node.elements.length });
        break;
      }

      case 'ExpressionStatement':
        this.compile(node.expression);
        this.instructions.push({ op: 'POP' });
        break;
    }
  }
}

class VirtualMachine {
  constructor(instructions, globals = {}) {
    this.instructions = instructions;
    this.globals = globals;
    this.stack = [];
    this.variables = new Map();
    this.ip = 0;
  }

  run() {
    while (this.ip < this.instructions.length) {
      const inst = this.instructions[this.ip];
      this.ip++;

      switch (inst.op) {
        case 'PUSH_CONST':
          this.stack.push(inst.value);
          break;

        case 'LOAD_VAR': {
          if (this.variables.has(inst.name)) {
            this.stack.push(this.variables.get(inst.name));
          } else if (inst.name in this.globals) {
            this.stack.push(this.globals[inst.name]);
          } else {
            throw new Error(`VM Runtime Error: Variable '${inst.name}' is not defined.`);
          }
          break;
        }

        case 'STORE_VAR':
          const val = this.stack[this.stack.length - 1]; // Peek
          this.variables.set(inst.name, val);
          break;

        case 'BINARY_OP': {
          const right = this.stack.pop();
          const left = this.stack.pop();
          const op = inst.operator;

          let res;
          if (op === '+') res = left + right;
          else if (op === '-') res = left - right;
          else if (op === '*') res = left * right;
          else if (op === '/') res = left / right;
          else if (op === 'is' || op === '==') res = left === right;
          else if (op === 'is not' || op === '!=') res = left !== right;
          else if (op === '<') res = left < right;
          else if (op === '<=') res = left <= right;
          else if (op === '>') res = left > right;
          else if (op === '>=') res = left >= right;
          else throw new Error(`VM Runtime Error: Unsupported binary operator '${op}'`);

          this.stack.push(res);
          break;
        }

        case 'UNARY_OP': {
          const val = this.stack.pop();
          const op = inst.operator;
          let res;
          if (op === '!') res = !val;
          else if (op === '-') res = -val;
          else throw new Error(`VM Runtime Error: Unsupported unary operator '${op}'`);
          this.stack.push(res);
          break;
        }

        case 'JUMP_IF_FALSE': {
          const cond = this.stack.pop();
          if (!cond) {
            this.ip = inst.offset;
          }
          break;
        }

        case 'JUMP':
          this.ip = inst.offset;
          break;

        case 'CALL': {
          const func = this.stack.pop();
          const args = [];
          for (let i = 0; i < inst.argCount; i++) {
            args.unshift(this.stack.pop());
          }
          if (typeof func === 'function') {
            const res = func(...args);
            this.stack.push(res);
          } else {
            throw new Error(`VM Runtime Error: Callee is not callable.`);
          }
          break;
        }

        case 'MEMBER_ACCESS': {
          const obj = this.stack.pop();
          if (obj === undefined || obj === null) {
            throw new Error(`VM Runtime Error: Cannot read property '${inst.property}' of ${obj}`);
          }
          this.stack.push(obj[inst.property]);
          break;
        }

        case 'GET_ITEM': {
          const idx = this.stack.pop();
          const arr = this.stack.pop();
          if (arr === undefined || arr === null) {
            throw new Error(`VM Runtime Error: Cannot read index '${idx}' of ${arr}`);
          }
          this.stack.push(arr[idx]);
          break;
        }

        case 'SET_ITEM': {
          const key = this.stack.pop();
          const obj = this.stack.pop();
          const val = this.stack[this.stack.length - 1]; // Peek
          obj[key] = val;
          break;
        }

        case 'ARRAY_LIT': {
          const elements = [];
          for (let i = 0; i < inst.count; i++) {
            elements.unshift(this.stack.pop());
          }
          this.stack.push(elements);
          break;
        }

        case 'POP':
          this.stack.pop();
          break;
      }
    }
  }
}

module.exports = {
  BytecodeCompiler,
  VirtualMachine
};
