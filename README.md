# ApiForge Lite — Spring Edition

ApiForge Lite is a lightweight, secure Windows desktop API client tailored specifically for Spring Boot developers.

---

## 1. Project Overview

ApiForge Lite is designed as a focused, high-performance desktop tool for testing and developing Spring Boot APIs. It replaces bloated, slow API suites with a clean, developer-first architecture.

* **Step 1 (Completed)**: Established the Electron application shell, secure preload bridge (`window.apiForge`), context isolation, sandboxing, navigation security, and dark graphite UI.
* **Step 2 (Completed)**: Implemented the **Real HTTP Engine**, **Interactive Request Builder**, and **Response Viewer**.
* **Step 3 (Completed)**: Implemented **Collections and Folders Management**, **Local Atomic JSON Storage**, request saving/reopening with full HTTP metadata, unsaved changes tracking, and recursive tree navigation.

---

## 2. Features Implemented in Step 3: Collections and Folders

### A. Collections & Folder Management
* **Sidebar Tree View**: Clean, collapsible tree view of collections, folders, and saved requests with HTTP method badges (`GET`, `POST`, `PUT`, `DELETE`, etc.).
* **Hierarchical Nesting**: Multi-level nested folders within collections, supporting requests at collection root or organized deeply inside subfolders.
* **Full CRUD Operations**:
  - Collections: Create, Rename, Duplicate, Delete (with cascade delete confirmation).
  - Folders: Create (root or nested), Rename, Duplicate, Delete.
  - Requests: Save, Reopen in editor, Rename, Duplicate, Delete.
* **Safe Confirmation Dialogs**: Non-blocking modal confirmations before destructive delete operations to prevent accidental data loss.

### B. Request Saving & Reopening
* **Save New & Existing Requests**: Seamlessly saves URL, HTTP method, query parameters (with enabled/disabled states), custom headers, and JSON request body.
* **Direct Save (`Ctrl+S`)**: Existing requests save instantly to disk with updated visual feedback. Unsaved requests prompt the Save Modal with collection and folder selectors.
* **Save As (`btn-save-as-request`)**: Allows saving copies or branching requests under different collections or folders.
* **Unsaved Changes Tracking**: Visual indicator dot (`.save-indicator-dot`) in the header and tab strip detects differences between the working request and the saved snapshot on disk.
* **Reopen Saved Requests**: Clicking any request in the tree restores the complete editor configuration with all HTTP parameters, headers, and payload preserved.

### C. Local Atomic JSON Storage (`src/main/storage/collectionsStorage.js`)
* **Dedicated Storage Path**: All data is stored under Electron's `app.getPath('userData')/collections`.
* **Atomic File Writes**: Writes data to a temporary file (`.tmp`) and performs an atomic rename, preventing file corruption during power interruptions or application termination.
* **Corruption Recovery**: Detects corrupted JSON files, logs diagnostic warnings, isolates corrupt records, and continues running gracefully without application crashes.
* **Path Traversal Security**: Validates all collection, folder, and request IDs against strict alphanumeric patterns (`/^[a-zA-Z0-9_-]+$/`), resolves absolute target paths, and asserts they remain strictly within the designated storage directory.
* **Zero Direct Filesystem Access in Renderer**: The renderer process has no Node filesystem access. All storage interactions are securely routed through validated IPC handlers.

---

## 3. Core HTTP Engine & Request Builder (Step 2)

### A. Main-Process HTTP Engine (`src/main/http/httpClient.js`)
* **Real Network Dispatch**: Requests execute exclusively within the Node.js Electron Main Process via `fetch`.
* **All 7 HTTP Methods Supported**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
* **Streaming Byte Limits**: Enforces a strict 5 MiB response limit to guard against memory exhaustion.
* **Configurable Timeouts**: Request execution aborts cleanly with `TIMEOUT` error after 15,000 ms.
* **Real-time Cancellation**: Supports manual request cancellation via `AbortController`.
* **Error Normalization**: Maps network failures (`ECONNREFUSED`, `ENOTFOUND`, timeouts) into user-friendly error cards while treating HTTP 4xx/5xx as valid responses.

### B. Interactive Request Builder
* **Dynamic URL & Query Parameter Sync**: Two-way synchronization between the URL query string and parameter table.
* **Headers Table & Presets**: One-click presets for `Content-Type: application/json` and `Authorization: Bearer <token>`.
* **JSON Body Editor**: Real-time syntax validation with inline error messaging and JSON formatting.
* **Method Constraints**: Request bodies are strictly prohibited and disabled in the UI for `GET` and `HEAD` requests.

---

## 4. Security Architecture

ApiForge Lite strictly implements Electron desktop security best practices:
1. **Context Isolation**: `contextIsolation: true` is strictly enforced.
2. **Node Integration Disabled**: `nodeIntegration: false` in all `BrowserWindow` configurations.
3. **Chromium Sandbox**: `sandbox: true` enabled across all renderer contexts.
4. **Preload Bridge**: Narrowly scoped, frozen API exposed via `contextBridge.exposeInMainWorld('apiForge', Object.freeze(...))`.
5. **Path Traversal Defense**: All filesystem storage APIs enforce path resolution checks and ID pattern validation.
6. **Strict CSP**: Content Security Policy blocks inline script evaluation and external resource loading.

---

## 5. How to Run and Test

From the project root: `C:\Users\thiru\OneDrive\Desktop\API_Forge`

### Install Dependencies
```powershell
npm install
```

### Run Automated Unit & Integration Tests (57 Tests)
```powershell
npm test
```
*Executes all 57 tests across 11 test suites using the Node.js built-in test runner, including foundation security checks, HTTP engine integration tests, and collection/folder atomic storage tests.*

### Run End-to-End Electron Smoke Test
```powershell
npm run test:smoke
```
*Launches Electron in an automated test harness to verify UI rendering, live HTTP request dispatch, collection creation, folder nesting, request saving, reopening, duplication, and deletion.*

### Launch Desktop Application
```powershell
npm start
```
*or:*
```powershell
npm run dev
```

---

## 6. Project Structure

```
API_Forge/
├── package.json
├── README.md
├── src/
│   ├── main/
│   │   ├── main.js                      # Electron Main process lifecycle & window manager
│   │   ├── http/
│   │   │   └── httpClient.js            # Main process HTTP engine & validation
│   │   ├── ipc/
│   │   │   └── appHandlers.js           # Validated IPC handlers (app, http, collections)
│   │   ├── security/
│   │   │   └── navigation.js            # Web navigation security & URL filtering
│   │   └── storage/
│   │       └── collectionsStorage.js    # Atomic JSON storage engine for collections
│   ├── preload/
│   │   └── preload.js                   # Secure frozen preload bridge
│   └── renderer/
│       ├── index.html                   # Dark theme UI layout, tree sidebar, modal dialogs
│       ├── scripts/
│       │   └── renderer.js              # Renderer controller (tabs, tree, HTTP dispatch, modals)
│       └── styles/
│           └── main.css                 # Graphite dark design system & component styles
└── tests/
    ├── foundation.test.js               # Step 1 security & configuration unit tests
    ├── http.test.js                     # Step 2 HTTP engine & integration tests
    ├── collections.test.js              # Step 3 collections & atomic storage unit tests
    └── smoke.js                         # Electron runtime end-to-end smoke test
```

---

## 7. Next Steps

* **Step 4**: Request History & Environment Variable Management (`{{baseUrl}}`, active environments).
* **Step 5**: Authentication Tokens, Bearer Presets & OpenAPI import.
