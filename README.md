# ApiForge Lite — Spring Edition

ApiForge Lite is a lightweight, secure Windows desktop API client tailored specifically for Spring Boot developers.

---

## 1. Project Overview

ApiForge Lite is designed as a focused, high-performance desktop tool for testing and developing Spring Boot APIs. It replaces bloated, slow API suites with a clean, developer-first architecture.

* **Step 1 (Completed)**: Established the Electron application shell, secure preload bridge (`window.apiForge`), context isolation, sandboxing, navigation security, and dark graphite UI.
* **Step 2 (Completed)**: Implemented the **Real HTTP Engine**, **Interactive Request Builder**, and **Response Viewer**.

---

## 2. Features Implemented in Step 2

### A. Main-Process HTTP Engine (`src/main/http/httpClient.js`)
* **Real Network Dispatch**: Requests execute exclusively within the Node.js Electron Main Process via `fetch`, preventing the renderer from having privileged network access.
* **All 7 HTTP Methods Supported**:
  * `GET`: Dispatches standard GET requests without payload bodies.
  * `POST`: Transmits payload bodies with full header and query support.
  * `PUT`: Transmits full replacement payload bodies.
  * `PATCH`: Transmits partial payload updates.
  * `DELETE`: Transmits DELETE requests, gracefully handling `204 No Content`.
  * `HEAD`: Retrieves response headers without buffering or expecting a response body.
  * `OPTIONS`: Dispatches OPTIONS and receives allowed server methods (`Allow`).
* **Enforced Body Rules**:
  * Request bodies for `GET` and `HEAD` are strictly rejected by validation and disabled in the UI.
  * Request bodies for `POST`, `PUT`, `PATCH`, and `DELETE` are fully supported.
* **Stream-Bounded Response Buffering**:
  * Enforces a configurable 5 MiB (`5 * 1024 * 1024` bytes) response body ceiling while reading the response stream.
  * Automatically cancels stream reading upon exceeding the limit, setting `truncated: true` and notifying the user.
* **Configurable Timeout & Cancellation**:
  * Default 15,000 ms timeout per request using `AbortController`.
  * Manual in-flight cancellation via `cancelHttpRequest(requestId)` and `window.apiForge.cancelRequest(requestId)`.
* **Security & Header Sanitization**:
  * Rejects CRLF injection (`\r` or `\n`) in header names and values.
  * Validates URL schemes (strictly `http:` and `https:`).
  * Rejects embedded credentials in URLs (`user:pass@host`).
  * Masks sensitive headers (`Authorization`, `Cookie`) from diagnostic logs.

### B. Interactive Request Builder
* **Method Selector**: Color-coded dropdown supporting all 7 methods.
* **URL Editor**: Real-time address bar with inline URL copying and two-way synchronization with the query parameters table.
* **Editable Query Parameters Table**:
  * Add, edit, toggle (send/ignore), and delete query parameters.
  * Preserves existing base URL parameters and properly encodes spaces, ampersands, and Unicode characters without double-encoding.
* **Editable Request Headers Table**:
  * Add, edit, toggle, and delete request headers.
  * Quick preset buttons: `+ JSON` (`Content-Type: application/json`) and `+ Auth` (`Authorization: Bearer <token>`).
* **JSON Request Body Editor**:
  * Monospace textarea with syntax validation.
  * Status badge: `Valid JSON`, `Invalid JSON`, or `Empty`.
  * Action controls: **Format JSON** (indents valid JSON), **Validate JSON**, **Copy Body**, and **Clear**.
  * Shows an explicit warning and disables editing when `GET` or `HEAD` is selected.

### C. Response Viewer & Metrics
* **Status Badges**:
  * Numeric status and status text (e.g. `200 OK`, `201 Created`, `204 No Content`, `404 Not Found`, `500 Internal Server Error`).
  * Visually distinct color categories: 2xx (green), 3xx (cyan), 4xx (amber), 5xx (red), and network error (dark red).
* **Metrics**: Accurate measured request duration (in milliseconds via monotonic `performance.now()`) and response size (in formatted bytes/KB).
* **View Modes**:
  * **Pretty**: Formatted, indented JSON view for JSON responses, or safe decoded text for HTML/plain text.
  * **Raw**: Unformatted exact decoded response string with horizontal scroll support.
* **Response Headers Tab**: Key/value table displaying all received response headers with individual copy controls and "Copy All Headers".
* **Explain Tab**: Contextual guide explaining the HTTP status code and how Spring Boot `@RestController`, validation errors, and `@ExceptionHandler` map to it.
* **Categorized Network Error Display**:
  * Distinguishes HTTP 4xx/5xx responses from network failures.
  * Categorizes errors into `CONNECTION_REFUSED`, `TIMEOUT`, `DNS_ERROR`, `TLS_ERROR`, `CONNECTION_ERROR`, `INVALID_REQUEST`, and `CANCELLED`.
  * Displays friendly troubleshooting hints (e.g. verifying Spring Boot port, loopback firewall).

---

## 3. Features Intentionally Deferred to Later Steps

* Collections and folders management (Step 3).
* Request history storage (Step 3).
* Environment variables and `{{baseUrl}}` token substitution (Step 4).
* JWT token lifecycle and automatic header injection (Step 4).
* Spring Boot OpenAPI import (`/v3/api-docs`) (Step 5).
* Automated response test assertions (Step 6).
* Plain-language Spring exception explanation engine (Step 7).

---

## 4. Folder Structure

```text
API_Forge/
├── package.json                          # Pinned dependencies & scripts
├── package-lock.json                     # Deterministic dependency lock
├── .gitignore                            # Standard Node/Electron gitignore
├── .npmrc                                # Configures Windows script-shell
├── README.md                             # Architectural and usage documentation
├── src/
│   ├── main/
│   │   ├── main.js                       # Electron window lifecycle & navigation lockdown
│   │   ├── http/
│   │   │   └── httpClient.js             # Core HTTP engine, validation, streaming, & cancellation
│   │   ├── ipc/
│   │   │   └── appHandlers.js            # Main IPC handlers (get-info, send-request, cancel, copy)
│   │   └── security/
│   │       └── navigation.js             # Navigation guards, popup denial, permission restriction
│   ├── preload/
│   │   └── preload.js                    # Frozen contextBridge API (window.apiForge)
│   └── renderer/
│       ├── index.html                    # Desktop workspace layout with strict CSP
│       ├── styles/
│       │   └── main.css                  # Dark design system, method badges, tables, & viewer
│       └── scripts/
│           └── renderer.js               # Reactive multi-tab manager, request builder, & viewer
└── tests/
    ├── foundation.test.js                # Foundation & security test suite (16 tests)
    ├── http.test.js                      # HTTP engine & local mock server integration suite (30 tests)
    └── smoke.js                          # End-to-end Electron runtime & UI interaction smoke test
```

---

## 5. Security Boundaries & Architecture

1. **Context Isolation & Sandboxing**: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` are strictly enforced on the BrowserWindow.
2. **Main-Process Network Execution**: The renderer process has no direct network capability (`connect-src 'none'`). All HTTP requests are validated and dispatched by the Electron Main Process.
3. **Restricted Preload Contract**: `window.apiForge` exposes only four explicit methods: `getAppInfo()`, `sendRequest()`, `cancelRequest()`, and `copyToClipboard()`. The bridge object is frozen with `Object.freeze()`.
4. **Header Injection Defense**: Header names are validated against RFC 7230 tokens, and CRLF (`\r`, `\n`) characters in header names or values are rejected.
5. **Safe Response Rendering**: Response bodies are rendered strictly via safe DOM text nodes (`textContent`). No server-supplied HTML or JavaScript is ever evaluated or injected into the DOM.
6. **TLS Verification**: Certificate verification remains strictly enabled by default.

---

## 6. How to Run and Test

From the project root: `C:\Users\thiru\OneDrive\Desktop\API_Forge`

### Install Dependencies
```powershell
npm install
```

### Run Automated Unit & Integration Tests (46 Tests)
```powershell
npm test
```
*Executes all 46 tests across 10 test suites using Node.js built-in test runner, including full mock server integration testing for all 7 HTTP methods, timeouts, 404/500 responses, and cancellation.*

### Run End-to-End Electron Smoke Test
```powershell
npm run test:smoke
```
*Launches Electron in an automated test harness to verify UI rendering, request sending, response viewer DOM updates, and clipboard copy operations.*

### Launch Desktop Application
```powershell
npm start
```
*or:*
```powershell
npm run dev
```

---

## 7. Known Limitations (Step 2 Scope)

* In Step 2, request configurations are session-bound across open tabs; local persistence to disk (collections and history) is scheduled for Step 3.
* Environment variable substitution (e.g. `{{baseUrl}}`) is deferred to Step 4.
