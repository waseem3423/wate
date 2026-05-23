# ⚡ WATE Programming Language

> **A production-ready, ultra-fast scripting language and automation engine**
> Created by **WazemTech (Waseem Akram)**

[![Version](https://img.shields.io/badge/version-12.0.0-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20Mac-lightgrey)](#)

WATE is a **high-performance, human-friendly scripting language** designed for rapid backend development, job scheduling, database management, and browser automation. Powered by a custom **Recursive Descent AST Parser**, WATE compiles directly to optimized JavaScript and packages into a standalone single-file Windows executable `.exe` — with ZERO external dependencies!

---

## 🚀 Key Production Features

* **⚡ AST-Level Recursive Inlining Compiler** — Compiles files and dependency package sub-nodes into a single unified execution stream.
* **📦 Professional WPM Package Manager** — Includes built-in offline pre-bundled fallback implementations for 12 official enterprise packages.
* **⚠️ High-Fidelity Caret Diagnostics** — Direct console pointers pointing to precise filenames, error lines, columns, and surrounding code blocks.
* **💾 Rich OOP & Compile-Time Checklists** — ES6 classes, getters/setters, constructor trees, private fields (`#name`), and interface validations.
* **⏱️ Pythonic Job Scheduler** — Native async job tick scheduler (`every`) with time-unit parsing (`"2s"`, `"5m"`, `"3h"`, `"1d"`).
* **🌐 Web Automation & Real OS Browser Popup** — Visual OS browser window controller supporting `open`, `click`, `type`, and `wait` interactions.

---

## 📦 Installation & Standalone Compilation

```powershell
# 1. Install packaging tool globally
npm install -g pkg

# 2. Package WATE Compiler and WPM Registry into global executables
pkg wate.js --targets node18-win-x64 --output wate.exe
pkg wpm.js --targets node18-win-x64 --output wpm.exe

# 3. Add to your Windows User PATH or execute locally
.\wpm.exe --help
.\wate.exe --help
```

---

## 📖 Language Cheat Sheet & Advanced Syntax

### Async / Await HTTP Query
```wate
async fn fetchStats() {
    out("Fetching data asynchronously...")
    set data = await http.get("https://jsonplaceholder.typicode.com/posts/1")
    out(f"Response Received: {data}")
}
fetchStats()
```

### Try-Catch-Finally Exception Handling
```wate
try {
    throw "Fatal connection failure"
} catch (e) {
    out(f"⚠️ Recovered: {e.message}")
} finally {
    out("Cleanup execution complete.")
}
```

### Pythonic Job Scheduler
```wate
# Executed automatically every 5 minutes in background
set scheduleHandle = every("5m", fn() {
    out("⏱️ Background tick running every 5 minutes!")
})
```

---

## 📦 WPM Official Packages Registry (12 Core Modules)

WPM includes **12 pre-bundled production packages** in its local offline fallback registry. You can install them in any directory with `.\wpm.exe install <pkg>`:

### 1. 🌐 `web` (High-Performance HTTP Router)
```wate
import "web"

set app = WebApp()

app.get("/", fn(req, res) {
    res.json({ message: "WATE Production Backend Running" })
})

app.listen(8080, fn() {
    out("🚀 Server listening at http://localhost:8080")
})
```

### 2. 🤖 `bot` (Browser Scraper & Automated Web Tester)
```wate
import "bot"

async fn scrapeWeb() {
    # Pops up real system default browser viewport visually!
    bot.open("https://example.com")
    bot.click("#login")
    bot.type("#email", "test@gmail.com")
    await bot.wait(2000)
    out("Scraping completed!")
}
scrapeWeb()
```

### 3. 💾 `db` (Document JSON Persistent DB)
```wate
import "db"

set database = Database("prod_records.json")
set employees = database.collection("employees")

employees.insert({ id: 101, name: "Waseem", status: "Active" })
set results = employees.find(fn(emp) { return emp.status is "Active" })
```

### 4. 🧠 `ai` (Gemini-style LLM Text Generator)
```wate
import "ai"

set client = AIClient("your-api-key")
set completion = client.generateText("Hello AI, how do database pools work?")
out(completion)
```

### 5. 🐬 `mysql` (MySQL Client Connection Pool)
```wate
import "mysql"

set db = MySQLClient({ host: "127.0.0.1", port: 3306, user: "root" })
if (db.ping()) {
    set records = db.query("SELECT * FROM products WHERE stock > ?", [10])
}
```

### 6. 🐘 `postgres` (PostgreSQL Client with Transaction support)
```wate
import "postgres"

set db = PostgresClient("postgresql://admin:secret@localhost:5432/db")
db.transaction(fn() {
    db.query("UPDATE accounts SET status = 'active' WHERE id = ?", [404])
})
```

### 7. 💾 `sqlite` (SQLite Embedded Database Client)
```wate
import "sqlite"

set db = SQLiteDatabase("app.db")
set rows = db.query("SELECT * FROM tasks WHERE due_date = ?", ["today"])
```

### 8. 🍃 `mongodb` (MongoDB Document Schema Client)
```wate
import "mongodb"

set client = MongoClient("mongodb://localhost:27017", "shop")
set items = client.collection("items")
items.insertOne({ name: "Gaming PC", price: 1200 })
```

### 9. 📄 `csv` (CSV File Parser and Stringifier)
```wate
import "csv"

set parsedRows = csv.parse("id,name\n1,Waseem\n2,Developer")
set rawCSV = csv.stringify([{ id: 1, name: "Waseem" }], ["id", "name"])
```

### 10. 📈 `excel` (Excel Spreadsheet Reader and Writer)
```wate
import "excel"

excel.write("report.xlsx", { "Q1": [{ name: "Sales", revenue: 50000 }] })
set sheetData = excel.read("report.xlsx")
```

### 11. 📕 `pdf` (PDF Report Document Generator)
```wate
import "pdf"

pdf.create("invoice.pdf", { title: "WATE Invoice #9981" })
```

### 12. 🖼️ `image` (Image Resizing and Formats Converter)
```wate
import "image"

img.resize("profile.png", 200, 200, "profile_thumb.png")
img.convert("profile_thumb.png", "jpg", "profile_thumb.jpg")
```

---

## 🛠️ CLI Operations Reference

```powershell
# 1. Initialize a new WATE repository configuration
.\wpm.exe init

# 2. Install official dependencies
.\wpm.exe install web
.\wpm.exe install sqlite
.\wpm.exe install excel

# 3. View installed package tree
.\wpm.exe list

# 4. Compile and execute any script file
.\wate.exe tests/12_office_media_integration.wate
```

---

## 🧬 OOP & Compile-Time Interface Verifications

WATE provides structural compiler checks verifying interface conformance checks at build time before compiling to output:

```wate
interface Runnable {
    method runTask;
}

class CustomJob implements Runnable {
    fn runTask() {
        out("Job completed!")
    }
}
```

---

## 📄 License
MIT © WazemTech (Waseem Akram)
