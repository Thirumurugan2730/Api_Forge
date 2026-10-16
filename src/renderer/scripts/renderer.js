/**
 * ApiForge Lite — Spring Edition
 * Renderer Process Controller (Step 2: Real HTTP Engine & Response Viewer)
 */

(function () {
  'use strict';

  // Global State
  const state = {
    tabs: [],
    activeTabId: null,
    tabCounter: 0,
    appInfo: null
  };

  // DOM Elements Cache
  const elements = {
    appVersionLabel: document.getElementById('label-app-version'),
    bridgeStatusPill: document.getElementById('bridge-status-pill'),
    mainStatusIndicator: document.getElementById('main-status-indicator'),
    statusIndicatorText: document.getElementById('status-indicator-text'),
    btnNewRequest: document.getElementById('btn-new-request'),
    btnAddTab: document.getElementById('btn-add-tab'),
    requestTabStrip: document.getElementById('request-tab-strip'),
    selectMethod: document.getElementById('select-method'),
    inputUrl: document.getElementById('input-url'),
    btnCopyUrl: document.getElementById('btn-copy-url'),
    btnSend: document.getElementById('btn-send'),
    btnSendLabel: document.getElementById('btn-send-label'),
    btnCancel: document.getElementById('btn-cancel'),
    subtabButtons: document.querySelectorAll('.subtab-btn'),
    subtabPanels: document.querySelectorAll('.subtab-panel'),
    paramsBadgeCount: document.getElementById('params-badge-count'),
    headersBadgeCount: document.getElementById('headers-badge-count'),
    bodyActiveDot: document.getElementById('body-active-dot'),
    // Params Table
    btnAddParam: document.getElementById('btn-add-param'),
    paramsTbody: document.getElementById('params-tbody'),
    paramsEmptyHint: document.getElementById('params-empty-hint'),
    // Headers Table
    btnAddHeader: document.getElementById('btn-add-header'),
    btnPresetJson: document.getElementById('btn-preset-json'),
    btnPresetAuth: document.getElementById('btn-preset-auth'),
    headersTbody: document.getElementById('headers-tbody'),
    headersEmptyHint: document.getElementById('headers-empty-hint'),
    // Body Editor
    bodyDisabledNotice: document.getElementById('body-disabled-notice'),
    warningMethodLabel: document.getElementById('warning-method-label'),
    bodyEditorWrapper: document.getElementById('body-editor-wrapper'),
    jsonValidationBadge: document.getElementById('json-validation-badge'),
    btnFormatJson: document.getElementById('btn-format-json'),
    btnValidateJson: document.getElementById('btn-validate-json'),
    btnCopyBody: document.getElementById('btn-copy-body'),
    btnClearBody: document.getElementById('btn-clear-body'),
    inputBodyText: document.getElementById('input-body-text'),
    bodyErrorBox: document.getElementById('body-error-box'),
    bodyErrorMsg: document.getElementById('body-error-msg'),
    // Response Section
    respTabButtons: document.querySelectorAll('.resp-tab-btn'),
    respHeadersCountBadge: document.getElementById('resp-headers-count-badge'),
    statStatus: document.getElementById('stat-status'),
    statTime: document.getElementById('stat-time'),
    statSize: document.getElementById('stat-size'),
    responseEmptyState: document.getElementById('response-empty-state'),
    responseLoadingState: document.getElementById('response-loading-state'),
    loadingTargetUrl: document.getElementById('loading-target-url'),
    btnCancelLoading: document.getElementById('btn-cancel-loading'),
    responseNetworkError: document.getElementById('response-network-error'),
    errorTypeBadge: document.getElementById('error-type-badge'),
    errorTitleText: document.getElementById('error-title-text'),
    errorDetailsText: document.getElementById('error-details-text'),
    errorTimestamp: document.getElementById('error-timestamp'),
    btnDismissError: document.getElementById('btn-dismiss-error'),
    responseContentView: document.getElementById('response-content-view'),
    respPanelBody: document.getElementById('resp-panel-body'),
    respPanelHeaders: document.getElementById('resp-panel-headers'),
    respPanelExplain: document.getElementById('resp-panel-explain'),
    btnModePretty: document.getElementById('btn-mode-pretty'),
    btnModeRaw: document.getElementById('btn-mode-raw'),
    truncationWarningTag: document.getElementById('truncation-warning-tag'),
    btnCopyResponse: document.getElementById('btn-copy-response'),
    responseEmptyBodyNotice: document.getElementById('response-empty-body-notice'),
    emptyBodyStatus: document.getElementById('empty-body-status'),
    responseBodyPre: document.getElementById('response-body-pre'),
    responseHeadersTbody: document.getElementById('response-headers-tbody'),
    btnCopyAllHeaders: document.getElementById('btn-copy-all-headers'),
    explainStatusTitle: document.getElementById('explain-status-title'),
    explainStatusDesc: document.getElementById('explain-status-desc'),
    explainUrlVal: document.getElementById('explain-url-val'),
    explainContentType: document.getElementById('explain-content-type'),
    toastContainer: document.getElementById('toast-container'),
    navButtons: document.querySelectorAll('.nav-btn[data-feature]')
  };

  // Helper: Format byte counts cleanly
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ==========================================================================
  // IPC Bridge Initialization
  // ==========================================================================

  async function initializeBridge() {
    try {
      if (!window.apiForge || typeof window.apiForge.getAppInfo !== 'function') {
        throw new Error('window.apiForge bridge is not available');
      }

      const info = await window.apiForge.getAppInfo();
      state.appInfo = info;

      if (elements.appVersionLabel) {
        elements.appVersionLabel.textContent = `v${info.version}`;
      }

      if (elements.bridgeStatusPill) {
        elements.bridgeStatusPill.textContent = 'HTTP Ready';
        elements.bridgeStatusPill.className = 'badge-status connected';
      }

      if (elements.mainStatusIndicator && elements.statusIndicatorText) {
        elements.mainStatusIndicator.className = 'main-status-chip online';
        elements.statusIndicatorText.textContent = `HTTP Engine: Active (v${info.version})`;
      }

      console.info('[ApiForge Lite] Main process bridge connected:', info);
    } catch (err) {
      console.error('[ApiForge Lite] IPC bridge connection error:', err);
      if (elements.bridgeStatusPill) {
        elements.bridgeStatusPill.textContent = 'Bridge Error';
        elements.bridgeStatusPill.className = 'badge-status error';
      }
      showToast('Bridge error: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // Tab Management
  // ==========================================================================

  function createTab(options = {}) {
    state.tabCounter += 1;
    const tabId = 'tab_' + state.tabCounter;
    const isFirst = state.tabs.length === 0;

    const newTab = {
      id: tabId,
      title: options.title || (isFirst ? 'New Request' : `Request ${state.tabCounter}`),
      method: options.method || 'GET',
      url: options.url || '',
      params: options.params || [],
      headers: options.headers || [],
      body: options.body || '',
      activeSubtab: 'params',
      responseState: 'empty', // 'empty' | 'loading' | 'success' | 'error'
      response: null,
      error: null,
      responseSubtab: 'body',
      bodyViewMode: 'pretty',
      activeRequestId: null
    };

    state.tabs.push(newTab);
    renderTabStrip();
    setActiveTab(tabId);
    return newTab;
  }

  function getActiveTab() {
    return state.tabs.find((t) => t.id === state.activeTabId);
  }

  function setActiveTab(tabId) {
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    state.activeTabId = tabId;

    // 1. Sync Address Bar
    if (elements.selectMethod) {
      elements.selectMethod.value = tab.method;
      elements.selectMethod.setAttribute('data-method', tab.method);
    }
    if (elements.inputUrl) {
      elements.inputUrl.value = tab.url;
    }

    // 2. Sync Sub-tabs
    switchRequestSubtab(tab.activeSubtab || 'params');
    renderParamsTable();
    renderHeadersTable();
    renderBodyEditor();

    // 3. Sync Response Panel
    renderResponseWorkspace();

    // 4. Update Tab Strip visuals
    renderTabStrip();
  }

  function closeTab(tabId, event) {
    if (event) event.stopPropagation();

    if (state.tabs.length <= 1) {
      showToast('Cannot close the only open tab', 'info');
      return;
    }

    const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const closingTab = state.tabs[tabIndex];
    if (closingTab.activeRequestId && window.apiForge?.cancelRequest) {
      window.apiForge.cancelRequest(closingTab.activeRequestId).catch(() => {});
    }

    const wasActive = state.activeTabId === tabId;
    state.tabs.splice(tabIndex, 1);

    if (wasActive) {
      const nextIndex = Math.max(0, tabIndex - 1);
      setActiveTab(state.tabs[nextIndex].id);
    } else {
      renderTabStrip();
    }
  }

  function renderTabStrip() {
    if (!elements.requestTabStrip) return;
    elements.requestTabStrip.innerHTML = '';

    state.tabs.forEach((tab) => {
      const tabElement = document.createElement('button');
      tabElement.className = `req-tab ${tab.id === state.activeTabId ? 'active' : ''}`;
      tabElement.setAttribute('role', 'tab');
      tabElement.setAttribute('aria-selected', tab.id === state.activeTabId ? 'true' : 'false');
      tabElement.setAttribute('id', `tab-btn-${tab.id}`);

      const methodTag = document.createElement('span');
      methodTag.className = `tab-method-tag ${tab.method}`;
      methodTag.textContent = tab.method;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title-text';
      titleSpan.textContent = tab.title;

      tabElement.appendChild(methodTag);
      tabElement.appendChild(titleSpan);

      if (state.tabs.length > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.setAttribute('title', 'Close tab');
        closeBtn.setAttribute('aria-label', `Close ${tab.title}`);
        closeBtn.addEventListener('click', (e) => closeTab(tab.id, e));
        tabElement.appendChild(closeBtn);
      }

      tabElement.addEventListener('click', () => setActiveTab(tab.id));
      elements.requestTabStrip.appendChild(tabElement);
    });
  }

  // ==========================================================================
  // URL and Query Parameters Synchronization
  // ==========================================================================

  function parseQueryParamsFromUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') return [];
    try {
      const qIdx = urlString.indexOf('?');
      if (qIdx === -1) return [];

      const queryString = urlString.substring(qIdx + 1);
      const searchParams = new URLSearchParams(queryString);
      const result = [];
      searchParams.forEach((val, key) => {
        result.push({ key, value: val, enabled: true });
      });
      return result;
    } catch {
      return [];
    }
  }

  function rebuildUrlFromParams(tab) {
    if (!tab) return;
    const currentUrl = tab.url;
    const qIdx = currentUrl.indexOf('?');
    const baseUrl = qIdx !== -1 ? currentUrl.substring(0, qIdx) : currentUrl;

    const enabledParams = tab.params.filter((p) => p.enabled && p.key.trim() !== '');
    if (enabledParams.length === 0) {
      tab.url = baseUrl;
    } else {
      const sp = new URLSearchParams();
      enabledParams.forEach((p) => sp.append(p.key, p.value));
      tab.url = `${baseUrl}?${sp.toString()}`;
    }

    if (elements.inputUrl && state.activeTabId === tab.id) {
      elements.inputUrl.value = tab.url;
    }

    updateTabTitle(tab);
  }

  function updateTabTitle(tab) {
    if (!tab) return;
    if (tab.url.trim()) {
      try {
        const parsed = new URL(tab.url.trim());
        tab.title = parsed.pathname !== '/' ? parsed.pathname : parsed.hostname;
      } catch {
        tab.title = tab.url.slice(0, 24);
      }
    } else {
      tab.title = 'New Request';
    }
    renderTabStrip();
  }

  // ==========================================================================
  // Render Query Parameters Table
  // ==========================================================================

  function renderParamsTable() {
    const tab = getActiveTab();
    if (!tab || !elements.paramsTbody) return;

    elements.paramsTbody.innerHTML = '';
    const hasParams = tab.params.length > 0;

    if (elements.paramsEmptyHint) {
      elements.paramsEmptyHint.style.display = hasParams ? 'none' : 'block';
    }

    const enabledCount = tab.params.filter((p) => p.enabled && p.key.trim()).length;
    if (elements.paramsBadgeCount) {
      elements.paramsBadgeCount.textContent = enabledCount;
    }

    tab.params.forEach((param, index) => {
      const tr = document.createElement('tr');

      // Checkbox
      const tdCheck = document.createElement('td');
      tdCheck.className = 'col-check';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'kv-checkbox';
      check.checked = param.enabled;
      check.title = 'Enable / disable parameter';
      check.addEventListener('change', (e) => {
        param.enabled = e.target.checked;
        rebuildUrlFromParams(tab);
        renderParamsTable();
      });
      tdCheck.appendChild(check);

      // Key
      const tdKey = document.createElement('td');
      tdKey.className = 'col-key';
      const inputKey = document.createElement('input');
      inputKey.type = 'text';
      inputKey.className = 'kv-input';
      inputKey.placeholder = 'Parameter Key';
      inputKey.value = param.key;
      inputKey.addEventListener('input', (e) => {
        param.key = e.target.value;
        rebuildUrlFromParams(tab);
      });
      tdKey.appendChild(inputKey);

      // Value
      const tdVal = document.createElement('td');
      tdVal.className = 'col-val';
      const inputVal = document.createElement('input');
      inputVal.type = 'text';
      inputVal.className = 'kv-input';
      inputVal.placeholder = 'Value';
      inputVal.value = param.value;
      inputVal.addEventListener('input', (e) => {
        param.value = e.target.value;
        rebuildUrlFromParams(tab);
      });
      tdVal.appendChild(inputVal);

      // Action (Delete)
      const tdAct = document.createElement('td');
      tdAct.className = 'col-act';
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-kv-delete';
      btnDel.innerHTML = '&times;';
      btnDel.title = 'Delete parameter';
      btnDel.addEventListener('click', () => {
        tab.params.splice(index, 1);
        rebuildUrlFromParams(tab);
        renderParamsTable();
      });
      tdAct.appendChild(btnDel);

      tr.appendChild(tdCheck);
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tr.appendChild(tdAct);
      elements.paramsTbody.appendChild(tr);
    });
  }

  function addParamRow() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.params.push({ key: '', value: '', enabled: true });
    renderParamsTable();
  }

  // ==========================================================================
  // Render Headers Table
  // ==========================================================================

  function renderHeadersTable() {
    const tab = getActiveTab();
    if (!tab || !elements.headersTbody) return;

    elements.headersTbody.innerHTML = '';
    const hasHeaders = tab.headers.length > 0;

    if (elements.headersEmptyHint) {
      elements.headersEmptyHint.style.display = hasHeaders ? 'none' : 'block';
    }

    const enabledCount = tab.headers.filter((h) => h.enabled && h.key.trim()).length;
    if (elements.headersBadgeCount) {
      elements.headersBadgeCount.textContent = enabledCount;
    }

    tab.headers.forEach((header, index) => {
      const tr = document.createElement('tr');

      // Checkbox
      const tdCheck = document.createElement('td');
      tdCheck.className = 'col-check';
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'kv-checkbox';
      check.checked = header.enabled;
      check.title = 'Enable / disable header';
      check.addEventListener('change', (e) => {
        header.enabled = e.target.checked;
        renderHeadersTable();
      });
      tdCheck.appendChild(check);

      // Key
      const tdKey = document.createElement('td');
      tdKey.className = 'col-key';
      const inputKey = document.createElement('input');
      inputKey.type = 'text';
      inputKey.className = 'kv-input';
      inputKey.placeholder = 'Header (e.g. Content-Type)';
      inputKey.value = header.key;
      inputKey.addEventListener('input', (e) => {
        header.key = e.target.value;
      });
      tdKey.appendChild(inputKey);

      // Value
      const tdVal = document.createElement('td');
      tdVal.className = 'col-val';
      const inputVal = document.createElement('input');
      inputVal.type = 'text';
      inputVal.className = 'kv-input';
      inputVal.placeholder = 'Value';
      inputVal.value = header.value;
      inputVal.addEventListener('input', (e) => {
        header.value = e.target.value;
      });
      tdVal.appendChild(inputVal);

      // Action
      const tdAct = document.createElement('td');
      tdAct.className = 'col-act';
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-kv-delete';
      btnDel.innerHTML = '&times;';
      btnDel.title = 'Delete header';
      btnDel.addEventListener('click', () => {
        tab.headers.splice(index, 1);
        renderHeadersTable();
      });
      tdAct.appendChild(btnDel);

      tr.appendChild(tdCheck);
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tr.appendChild(tdAct);
      elements.headersTbody.appendChild(tr);
    });
  }

  function addHeaderRow(key = '', value = '', enabled = true) {
    const tab = getActiveTab();
    if (!tab) return;
    tab.headers.push({ key, value, enabled });
    renderHeadersTable();
  }

  // ==========================================================================
  // Render Body Editor (JSON)
  // ==========================================================================

  function renderBodyEditor() {
    const tab = getActiveTab();
    if (!tab) return;

    const isBodyDisallowed = tab.method === 'GET' || tab.method === 'HEAD';

    if (elements.bodyDisabledNotice) {
      elements.bodyDisabledNotice.hidden = !isBodyDisallowed;
    }
    if (elements.warningMethodLabel) {
      elements.warningMethodLabel.textContent = tab.method;
    }
    if (elements.bodyEditorWrapper) {
      elements.bodyEditorWrapper.style.opacity = isBodyDisallowed ? '0.35' : '1';
      elements.bodyEditorWrapper.style.pointerEvents = isBodyDisallowed ? 'none' : 'auto';
    }

    if (elements.inputBodyText) {
      elements.inputBodyText.value = tab.body || '';
      validateBodyJson(tab.body);
    }

    if (elements.bodyActiveDot) {
      elements.bodyActiveDot.hidden = !tab.body.trim() || isBodyDisallowed;
    }
  }

  function validateBodyJson(rawText) {
    if (!elements.jsonValidationBadge || !elements.bodyErrorBox) return;

    if (!rawText || !rawText.trim()) {
      elements.jsonValidationBadge.textContent = 'Empty';
      elements.jsonValidationBadge.className = 'badge-validation empty';
      elements.bodyErrorBox.hidden = true;
      return { valid: true, empty: true };
    }

    try {
      JSON.parse(rawText.trim());
      elements.jsonValidationBadge.textContent = 'Valid JSON';
      elements.jsonValidationBadge.className = 'badge-validation valid';
      elements.bodyErrorBox.hidden = true;
      return { valid: true, empty: false };
    } catch (err) {
      elements.jsonValidationBadge.textContent = 'Invalid JSON';
      elements.jsonValidationBadge.className = 'badge-validation invalid';
      elements.bodyErrorBox.hidden = false;
      if (elements.bodyErrorMsg) {
        elements.bodyErrorMsg.textContent = err.message;
      }
      return { valid: false, error: err.message };
    }
  }

  function formatBodyJson() {
    const tab = getActiveTab();
    if (!tab || !tab.body.trim()) return;

    try {
      const parsed = JSON.parse(tab.body.trim());
      tab.body = JSON.stringify(parsed, null, 2);
      if (elements.inputBodyText) {
        elements.inputBodyText.value = tab.body;
      }
      validateBodyJson(tab.body);
      showToast('JSON formatted successfully', 'success');
    } catch (err) {
      showToast('Cannot format: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // Render Response Workspace
  // ==========================================================================

  function renderResponseWorkspace() {
    const tab = getActiveTab();
    if (!tab) return;

    resetResponseMeta();

    if (tab.responseState === 'loading') {
      showResponseView('loading');
      if (elements.loadingTargetUrl) {
        elements.loadingTargetUrl.textContent = `${tab.method} ${tab.url || '(empty URL)'}`;
      }
      return;
    }

    if (tab.responseState === 'error') {
      showResponseView('error');
      renderErrorCard(tab.error);
      return;
    }

    if (tab.responseState === 'success' && tab.response) {
      showResponseView('content');
      renderSuccessResponse(tab.response, tab.bodyViewMode, tab.responseSubtab);
      return;
    }

    // Default: Empty
    showResponseView('empty');
  }

  function showResponseView(viewName) {
    if (elements.responseEmptyState) elements.responseEmptyState.hidden = viewName !== 'empty';
    if (elements.responseLoadingState) elements.responseLoadingState.hidden = viewName !== 'loading';
    if (elements.responseNetworkError) elements.responseNetworkError.hidden = viewName !== 'error';
    if (elements.responseContentView) elements.responseContentView.hidden = viewName !== 'content';

    // Toggle Send / Cancel buttons
    if (elements.btnSend) {
      elements.btnSend.disabled = viewName === 'loading';
    }
    if (elements.btnCancel) {
      elements.btnCancel.hidden = viewName !== 'loading';
    }
    if (elements.btnSendLabel) {
      elements.btnSendLabel.textContent = viewName === 'loading' ? 'Sending...' : 'Send';
    }
  }

  function resetResponseMeta() {
    if (elements.statStatus) {
      elements.statStatus.textContent = '—';
      elements.statStatus.className = 'stat-val empty';
    }
    if (elements.statTime) {
      elements.statTime.textContent = '—';
      elements.statTime.className = 'stat-val empty';
    }
    if (elements.statSize) {
      elements.statSize.textContent = '—';
      elements.statSize.className = 'stat-val empty';
    }
    if (elements.respHeadersCountBadge) {
      elements.respHeadersCountBadge.hidden = true;
    }
  }

  function renderSuccessResponse(resp, viewMode = 'pretty', activeTabName = 'body') {
    // 1. Status Pill
    if (elements.statStatus) {
      elements.statStatus.textContent = `${resp.status} ${resp.statusText}`;
      let statusClass = 'status-2xx';
      if (resp.status >= 300 && resp.status < 400) statusClass = 'status-3xx';
      else if (resp.status >= 400 && resp.status < 500) statusClass = 'status-4xx';
      else if (resp.status >= 500) statusClass = 'status-5xx';
      elements.statStatus.className = `stat-val resp-status-pill ${statusClass}`;
    }

    // 2. Time & Size
    if (elements.statTime) {
      elements.statTime.textContent = `${resp.timeMs} ms`;
      elements.statTime.className = 'stat-val';
    }
    if (elements.statSize) {
      elements.statSize.textContent = formatBytes(resp.sizeBytes);
      elements.statSize.className = 'stat-val';
    }

    // 3. Body View
    const bodyContent = resp.body || '';
    const isEmptyBody = !bodyContent.trim() && (resp.status === 204 || resp.status === 304 || resp.effectiveUrl);

    if (elements.responseEmptyBodyNotice) {
      elements.responseEmptyBodyNotice.hidden = !isEmptyBody;
      if (elements.emptyBodyStatus) {
        elements.emptyBodyStatus.textContent = `${resp.status} ${resp.statusText}`;
      }
    }

    if (elements.truncationWarningTag) {
      elements.truncationWarningTag.hidden = !resp.truncated;
    }

    if (elements.responseBodyPre) {
      if (isEmptyBody) {
        elements.responseBodyPre.textContent = '';
      } else if (viewMode === 'pretty') {
        try {
          const parsed = JSON.parse(bodyContent);
          elements.responseBodyPre.textContent = JSON.stringify(parsed, null, 2);
        } catch {
          // If not JSON, show safe decoded text
          elements.responseBodyPre.textContent = bodyContent;
        }
      } else {
        // Raw Mode
        elements.responseBodyPre.textContent = bodyContent;
      }
    }

    // Mode toggles
    if (elements.btnModePretty) elements.btnModePretty.className = `btn-submode ${viewMode === 'pretty' ? 'active' : ''}`;
    if (elements.btnModeRaw) elements.btnModeRaw.className = `btn-submode ${viewMode === 'raw' ? 'active' : ''}`;

    // 4. Response Headers
    renderResponseHeadersTable(resp.headers);

    // 5. Explain Tab
    renderExplainTab(resp);

    // Switch to active response subtab
    switchResponseSubtab(activeTabName);
  }

  function renderResponseHeadersTable(headersObj = {}) {
    if (!elements.responseHeadersTbody) return;
    elements.responseHeadersTbody.innerHTML = '';

    const entries = Object.entries(headersObj);
    if (elements.respHeadersCountBadge) {
      elements.respHeadersCountBadge.hidden = entries.length === 0;
      elements.respHeadersCountBadge.textContent = entries.length;
    }

    entries.forEach(([key, val]) => {
      const tr = document.createElement('tr');

      const tdKey = document.createElement('td');
      tdKey.className = 'col-key';
      tdKey.textContent = key;

      const tdVal = document.createElement('td');
      tdVal.className = 'col-val';
      tdVal.textContent = val;

      const tdAct = document.createElement('td');
      tdAct.className = 'col-act';
      const btnCopy = document.createElement('button');
      btnCopy.className = 'btn-kv-delete';
      btnCopy.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      btnCopy.title = 'Copy value';
      btnCopy.addEventListener('click', () => {
        copyText(val, `Copied ${key}`);
      });
      tdAct.appendChild(btnCopy);

      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tr.appendChild(tdAct);
      elements.responseHeadersTbody.appendChild(tr);
    });
  }

  function renderExplainTab(resp) {
    if (!resp) return;

    if (elements.explainStatusTitle) {
      elements.explainStatusTitle.textContent = `HTTP ${resp.status} ${resp.statusText}`;
    }

    if (elements.explainUrlVal) {
      elements.explainUrlVal.textContent = resp.effectiveUrl || 'N/A';
    }

    if (elements.explainContentType) {
      elements.explainContentType.textContent = resp.contentType || 'none';
    }

    if (elements.explainStatusDesc) {
      let desc = '';
      if (resp.status === 200) desc = 'Standard success code. The Spring Boot controller executed and returned the payload entity.';
      else if (resp.status === 201) desc = 'Resource created. Commonly returned by Spring Boot @PostMapping after persisting a new record.';
      else if (resp.status === 204) desc = 'No Content. Often returned by @DeleteMapping or void methods when an action completes without returning body data.';
      else if (resp.status === 400) desc = 'Bad Request. Commonly triggered by Spring Boot validation failures (@Valid, BindingResult) or unreadable JSON bodies.';
      else if (resp.status === 401) desc = 'Unauthorized. Spring Security denied access. An Authorization header (e.g. Bearer JWT) is typically required.';
      else if (resp.status === 403) desc = 'Forbidden. The user was authenticated, but lacks the necessary role or authority for this endpoint.';
      else if (resp.status === 404) desc = 'Not Found. No Spring RequestMapping matched the URL path, or the queried database record does not exist.';
      else if (resp.status === 405) desc = 'Method Not Allowed. The URL exists in Spring Boot, but does not support this HTTP method.';
      else if (resp.status === 500) desc = 'Internal Server Error. An unhandled exception was thrown inside the Spring Boot service layer.';
      else desc = `Server returned status code ${resp.status}. Consult your Spring Boot server logs for further controller details.`;

      elements.explainStatusDesc.textContent = desc;
    }
  }

  function renderErrorCard(error) {
    if (!error) return;

    if (elements.statStatus) {
      elements.statStatus.textContent = error.type || 'ERROR';
      elements.statStatus.className = 'stat-val resp-status-pill status-error';
    }

    if (elements.errorTypeBadge) {
      elements.errorTypeBadge.textContent = error.type || 'NETWORK_ERROR';
    }

    if (elements.errorTitleText) {
      elements.errorTitleText.textContent = error.message || 'Request Failed';
    }

    if (elements.errorDetailsText) {
      elements.errorDetailsText.textContent = error.details || 'The network request could not be completed.';
    }

    if (elements.errorTimestamp) {
      elements.errorTimestamp.textContent = new Date().toLocaleTimeString();
    }
  }

  function switchResponseSubtab(tabName) {
    const tab = getActiveTab();
    if (tab) tab.responseSubtab = tabName;

    elements.respTabButtons.forEach((btn) => {
      const match = btn.getAttribute('data-resptab') === tabName;
      btn.className = `resp-tab-btn ${match ? 'active' : ''}`;
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    if (elements.respPanelBody) elements.respPanelBody.hidden = tabName !== 'body';
    if (elements.respPanelHeaders) elements.respPanelHeaders.hidden = tabName !== 'headers';
    if (elements.respPanelExplain) elements.respPanelExplain.hidden = tabName !== 'explain';
  }

  function switchRequestSubtab(subtabName) {
    const tab = getActiveTab();
    if (tab) tab.activeSubtab = subtabName;

    elements.subtabButtons.forEach((btn) => {
      const match = btn.getAttribute('data-subtab') === subtabName;
      btn.className = `subtab-btn ${match ? 'active' : ''}`;
      btn.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    elements.subtabPanels.forEach((panel) => {
      if (panel.id === `panel-${subtabName}`) {
        panel.removeAttribute('hidden');
        panel.classList.add('active');
      } else {
        panel.setAttribute('hidden', '');
        panel.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // Send and Cancel HTTP Request Action
  // ==========================================================================

  async function executeSend() {
    const tab = getActiveTab();
    if (!tab) return;

    const trimmedUrl = (elements.inputUrl?.value || tab.url || '').trim();
    if (!trimmedUrl) {
      showToast('Please enter a valid HTTP or HTTPS URL', 'error');
      if (elements.inputUrl) elements.inputUrl.focus();
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      showToast('Only HTTP and HTTPS URLs are supported', 'error');
      return;
    }

    if ((tab.method === 'GET' || tab.method === 'HEAD') && tab.body.trim()) {
      showToast(`Method ${tab.method} cannot send a request body`, 'error');
      return;
    }

    // Set Loading State
    tab.responseState = 'loading';
    tab.response = null;
    tab.error = null;
    tab.activeRequestId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    renderResponseWorkspace();

    const requestPayload = {
      requestId: tab.activeRequestId,
      method: tab.method,
      url: trimmedUrl,
      params: tab.params,
      headers: tab.headers,
      body: (tab.method !== 'GET' && tab.method !== 'HEAD' && tab.body) ? tab.body : null,
      timeoutMs: 15000
    };

    try {
      const result = await window.apiForge.sendRequest(requestPayload);

      if (tab.activeRequestId !== requestPayload.requestId) {
        return; // Request was cancelled or superseded
      }

      tab.activeRequestId = null;

      if (result.success && result.response) {
        tab.responseState = 'success';
        tab.response = result.response;
        tab.error = null;
        renderResponseWorkspace();
        showToast(`${tab.method} completed: HTTP ${result.response.status} (${result.response.timeMs} ms)`, 'success');
      } else {
        tab.responseState = 'error';
        tab.error = result.error || { type: 'UNKNOWN', message: 'Request failed', details: 'No response received' };
        tab.response = null;
        renderResponseWorkspace();
        showToast(`Request failed: ${tab.error.message}`, 'error');
      }
    } catch (ipcErr) {
      if (tab.activeRequestId === requestPayload.requestId) {
        tab.activeRequestId = null;
        tab.responseState = 'error';
        tab.error = { type: 'BRIDGE_ERROR', message: 'IPC bridge error', details: ipcErr.message };
        renderResponseWorkspace();
        showToast('IPC Bridge failure: ' + ipcErr.message, 'error');
      }
    }
  }

  async function executeCancel() {
    const tab = getActiveTab();
    if (!tab || !tab.activeRequestId) return;

    const reqId = tab.activeRequestId;
    tab.activeRequestId = null;
    tab.responseState = 'error';
    tab.error = { type: 'CANCELLED', message: 'Request cancelled by user', details: 'The in-flight HTTP request was terminated.' };

    renderResponseWorkspace();

    try {
      if (window.apiForge?.cancelRequest) {
        await window.apiForge.cancelRequest(reqId);
      }
      showToast('Request cancelled', 'info');
    } catch (err) {
      console.warn('Error during cancellation:', err);
    }
  }

  // ==========================================================================
  // Clipboard Copy Actions
  // ==========================================================================

  async function copyText(text, successMessage = 'Copied to clipboard') {
    if (!text && text !== '') return;
    try {
      if (window.apiForge && typeof window.apiForge.copyToClipboard === 'function') {
        await window.apiForge.copyToClipboard(text);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      showToast(successMessage, 'success');
    } catch (err) {
      showToast('Copy failed: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================

  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 3200);
  }

  // ==========================================================================
  // UI Event Bindings
  // ==========================================================================

  function bindEvents() {
    // 1. New Request Buttons
    if (elements.btnNewRequest) {
      elements.btnNewRequest.addEventListener('click', () => createTab());
    }
    if (elements.btnAddTab) {
      elements.btnAddTab.addEventListener('click', () => createTab());
    }

    // 2. Method Selector
    if (elements.selectMethod) {
      elements.selectMethod.addEventListener('change', (e) => {
        const tab = getActiveTab();
        if (tab) {
          tab.method = e.target.value;
          elements.selectMethod.setAttribute('data-method', tab.method);
          renderTabStrip();
          renderBodyEditor();
        }
      });
    }

    // 3. URL Input
    if (elements.inputUrl) {
      elements.inputUrl.addEventListener('input', (e) => {
        const tab = getActiveTab();
        if (tab) {
          tab.url = e.target.value;
          const parsedParams = parseQueryParamsFromUrl(tab.url);
          if (parsedParams.length > 0) {
            tab.params = parsedParams;
            renderParamsTable();
          }
          updateTabTitle(tab);
        }
      });
    }

    // 4. Copy URL
    if (elements.btnCopyUrl) {
      elements.btnCopyUrl.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab && tab.url) {
          copyText(tab.url, 'Copied URL to clipboard');
        } else {
          showToast('No URL to copy', 'info');
        }
      });
    }

    // 5. Send & Cancel Buttons
    if (elements.btnSend) {
      elements.btnSend.addEventListener('click', executeSend);
    }
    if (elements.btnCancel) {
      elements.btnCancel.addEventListener('click', executeCancel);
    }
    if (elements.btnCancelLoading) {
      elements.btnCancelLoading.addEventListener('click', executeCancel);
    }
    if (elements.btnDismissError) {
      elements.btnDismissError.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          tab.responseState = 'empty';
          tab.error = null;
          renderResponseWorkspace();
        }
      });
    }

    // 6. Sub-tabs switching
    elements.subtabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const subtabName = btn.getAttribute('data-subtab');
        switchRequestSubtab(subtabName);
      });
    });

    // 7. Params & Headers Actions
    if (elements.btnAddParam) {
      elements.btnAddParam.addEventListener('click', addParamRow);
    }
    if (elements.btnAddHeader) {
      elements.btnAddHeader.addEventListener('click', () => addHeaderRow());
    }
    if (elements.btnPresetJson) {
      elements.btnPresetJson.addEventListener('click', () => {
        addHeaderRow('Content-Type', 'application/json', true);
        showToast('Added Content-Type: application/json', 'info');
      });
    }
    if (elements.btnPresetAuth) {
      elements.btnPresetAuth.addEventListener('click', () => {
        addHeaderRow('Authorization', 'Bearer <token>', true);
        showToast('Added Authorization header', 'info');
      });
    }

    // 8. Body Actions
    if (elements.inputBodyText) {
      elements.inputBodyText.addEventListener('input', (e) => {
        const tab = getActiveTab();
        if (tab) {
          tab.body = e.target.value;
          validateBodyJson(tab.body);
          if (elements.bodyActiveDot) {
            elements.bodyActiveDot.hidden = !tab.body.trim();
          }
        }
      });
    }
    if (elements.btnFormatJson) {
      elements.btnFormatJson.addEventListener('click', formatBodyJson);
    }
    if (elements.btnValidateJson) {
      elements.btnValidateJson.addEventListener('click', () => {
        const tab = getActiveTab();
        const res = validateBodyJson(tab ? tab.body : '');
        if (res.empty) showToast('Request body is empty', 'info');
        else if (res.valid) showToast('Valid JSON syntax', 'success');
        else showToast('JSON Error: ' + res.error, 'error');
      });
    }
    if (elements.btnCopyBody) {
      elements.btnCopyBody.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab && tab.body) copyText(tab.body, 'Copied Request Body');
        else showToast('No request body to copy', 'info');
      });
    }
    if (elements.btnClearBody) {
      elements.btnClearBody.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          tab.body = '';
          if (elements.inputBodyText) elements.inputBodyText.value = '';
          validateBodyJson('');
          if (elements.bodyActiveDot) elements.bodyActiveDot.hidden = true;
          showToast('Request body cleared', 'info');
        }
      });
    }

    // 9. Response Tabs
    elements.respTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const resptab = btn.getAttribute('data-resptab');
        switchResponseSubtab(resptab);
      });
    });

    // 10. Pretty / Raw Mode Toggles
    if (elements.btnModePretty) {
      elements.btnModePretty.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          tab.bodyViewMode = 'pretty';
          if (tab.response) renderSuccessResponse(tab.response, 'pretty', tab.responseSubtab);
        }
      });
    }
    if (elements.btnModeRaw) {
      elements.btnModeRaw.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          tab.bodyViewMode = 'raw';
          if (tab.response) renderSuccessResponse(tab.response, 'raw', tab.responseSubtab);
        }
      });
    }

    // 11. Copy Response Body & Headers
    if (elements.btnCopyResponse) {
      elements.btnCopyResponse.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab && tab.response && tab.response.body) {
          copyText(tab.response.body, 'Copied response body');
        } else {
          showToast('No response body to copy', 'info');
        }
      });
    }
    if (elements.btnCopyAllHeaders) {
      elements.btnCopyAllHeaders.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab && tab.response && tab.response.headers) {
          const formatted = Object.entries(tab.response.headers)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n');
          copyText(formatted, 'Copied all response headers');
        }
      });
    }

    // 12. Navigation Buttons (Phase tags)
    elements.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const feat = btn.getAttribute('data-feature') || 'Feature';
        const step = btn.getAttribute('data-step') || 'a future step';
        showToast(`${feat} module is scheduled for implementation in ${step}.`, 'info');
      });
    });

    // 13. Keyboard Shortcuts (Ctrl+N, Ctrl+Enter)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createTab();
        showToast('Created new request tab', 'info');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeSend();
      }
    });
  }

  // ==========================================================================
  // App Bootstrap
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    initializeBridge();
    createTab({ title: 'New Request', method: 'GET', url: '' });
    bindEvents();
  });
})();
