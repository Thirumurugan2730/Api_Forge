# ApiForge Lite — Spring Edition (Step 1: Foundation)

ApiForge Lite is a lightweight Windows desktop API client tailored specifically for Spring Boot developers.

This repository contains **Step 1: Foundation**, establishing a secure, production-grade Electron desktop architecture capable of scaling to future steps without rewrites.

---

## 1. Project Overview

ApiForge Lite provides a focused alternative to bloated API testing clients. Designed around Spring Boot workflows, future releases will feature native OpenAPI synchronization (`/v3/api-docs`), plain-language Spring error explanations, JWT token management, and role-based test matrices.

**Step 1** strictly implements the foundational desktop shell, main process lifecycle, secure IPC communication bridge, and UI workspace.

---

## 2. Features Implemented in Step 1

* **Hardened Electron Security Shell**:
  * `contextIsolation: true` strictly enforced.
  * `nodeIntegration: false` strictly enforced.
  * Process sandboxing enabled (`sandbox: true`).
  * Restrictive Content Security Policy (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self';`). No `unsafe-eval`.
  * External navigation lockdown: Blocks unauthorized web requests, links, webviews, and popups.
  * Hardware and system permissions denied by default.
* **Preload IPC Bridge (`window.apiForge`)**:
  * Exposes only a single, frozen contract method: `window.apiForge.getAppInfo()`.
  * Node.js globals, `ipcRenderer`, filesystem access, and unrestricted IPC channels are shielded from the renderer.
  * Validates all incoming arguments in the main process with type, length, and prototype integrity checks.
* **Developer-Centric Dark Desktop UI**:
  * **Left Sidebar**: Custom Spring-themed brand mark, application title, `+ New Request` action, navigation entries with honest phase tags (`Collections [Step 2]`, `History [Step 2]`, `Environments [Step 3]`, `Settings [Step 4]`), and live runtime version indicators.
  * **Top Toolbar**: Workspace breadcrumb hierarchy, environment indicator, and live Electron bridge status chip.
  * **Request Workspace**: Dynamic multi-tab management, HTTP method selector (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`) with method-specific color tags, URL input, and sub-tab panels (`Params`, `Headers`, `Body`, `Tests`).
  * **Response Workspace**: Clean empty state (`"No response yet"`), response metric slots, and honest Step 1 notice upon clicking `Send`.
* **Functional Interactions**:
  * `+ New Request` button and tab strip `+` button dynamically create tabs with unique IDs (`tab_1`, `tab_2`, etc.).
  * Keyboard shortcut `Ctrl+N` / `Cmd+N` creates a new request tab.
  * Method and URL inputs are bound independently to each active tab.
  * Tab close buttons gracefully handle removing tabs while maintaining at least one active tab.
  * Navigation items provide informative toasts explaining when features will be activated instead of remaining dead controls.
* **Automated Test Suite**:
  * 16 unit and contract tests running natively on Node.js built-in test runner (`node --test`).

---

## 3. Features Intentionally Deferred to Later Steps

To maintain strict architectural boundaries, the following capabilities are not part of Step 1:
- Real HTTP network request execution (Step 2).
- URL query parameter parsing and header manipulation engines (Step 2).
- Local JSON collections and request history persistence (Step 2 & Step 3).
- Environment variable substitution (`{{baseUrl}}`) and JWT token handling (Step 3).
- Spring Boot OpenAPI import from `/v3/api-docs` (Step 4).
- Plain-language Spring exception explanations and role testing (Step 5).

---

## 4. Folder Structure

```text
API_Forge/
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── src/
│   ├── main/
│   │   ├── main.js                 # Electron main process & window lifecycle
│   │   ├── ipc/
│   │   │   └── appHandlers.js      # Main IPC handlers with strict argument validation
│   │   └── security/
│   │       └── navigation.js       # Navigation, popup, and permission security rules
│   ├── preload/
│   │   └── preload.js              # Hardened contextBridge contract
│   └── renderer/
│       ├── index.html              # Desktop workspace layout with CSP
│       ├── styles/
│       │   └── main.css            # Dark graphite theme and responsive design
│       └── scripts/
│           └── renderer.js         # Reactive UI, tabs state, and bridge consumer
└── tests/
    └── foundation.test.js          # Automated test suite (16 tests, 6 suites)
```

---

## 5. Security Architecture & Decisions

1. **Context Isolation**: Renderer execution operates in an isolated world (`contextIsolation: true`). The DOM cannot access the preload script's prototype context.
2. **Node Integration**: Disabled entirely in the renderer (`nodeIntegration: false`). No `require`, `Buffer`, or Node built-ins exist in `window`.
3. **Renderer Sandboxing**: `sandbox: true` forces Chromium's sandboxing mechanisms on the renderer process.
4. **Content Security Policy**: `default-src 'self'` prevents loading unauthorized external scripts, images, or frames. `connect-src 'none'` prevents out-of-band network exfiltration from the renderer in Step 1.
5. **Safe IPC Bridge**: Only `window.apiForge.getAppInfo()` is exposed via `contextBridge.exposeInMainWorld()`. The API object is frozen with `Object.freeze()`.
6. **IPC Payload Validation**: Incoming arguments are validated for data type, payload size (maximum 1024 bytes), unknown keys, and prototype tampering before processing.
7. **Navigation Shield**:
   - `setWindowOpenHandler` denies all unexpected popups (`{ action: 'deny' }`).
   - `will-navigate` blocks navigation away from the local `index.html`.
   - `will-attach-webview` denies unauthorized `<webview>` elements.
   - `setPermissionRequestHandler` blocks all hardware permission requests.

---

## 6. Prerequisites

* **Node.js**: v20.x or v22.x (Recommended: Node.js v22.16+)
* **npm**: v10.x or later
* **Operating System**: Windows 10/11 (or macOS / Linux)

---

## 7. Installation & Verification Commands

All commands should be executed from the project root:

`C:\Users\thiru\OneDrive\Desktop\API_Forge`

### Install Dependencies
```bash
npm install
```

### Run Automated Tests
```bash
npm test
```
*Expected result: 16 passing tests across 6 test suites.*

### Launch Application (Development / Desktop Window)
```bash
npm start
```
*or:*
```bash
npm run dev
```

---

## 8. Troubleshooting

* **ComSpec in Minimal Windows Shells**: If `npm install` reports `ERR_INVALID_ARG_TYPE: The "file" argument must be of type string. Received undefined` during the Electron postinstall script, ensure the `ComSpec` environment variable is available:
  ```powershell
  $env:ComSpec = "$env:SystemRoot\system32\cmd.exe"
  npm install
  ```
* **OneDrive File Syncing**: When running on OneDrive-backed Desktop paths, ensure OneDrive is not actively locking files during extraction. If an `EPERM` error occurs, pause OneDrive syncing temporarily or re-run `npm install`.
