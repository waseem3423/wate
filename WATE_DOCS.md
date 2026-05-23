# WATE Language — Quick Reference & Examples

> ⚡ WATE v10.0.0 | Built by WazemTech (Waseem Akram)

---

## 🚀 Hello World
```wate
out("Hello, World!")
print("Hello from WATE!")
```

---

## 📦 Variables
```wate
set name = "Waseem"
set age  = 25
const PI = 3.14159

out(f"Name: {name}, Age: {age}")
```

---

## 🔧 Functions
```wate
fn greet(name) {
    return f"Hello, {name}!"
}

out(greet("Waseem"))

# Anonymous function
set square = fn(x) { return x * x }
out(square(5))   # => 25
```

---

## 🔀 Control Flow
```wate
set x = 10

if x > 5 {
    out("x is greater than 5")
} else {
    out("x is 5 or less")
}
```

---

## 🔁 Loops
```wate
# For-in loop
set fruits = ["apple", "mango", "banana"]
for fruit in fruits {
    out(fruit)
}

# While loop
set i = 0
while i < 5 {
    out(i)
    i = i + 1
}
```

---

## 🏛️ Classes
```wate
class Animal {
    # Any method named 'init' or any other name works as constructor
    init(name, sound) {
        this.name = name
        this.sound = sound
    }

    speak() {
        return f"{this.name} says {this.sound}"
    }
}

set dog = Animal("Dog", "Woof!")
out(dog.speak())
```

> **Note:** WATE uses `init()` as the conventional constructor method name.
> Call `Animal(...)` to create an instance — WATE auto-calls `init` on construction.

---

## 📁 File I/O
```wate
# Requires: --allow-read --allow-write
file.write("hello.txt", "Hello from WATE!")
set content = file.read("hello.txt")
out(content)
```

---

## 🌐 HTTP Requests
```wate
# Requires: --allow-net
set res = http.get("https://api.github.com")
out(res)
```

---

## 🧮 Math
```wate
out(math.sqrt(144))     # => 12
out(math.pow(2, 10))    # => 1024
out(math.abs(-42))      # => 42
out(math.round(3.7))    # => 4
out(math.max(1, 2, 3))  # => 3
```

---

## 📝 String Operations
```wate
set msg = "Hello, World!"
out(str.upper(msg))        # HELLO, WORLD!
out(str.lower(msg))        # hello, world!
out(str.length(msg))       # 13
out(str.replace(msg, "World", "WATE"))  # Hello, WATE!
out(str.contains(msg, "World"))  # True
out(str.split(msg, ", "))  # ["Hello", "World!"]
```

---

## 🛡️ Try-Catch
```wate
try {
    set data = file.read("missing.txt")
} catch(e) {
    out(f"Error caught: {e}")
}
```

---

## 🔄 Imports & Packages
```wate
import "db"
import "bot"
import "ai"

set db = Database("mydata.json")
set users = db.collection("users")
users.insert({ name: "Waseem", role: "creator" })
```

---

## 🧵 Multi-Thread Workers
```wate
# main.wate
set worker = thread.create("worker.wate")
worker.onMessage(fn(msg) {
    out(f"Worker replied: {msg}")
})
worker.postMessage("start")

# worker.wate
thread.onMessage(fn(msg) {
    thread.postMessage(f"Got your message: {msg}")
})
```

---

## ⚡ CLI Commands
```bash
wate hello.wate                  # Run a script
wate run app.wate --allow-net    # Run with network access
wate test                        # Run all tests in tests/ folder
wate test tests/01_vars.wate     # Run a specific test
wate --watch server.wate -A      # Hot reload mode
wate help                        # Show full help
wate version                     # Show version
```

---

## 📊 Built-in Modules Summary

| Module    | Purpose                        | Example                      |
|-----------|-------------------------------|------------------------------|
| `out`     | Print to console               | `out("Hello")`               |
| `file`    | File read/write                | `file.read("f.txt")`         |
| `sys`     | OS / shell commands            | `sys.exec("ls")`             |
| `http`    | HTTP client                    | `http.get("url")`            |
| `math`    | Math operations                | `math.sqrt(16)`              |
| `str`     | String utilities               | `str.upper("hi")`            |
| `json`    | JSON parse/stringify           | `json.parse("{}")`           |
| `date`    | Date & time                    | `date.now()`                 |
| `color`   | Terminal colors                | `color.green("ok")`          |
| `os`      | OS information                 | `os.platform()`              |
| `thread`  | Multi-thread workers           | `thread.create("w.wate")`    |
| `assert`  | Test assertions                | `assert.equal(1, 1, "ok")`   |
| `list`    | List/array utilities           | `list.sort([3,1,2])`         |
| `crypto`  | Hashing & encoding             | `crypto.md5("text")`         |
| `regex`   | Regular expressions            | `regex.test("[a-z]+", "hi")` |
| `wpath`   | File path utilities            | `wpath.join("a", "b")`       |
| `timer`   | setTimeout / setInterval       | `timer.sleep(1000)`          |
| `every`   | Interval scheduler             | `every("5s", fn() {...})`    |
