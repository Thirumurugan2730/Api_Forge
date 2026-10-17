# ApiForge Lite — Spring Edition

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="ApiForge Lite Logo" />
</p>

<p align="center">
  <strong>Lightweight, high-performance desktop API client tailored specifically for Spring Boot developers.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20x64-blue.svg" alt="Platform: Windows x64" />
  <img src="https://img.shields.io/badge/Electron-33.2.1-47848F.svg" alt="Electron: 33.2.1" />
  <img src="https://img.shields.io/badge/Node.js-22.x-339933.svg" alt="Node.js: 22.x" />
  <img src="https://img.shields.io/badge/Tests-155%20Passed-success.svg" alt="Tests: 155 Passed" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" />
</p>

---

## 📖 Overview

**ApiForge Lite** is a standalone desktop application designed to streamline testing, debugging, and documenting REST APIs built with Spring Boot. Unlike heavy, slow general-purpose API tools, ApiForge Lite starts up instantly, maintains zero telemetry, runs completely offline, and includes deep native Spring Boot integrations:
- **Instant Spring Boot OpenAPI Discovery** directly from `/v3/api-docs` (local or remote)
- **Spring Security Role Testing Matrix** to verify ADMIN, USER, and Anonymous access rules in parallel
- **Deterministic Spring Boot Error Explainer** that unpacks Spring Boot validation errors, RFC 7807 `ProblemDetail`, and Whitelabel errors into actionable troubleshooting steps
- **Declarative Automated Testing Engine** with status, latency, header, and JSON body assertions
- **Atomic Local Storage** for collections, folders, request history, and settings without cloud dependencies

---

## ✨ Key Features

### 1. Interactive HTTP Request Engine
- **All 7 HTTP Methods Supported:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- **Query Parameter Builder:** Table-driven key-value editor with automatic URL query string synchronization and path parameter extraction (`{id}`).
- **Header Management:** Custom headers with automatic CRLF injection prevention and Content-Type negotiation.
- **JSON Body Editor:** Syntax validation, automatic JSON beautification/minification, and error banners for malformed payloads.
- **Request Cancellation:** Live cancellation of in-flight requests with deterministic timeout handling (1,000–120,000 ms).

### 2. High-Performance Response Viewer
- **Pretty & Raw Views:** Formatted JSON with syntax highlighting or raw unformatted output.
- **Full Text Selection:** Mouse click-and-drag selection and `Ctrl+C` copying inside the response body without unwanted box-copy triggers.
- **Response Metrics:** Real-time metrics showing HTTP status badge, exact response time in milliseconds, payload size in bytes, and content headers.
- **Copy Utilities:** One-click copy buttons for response body and formatted headers.

### 3. Spring Boot Endpoint Discovery & OpenAPI 3.x Import
- **One-Click Sidebar Discovery:** Click the refresh button in the **SPRING BOOT ENDPOINTS** section to automatically fetch and group all endpoints from `http://localhost:8080/v3/api-docs`.
- **Remote Document Support:** Import specifications from remote hosts (HTTP/HTTPS) with custom base URL resolution and environment variable bindings (`{{baseUrl}}`).
- **File Upload:** Open local OpenAPI 3.0 / 3.1 JSON specification files.
- **Selective Import:** Preview endpoints with method badges, summaries, and tags before adding them into your collections.

### 4. Spring Security Role Testing Matrix
- **3-Identity Parallel Verification:** Test any endpoint against **ADMIN**, **USER**, and **Anonymous** identities in a single click.
- **Access Expectation Rules:** Configure expected status codes:
  - Exact status (e.g. `200`, `401`, `403`)
  - Semantic `2xx Success`
  - Semantic `401/403 Denied`
  - Informational / No expectation
- **Strict Credential Isolation:** Independent Bearer JWT tokens or custom auth headers per identity; Anonymous requests completely strip inherited headers and cookies.
- **Security & Redaction:** Tokens are masked in the UI and never persisted in plain text to collections, history, or logs.

### 5. Spring Boot Error Explainer
- **Automated Root-Cause Analysis:** Activates on any 4xx or 5xx response (400, 401, 403, 404, 405, 415, 422, 429, 500).
- **Validation Error Parsing:** Automatically parses Spring Boot 2, Spring Boot 3 RFC 7807 `ProblemDetail`, and map errors, presenting a clean table of rejected fields, constraint types (`@NotNull`, `@Size`, `@Email`), and rejected values.
- **3-Tier Actionable Guidance:** 
  1. *What Happened* (the precise HTTP and framework reason)
  2. *Possible Causes* (Spring controller, security filter, or DTO mismatch)
  3. *What to Check Next* (concrete steps in your Spring code)

### 6. Automated Testing Engine
- **5 Assertion Types:**
  - **Status Code:** Exact match validation
  - **Response Time:** Maximum duration threshold in milliseconds
  - **JSON Body:** Property presence, dot/bracket notation (`$.user.id`), and value equality
  - **Headers:** Header presence and case-insensitive equality
  - **Body Content:** Plain text substring matching (case-sensitive or insensitive)
- **Presets & Auto-Run:** One-click test assertion presets and optional automatic evaluation upon receiving a response.
- **Diff Inspector:** Clear visual PASS/FAIL badges with expected vs actual comparison.

### 7. Collections & Request History
- **Nested Folder Structure:** Organize requests into collections and multi-level folders.
- **Safe Persistence:** Atomic disk writes (`.tmp` -> rename) to `%APPDATA%\apiforge-lite\collections` preventing corruption.
- **Sensitive Credential Sanitization:** Automatically masks authorization headers, cookies, and tokens as `***` in request history.
- **Light & Dark Theme:** Built-in dark mode and clean light theme.

---

## 🚀 Getting Started

### Option 1: Standalone Windows Installer (Recommended for Users)
1. Download **`ApiForge Lite Setup 0.1.0.exe`** from the `dist/` directory or GitHub Releases.
2. Run the installer:
   - If Windows SmartScreen shows a prompt, click **More info** &rarr; **Run anyway**.
   - Follow the setup wizard to create Desktop and Start Menu shortcuts.
3. Launch **ApiForge Lite** directly from your Desktop or Start Menu.
   *(No Node.js, npm, or terminal required!)*

---

### Option 2: Running from Source (For Developers)

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended, tested on Node 22.x)
- npm (bundled with Node.js)

#### 1. Clone the repository
```bash
git clone https://github.com/Thirumurugan2730/Api_Forge.git
cd Api_Forge
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Run in development mode
```bash
npm start
```

#### 4. Run automated test suite
```bash
npm test
```
*(Runs all 155 unit and integration tests across foundation, HTTP, collections, history, automated testing, OpenAPI import, error explainer, and role matrix).*

#### 5. Build the Windows installer package
```bash
npm run dist
```
The packaged NSIS installer `.exe` and unpacked standalone executable will be generated inside the `dist/` folder:
- Installer: `dist/ApiForge Lite Setup 0.1.0.exe`
- Standalone Portable Binary: `dist/win-unpacked/ApiForge Lite.exe`

---

## 🏗️ Architecture & Security Model

```
ApiForge Lite
├── src/
│   ├── main/                 # Electron Main Process (Node.js runtime)
│   │   ├── explainer/        # Spring Boot Error Explainer rules & parser
│   │   ├── http/             # Hardened HTTP engine, timeout & CRLF validation
│   │   ├── ipc/              # Typed IPC handlers (collections, history, settings, tests)
│   │   ├── openapi/          # OpenAPI 3.x parser & server URL resolution
│   │   ├── roles/            # Spring Security Role Matrix runner & identity isolation
│   │   ├── security/         # Navigation security, window open blocking & sandbox
│   │   ├── storage/          # Atomic JSON persistence (app.getPath('userData'))
│   │   ├── tests/            # Test assertion evaluation engine
│   │   └── main.js           # Main application entry point & lifecycle
│   ├── preload/
│   │   └── preload.js        # Strict contextBridge freeze (zero direct Node exposure)
│   └── renderer/             # Chromium Renderer UI
│       ├── scripts/          # Vanilla JavaScript UI logic & DOM event controllers
│       ├── styles/           # Modern dark graphite CSS design system
│       └── index.html        # Semantic HTML5 desktop workbench
├── assets/                   # High-resolution icons (.ico, .png)
└── tests/                    # Comprehensive unit & integration test suites
```

### Security Highlights
- **Context Isolation & Sandboxing:** Preload bridge uses `contextBridge.exposeInMainWorld('apiForge', ...)` with frozen APIs. No Node.js integration in the renderer.
- **Content Security Policy (CSP):** Strictly blocks external scripts, inline eval, and unintended network origin connections.
- **Path Traversal Protection:** All file storage operations check paths strictly against the configured user data directory.
- **Sanitized Persistence:** Persistent tokens and passwords are redacted before saving history entries to disk.

---

## 🤝 Testing with Spring Boot

To test ApiForge Lite against a live Spring Boot application:
1. Start your Spring Boot backend on `http://localhost:8080` with `springdoc-openapi` included:
   ```xml
   <dependency>
       <groupId>org.springdoc</groupId>
       <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
       <version>2.5.0</version>
   </dependency>
   ```
2. Open ApiForge Lite.
3. Click the **Refresh** button under **SPRING BOOT ENDPOINTS** in the left sidebar to discover all controller endpoints.
4. Click any discovered endpoint to load its path, HTTP method, and headers into the active request editor.

---
