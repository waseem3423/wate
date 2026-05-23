# ⚡ WATE Programming Language

> **Modern scripting language powered by AST parsing, bytecode VM, sandboxed runtime permissions, LSP support, REPL, and WPM package manager.**

<div align="center">

[![Release](https://img.shields.io/badge/Release-v10.0.0--Stable--Core-blueviolet?style=for-the-badge&logo=github)](#)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue?style=for-the-badge&logo=windows)](#)
[![Developer](https://img.shields.io/badge/Built_By-WazemTech-FF6B35?style=for-the-badge)](#)

</div>

---

## 🌟 What is WATE?

**WATE** (Waseem Akram Transcription Engine) is an elegant, secure, and production-ready programming language. It delivers top-tier performance by utilizing a hybrid design of transpilation and virtual machine execution. WATE bridges the gap between high-level development speed and low-level runtime control.

### Key Highlights:
- 🚀 **Built-in Web Framework:** Robust, native HTTP routing system with route parameter bindings and middleware.
- 🔒 **Sandboxed Permission Engine:** Node/Deno-like runtime permission guards (`--allow-net`, `--allow-read`, `--allow-write`, `-A`).
- 🗄️ **Multi-Driver Database Layer:** Native support for SQLite, PostgreSQL, MySQL, MongoDB, and JSON storage out-of-the-box.
- 🤖 **Native Web Automation:** Dynamic browser automation (headless navigation and web scraping) via the `bot` package.
- 📦 **WPM Package Manager:** Instantly install 12 high-performance pre-bundled standard libraries offline.
- 🧩 **Developer-First DX:** Custom VS Code language extension with 20+ ready-to-use snippets, syntax highlighting, and active LSP autocompletion.

---

## 🏗️ Architecture

WATE uses a highly optimized compile and run pipeline. It converts source code into a highly structured AST, performs static type check passes, tree-shakes unused methods, compiles to bytecode, and interprets it inside a secure virtual machine sandbox.

```mermaid
graph TD
    A[WATE Source File .wate] --> B[Tokenizer / Lexer]
    B --> C[Recursive Descent AST Parser]
    C --> D[Static Type Inference Engine]
    D --> E[Tree Shaking & Dead Code Eliminator]
    E --> F[WATE Compiler]
    F --> G[VM Bytecode Generation]
    G --> H[Sandboxed Virtual Machine VM]
    H --> I[Output & Executable Thread Execution]
    
    style A fill:#0F1B3D,stroke:#00D4FF,stroke-width:2px,color:#fff
    style C fill:#1A0A3D,stroke:#A855F7,stroke-width:2px,color:#fff
    style E fill:#1A0A3D,stroke:#A855F7,stroke-width:2px,color:#fff
    style H fill:#0F1B3D,stroke:#FF6B35,stroke-width:2px,color:#fff
```

### ASCII Representation:
```
┌─────────────────────────────────────────────────────┐
│                  WATE Source (.wate)                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│         Recursive Descent AST Parser                │
│   • Tokenizer → Token Stream → AST Nodes            │
│   • Caret Diagnostics (line, column, error-highlight)│
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Bytecode Compiler / VM                  │
│   • AST → Bytecode Instructions                     │
│   • Static Type Inference Engine & Warnings         │
│   • Tree Shaking (Dead Code Elimination)            │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│               Sandboxed Runtime                     │
│   • Permission guards: --allow-net, --allow-read    │
│   • Multi-thread workers pool                       │
│   • Hot Reload watcher (--watch)                    │
└─────────────────────────────────────────────────────┘
                        │
               ┌─────────┼─────────┐
               ▼         ▼         ▼
          WPM (pkg)  LSP Server  REPL
          12 pkgs    VS Code     Interactive
```

---

## ⚙️ Installation Guide

### Option 1: Automatic Installer (Windows - Highly Recommended)
1. Download `WATE_Setup_v1.0.0.exe` from the latest **[GitHub Releases](https://github.com/waseem3423/wate/releases)** page.
2. Run the installer. It will:
   - Configure paths in your system environment variable `PATH`.
   - Setup global executable aliases for `wate` and `wpm`.
   - Setup custom file associations so `.wate` files show a premium branded WATE icon.
   - Automatically register the VS Code, Cursor, Windsurf, and Antigravity extensions.
3. Open a terminal and run:
   ```powershell
   wate version
   wpm --help
   ```

### Option 2: Building from Source
If you wish to compile the binaries manually from source code:
1. Ensure Node.js (v18+) is installed.
2. Clone the repository and install global packaging requirements:
   ```bash
   git clone https://github.com/waseem3423/wate.git
   cd wate
   npm install -g pkg
   ```
3. Compile the standalone executables:
   ```bash
   # Compile WATE Engine
   pkg wate.js --targets node18-win-x64 --output wate.exe

   # Compile WPM Package Manager
   pkg wpm.js --targets node18-win-x64 --output wpm.exe
   ```

### Option 3: Manual VS Code Extension Setup
To install the developer highlighting & snippets manually:
```bash
code --install-extension wate-vscode/wate-lang-2.0.0.vsix --force
```

---

## 🚀 Quick Start

Create a file named `hello.wate` and paste the following snippet:

```wate
# hello.wate
fn greet(name) {
    return f"Hello, {name}! Welcome to WATE ⚡"
}

set developers = ["Waseem", "Antigravity", "World"]
for dev in developers {
    out(greet(dev))
}
```

Now, run the script from your terminal:
```bash
wate hello.wate
```

**Output:**
```
Hello, Waseem! Welcome to WATE ⚡
Hello, Antigravity! Welcome to WATE ⚡
Hello, World! Welcome to WATE ⚡
```

---

## 📦 WPM Package Manager

WATE is equipped with **WPM**, a dedicated standard library package manager. WPM allows you to seamlessly fetch and configure robust system modules instantly:

| Module | Category | Description |
|:---|:---|:---|
| 🌐 `web` | Server | Full Web framework with routing, middleware, and request/response abstraction. |
| 🤖 `bot` | Automation | Browser automaton API for headless navigation, testing, and scraping. |
| 📂 `db` | Database | Zero-dependency Document-based JSON database with automatic file persistence. |
| 🧠 `ai` | AI Integration| Deep Gemini-style API bindings to query large language models dynamically. |
| 💾 `sqlite` | Database | Embedded, high-performance database client module. |
| 🐘 `postgres`| Database | PostgreSQL connection client supporting transactions. |
| 🐬 `mysql` | Database | MySQL database engine module supporting connection pooling. |
| 🍃 `mongodb`| Database | NoSQL MongoDB database driver. |
| 📊 `csv` | Utility | Fast CSV generator and parsing module. |
| 📈 `excel` | Utility | Programmatically read, edit, and write native `.xlsx` workbooks. |
| 📄 `pdf` | Utility | Rich vector PDF rendering engine for standard report sheets. |
| 🖼️ `image` | Utility | Manipulate, resize, crop, and convert graphics programmatically. |

### WPM Commands:
```bash
wpm install web        # Install Web Framework
wpm install sqlite     # Install SQLite Client
wpm list               # View all installed modules
wpm remove web         # Uninstall a module
```

---

## 📁 Examples Folder & Code Snippets

For hands-on coding, explore the **[examples](./examples)** directory where you'll find ready-to-run configurations:
- 🌐 [HTTP Server Example](./examples/server.wate)
- 💾 [SQLite Query Operations](./examples/database.wate)
- 🤖 [Web Scraper Automation](./examples/automation.wate)
- ⏰ [Task Scheduler Daemon](./examples/scheduler.wate)
- 🚀 [Hello World Entrypoint](./examples/hello.wate)

---

## 📖 Deep Language Demos

### 1. Object-Oriented Interface Guard
```wate
interface Printable {
    method printDetails;
}

class Product implements Printable {
    init(title, price) {
        this.title = title
        this.price = price
    }

    printDetails() {
        out(f"Product: {this.title} | Price: ${this.price}")
    }
}

set item = Product("WATE Manual Book", 49.99)
item.printDetails()  # => Product: WATE Manual Book | Price: $49.99
```

### 2. Sandbox Permissive Guarding
```wate
# Execute script with strict access controls
# CLI: wate run secure.wate --allow-read

set source = file.read("config.json")       # ✅ Granted successfully
set request = http.get("https://google.com") # ❌ Exception: WATE Permission Denied!
```

### 3. Task Scheduler & Timer
```wate
# Heartbeat check runs every 5 seconds
set check = every("5s", fn() {
    out(f"🚀 [Daemon Logger] System health status green at {date.time()}")
})
```

---

## 🗺️ Product Roadmap

| Goal Status | Title | Description |
|:---:|:---|:---|
| 🟢 **Stablized** | AST Engine & Lexer | Custom recursive descent syntax compilation. |
| 🟢 **Stablized** | Bytecode VM Interpreter | Sandboxed low-overhead execution shell. |
| 🟢 **Stablized** | Caret Error Pointer | Visual highlighting of syntax errors with exact column diagnostics. |
| 🟢 **Stablized** | WPM package system | 12 built-in enterprise driver modules pre-packaged. |
| 🟢 **Stablized** | Extension Snippets v2.0.0| 20+ ready templates with VS Code syntax configuration. |
| 🟢 **Stablized** | Auto Test Runner | Integrated `wate test` suite runner with clean summaries. |
| 🟡 **In-Development** | WATE Web Playground | Run WATE code directly inside any web browser. |
| 🟡 **In-Development** | Public package registry | Community-submitted modules hosting library. |
| 🔵 **Future Planned**| WASM compiler output | Native WebAssembly compiling pipeline. |
| 🔵 **Future Planned**| VS Code Visual Debugger | Live interactive break-points debugging panel. |

---

## 📄 License
WATE is open-source software licensed under the **[MIT License](./LICENSE)**.

---
<div align="center">
Built with ❤️ by <b>WazemTech (Waseem Akram)</b>. Give WATE a ⭐ on GitHub!
</div>
