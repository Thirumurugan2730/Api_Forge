/**
 * ApiForge Lite â€” Spring Edition
 * Renderer Process Controller (Step 3: Collections, Folders, and Request Management)
 */

(function () {
  'use strict';

  // Global State
  const state = {
    tabs: [],
    activeTabId: null,
    tabCounter: 0,
    appInfo: null,
    collectionsTree: [],
    expandedNodes: new Set(),
    activeModal: null,
    pendingModalAction: null,
    history: [],
    settings: { requestTimeoutMs: 15000, historyLimit: 100, theme: 'dark' },
    historyPanelOpen: false
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
    navButtons: document.querySelectorAll('.nav-btn[data-feature]'),

    // Step 3: Collections Sidebar & Save Controls
    btnCreateCollection: document.getElementById('btn-create-collection'),
    collectionsTreeView: document.getElementById('collections-tree-view'),
    crumbActiveCollection: document.getElementById('crumb-active-collection'),
    btnSaveRequest: document.getElementById('btn-save-request'),
    saveIndicatorDot: document.getElementById('save-indicator-dot'),
    btnSaveAsRequest: document.getElementById('btn-save-as-request'),

    // Step 3: Modals
    modalBackdrop: document.getElementById('modal-backdrop'),

    // Save Modal
    modalSaveRequest: document.getElementById('modal-save-request'),
    modalSaveTitle: document.getElementById('modal-save-title'),
    btnCloseSaveModal: document.getElementById('btn-close-save-modal'),
    saveRequestName: document.getElementById('save-request-name'),
    saveTargetCollection: document.getElementById('save-target-collection'),
    saveTargetFolder: document.getElementById('save-target-folder'),
    btnCancelSaveModal: document.getElementById('btn-cancel-save-modal'),
    btnConfirmSaveModal: document.getElementById('btn-confirm-save-modal'),

    // Collection Modal
    modalCollection: document.getElementById('modal-collection'),
    modalColTitle: document.getElementById('modal-col-title'),
    btnCloseColModal: document.getElementById('btn-close-col-modal'),
    collectionNameInput: document.getElementById('collection-name-input'),
    btnCancelColModal: document.getElementById('btn-cancel-col-modal'),
    btnConfirmColModal: document.getElementById('btn-confirm-col-modal'),

    // Folder Modal
    modalFolder: document.getElementById('modal-folder'),
    modalFldTitle: document.getElementById('modal-fld-title'),
    btnCloseFldModal: document.getElementById('btn-close-fld-modal'),
    folderNameInput: document.getElementById('folder-name-input'),
    btnCancelFldModal: document.getElementById('btn-cancel-fld-modal'),
    btnConfirmFldModal: document.getElementById('btn-confirm-fld-modal'),

    // Rename Request Modal
    modalRenameRequest: document.getElementById('modal-rename-request'),
    modalRenameReqTitle: document.getElementById('modal-rename-req-title'),
    btnCloseRenameReqModal: document.getElementById('btn-close-rename-req-modal'),
    renameRequestInput: document.getElementById('rename-request-input'),
    btnCancelRenameReqModal: document.getElementById('btn-cancel-rename-req-modal'),
    btnConfirmRenameReqModal: document.getElementById('btn-confirm-rename-req-modal'),

    // Delete Confirm Modal
    modalDelete: document.getElementById('modal-delete'),
    modalDelTitle: document.getElementById('modal-del-title'),
    btnCloseDelModal: document.getElementById('btn-close-del-modal'),
    deleteConfirmMessage: document.getElementById('delete-confirm-message'),
    btnCancelDelModal: document.getElementById('btn-cancel-del-modal'),
    btnConfirmDelModal: document.getElementById('btn-confirm-del-modal'),

    // Step 4: History & Settings
    navHistory: document.getElementById('nav-history'),
    navSettings: document.getElementById('nav-settings'),
    historyPanel: document.getElementById('history-panel'),
    historyList: document.getElementById('history-list'),
    historyCountBadge: document.getElementById('history-count-badge'),
    btnClearHistory: document.getElementById('btn-clear-history'),

    // Settings Modal
    modalSettings: document.getElementById('modal-settings'),
    btnCloseSettingsModal: document.getElementById('btn-close-settings-modal'),
    btnCancelSettingsModal: document.getElementById('btn-cancel-settings-modal'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnResetSettings: document.getElementById('btn-reset-settings'),
    settingsTheme: document.getElementById('settings-theme'),
    btnThemeDark: document.getElementById('btn-theme-dark'),
    btnThemeLight: document.getElementById('btn-theme-light'),
    settingsTimeout: document.getElementById('settings-timeout'),
    settingsTimeoutDisplay: document.getElementById('settings-timeout-display'),
    settingsTimeoutError: document.getElementById('settings-timeout-error'),
    settingsHistoryLimit: document.getElementById('settings-history-limit'),
    settingsHistoryLimitError: document.getElementById('settings-history-limit-error'),

    // Clear History Confirm Modal
    modalClearHistory: document.getElementById('modal-clear-history'),
    btnCloseClrHistModal: document.getElementById('btn-close-clear-hist-modal'),
    btnCancelClrHistModal: document.getElementById('btn-cancel-clear-hist-modal'),
    btnConfirmClrHistModal: document.getElementById('btn-confirm-clear-hist-modal')
  };

  // Helper: Escape HTML to prevent XSS in dynamic templates
  function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
  // Snapshot & Unsaved Indicator Helpers
  // ==========================================================================

  function getRequestSnapshot(tab) {
    if (!tab) return '';
    return JSON.stringify({
      method: tab.method,
      url: tab.url,
      params: (tab.params || []).map((p) => ({ key: p.key, value: p.value, enabled: p.enabled })),
      headers: (tab.headers || []).map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
      body: tab.body || ''
    });
  }

  function isTabDirty(tab) {
    if (!tab) return false;
    const current = getRequestSnapshot(tab);
    if (tab.savedSnapshot !== undefined && tab.savedSnapshot !== null) {
      return current !== tab.savedSnapshot;
    }
    // If not yet saved to a collection, dirty if non-empty
    return !!(
      tab.url ||
      tab.body ||
      (tab.params && tab.params.some((p) => p.key || p.value)) ||
      (tab.headers && tab.headers.some((h) => h.key || h.value)) ||
      tab.method !== 'GET'
    );
  }

  function updateUnsavedIndicator() {
    const tab = getActiveTab();
    if (!tab) return;
    const dirty = isTabDirty(tab);

    if (elements.saveIndicatorDot) {
      elements.saveIndicatorDot.hidden = !dirty;
    }

    renderTabStrip();
    updateBreadcrumb();
  }

  function updateBreadcrumb() {
    if (!elements.crumbActiveCollection) return;
    const tab = getActiveTab();
    if (!tab) {
      elements.crumbActiveCollection.textContent = 'ApiForge Lite';
      return;
    }

    if (tab.savedMeta && tab.savedMeta.collectionId) {
      const col = state.collectionsTree.find((c) => c.id === tab.savedMeta.collectionId);
      const colName = col ? col.name : 'Collection';
      elements.crumbActiveCollection.textContent = `${colName} / ${tab.savedMeta.savedName || tab.title}`;
    } else {
      elements.crumbActiveCollection.textContent = tab.url ? 'Unsaved Request' : 'New Request';
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
      isCustomTitle: !!options.isCustomTitle,
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
      activeRequestId: null,
      savedMeta: options.savedMeta || null,
      savedSnapshot: options.savedSnapshot !== undefined ? options.savedSnapshot : null
    };

    if (options.savedMeta && newTab.savedSnapshot === null) {
      newTab.savedSnapshot = getRequestSnapshot(newTab);
    }

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

    // 4. Update Tab Strip & Unsaved Indicator visuals
    renderTabStrip();
    updateUnsavedIndicator();
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

      // Unsaved dot in tab
      if (isTabDirty(tab)) {
        const dot = document.createElement('span');
        dot.className = 'save-indicator-dot';
        dot.setAttribute('title', 'Unsaved changes');
        tabElement.appendChild(dot);
      }

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
    updateUnsavedIndicator();
  }

  function updateTabTitle(tab) {
    if (!tab) return;
    if (tab.isCustomTitle && tab.title) {
      renderTabStrip();
      return;
    }

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
    updateUnsavedIndicator();
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
        updateUnsavedIndicator();
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
        updateUnsavedIndicator();
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
        updateUnsavedIndicator();
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
        updateUnsavedIndicator();
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
    updateUnsavedIndicator();
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
    if (!elements.jsonValidationBadge || !elements.bodyErrorBox) return true;

    if (!rawText || !rawText.trim()) {
      elements.jsonValidationBadge.textContent = 'JSON';
      elements.jsonValidationBadge.className = 'badge-json';
      elements.bodyErrorBox.hidden = true;
      return true;
    }

    try {
      JSON.parse(rawText);
      elements.jsonValidationBadge.textContent = 'VALID JSON';
      elements.jsonValidationBadge.className = 'badge-json valid';
      elements.bodyErrorBox.hidden = true;
      return true;
    } catch (err) {
      elements.jsonValidationBadge.textContent = 'INVALID JSON';
      elements.jsonValidationBadge.className = 'badge-json invalid';
      elements.bodyErrorBox.hidden = false;
      if (elements.bodyErrorMsg) {
        elements.bodyErrorMsg.textContent = err.message;
      }
      return false;
    }
  }

  function formatBodyJson() {
    const tab = getActiveTab();
    if (!tab || !tab.body.trim()) return;

    try {
      const parsed = JSON.parse(tab.body);
      tab.body = JSON.stringify(parsed, null, 2);
      if (elements.inputBodyText) {
        elements.inputBodyText.value = tab.body;
      }
      validateBodyJson(tab.body);
      showToast('Formatted JSON body', 'success');
      updateUnsavedIndicator();
    } catch (err) {
      showToast('Cannot format invalid JSON: ' + err.message, 'error');
    }
  }

  function clearBodyJson() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.body = '';
    if (elements.inputBodyText) {
      elements.inputBodyText.value = '';
    }
    validateBodyJson('');
    if (elements.bodyActiveDot) {
      elements.bodyActiveDot.hidden = true;
    }
    updateUnsavedIndicator();
  }

  // ==========================================================================
  // Switch Request Subtabs (Params, Headers, Body)
  // ==========================================================================

  function switchRequestSubtab(subtabName) {
    const tab = getActiveTab();
    if (tab) {
      tab.activeSubtab = subtabName;
    }

    elements.subtabButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-subtab') === subtabName;
      btn.className = `subtab-btn ${isTarget ? 'active' : ''}`;
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    elements.subtabPanels.forEach((panel) => {
      const isTarget = panel.getAttribute('data-panel') === subtabName;
      panel.hidden = !isTarget;
    });
  }

  // ==========================================================================
  // Switch Response Subtabs (Body, Headers, Explain)
  // ==========================================================================

  function switchResponseSubtab(subtabName) {
    const tab = getActiveTab();
    if (tab) {
      tab.responseSubtab = subtabName;
    }

    elements.respTabButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-resp-tab') === subtabName;
      btn.className = `resp-tab-btn ${isTarget ? 'active' : ''}`;
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    if (elements.respPanelBody) elements.respPanelBody.hidden = subtabName !== 'body';
    if (elements.respPanelHeaders) elements.respPanelHeaders.hidden = subtabName !== 'headers';
    if (elements.respPanelExplain) elements.respPanelExplain.hidden = subtabName !== 'explain';
  }

  // ==========================================================================
  // Response Panel Rendering
  // ==========================================================================

  function renderResponseWorkspace() {
    const tab = getActiveTab();
    if (!tab) return;

    // Reset visibility of major states
    if (elements.responseEmptyState) elements.responseEmptyState.hidden = true;
    if (elements.responseLoadingState) elements.responseLoadingState.hidden = true;
    if (elements.responseNetworkError) elements.responseNetworkError.hidden = true;
    if (elements.responseContentView) elements.responseContentView.hidden = true;

    // Reset status pills
    if (elements.statStatus) {
      elements.statStatus.className = 'stat-value status-badge badge-empty';
      elements.statStatus.textContent = '---';
    }
    if (elements.statTime) elements.statTime.textContent = '---';
    if (elements.statSize) elements.statSize.textContent = '---';

    // Toggle Send/Cancel buttons
    const isLoading = tab.responseState === 'loading';
    if (elements.btnSend) elements.btnSend.hidden = isLoading;
    if (elements.btnCancel) elements.btnCancel.hidden = !isLoading;

    if (tab.responseState === 'empty') {
      if (elements.responseEmptyState) elements.responseEmptyState.hidden = false;
      return;
    }

    if (tab.responseState === 'loading') {
      if (elements.responseLoadingState) {
        elements.responseLoadingState.hidden = false;
        if (elements.loadingTargetUrl) {
          elements.loadingTargetUrl.textContent = `${tab.method} ${tab.url || '(empty URL)'}`;
        }
      }
      return;
    }

    if (tab.responseState === 'error') {
      if (elements.responseNetworkError) {
        elements.responseNetworkError.hidden = false;
        const err = tab.error || { type: 'ERROR', message: 'Request failed', details: 'Unknown error' };
        if (elements.errorTypeBadge) elements.errorTypeBadge.textContent = err.type;
        if (elements.errorTitleText) elements.errorTitleText.textContent = err.message;
        if (elements.errorDetailsText) elements.errorDetailsText.textContent = err.details || '';
        if (elements.errorTimestamp) elements.errorTimestamp.textContent = new Date().toLocaleTimeString();
      }
      return;
    }

    if (tab.responseState === 'success' && tab.response) {
      if (elements.responseContentView) elements.responseContentView.hidden = false;

      const resp = tab.response;

      // Status Badge
      if (elements.statStatus) {
        const s = resp.status;
        let badgeClass = 'badge-2xx';
        if (s >= 300 && s < 400) badgeClass = 'badge-3xx';
        else if (s >= 400 && s < 500) badgeClass = 'badge-4xx';
        else if (s >= 500) badgeClass = 'badge-5xx';

        elements.statStatus.className = `stat-value status-badge ${badgeClass}`;
        elements.statStatus.textContent = `${resp.status} ${resp.statusText || ''}`;
      }

      // Timing & Size
      if (elements.statTime) elements.statTime.textContent = `${resp.timeMs} ms`;
      if (elements.statSize) elements.statSize.textContent = formatBytes(resp.sizeBytes || 0);

      // Truncation Tag
      if (elements.truncationWarningTag) {
        elements.truncationWarningTag.hidden = !resp.isTruncated;
      }

      // Headers count
      const headerKeys = resp.headers ? Object.keys(resp.headers) : [];
      if (elements.respHeadersCountBadge) {
        elements.respHeadersCountBadge.textContent = headerKeys.length;
      }

      // Render Body
      renderResponseBody(resp, tab.bodyViewMode || 'pretty');

      // Render Headers Table
      renderResponseHeaders(resp.headers || {});

      // Render Explain Tab
      renderResponseExplain(resp);

      // Ensure active subtab is visible
      switchResponseSubtab(tab.responseSubtab || 'body');
    }
  }

  function renderResponseBody(resp, mode) {
    if (!elements.responseBodyPre) return;

    const isEmpty = resp.body === '' || resp.body === null || resp.body === undefined;
    if (elements.responseEmptyBodyNotice) {
      elements.responseEmptyBodyNotice.hidden = !isEmpty;
      if (elements.emptyBodyStatus) {
        elements.emptyBodyStatus.textContent = `${resp.status} ${resp.statusText || ''}`;
      }
    }

    if (isEmpty) {
      elements.responseBodyPre.textContent = '';
      return;
    }

    let displayContent = resp.body;
    if (mode === 'pretty' && (resp.contentType || '').includes('json')) {
      try {
        const parsed = JSON.parse(resp.body);
        displayContent = JSON.stringify(parsed, null, 2);
      } catch {
        displayContent = resp.body;
      }
    }

    elements.responseBodyPre.textContent = displayContent;
  }

  function renderResponseHeaders(headers) {
    if (!elements.responseHeadersTbody) return;
    elements.responseHeadersTbody.innerHTML = '';

    const entries = Object.entries(headers);
    if (entries.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="2" style="color: var(--text-muted); text-align: center; padding: 16px;">No headers returned</td>';
      elements.responseHeadersTbody.appendChild(tr);
      return;
    }

    entries.forEach(([key, value]) => {
      const tr = document.createElement('tr');
      const tdK = document.createElement('td');
      tdK.className = 'header-name';
      tdK.textContent = key;
      const tdV = document.createElement('td');
      tdV.className = 'header-val';
      tdV.textContent = value;
      tr.appendChild(tdK);
      tr.appendChild(tdV);
      elements.responseHeadersTbody.appendChild(tr);
    });
  }

  function renderResponseExplain(resp) {
    if (elements.explainStatusTitle) {
      elements.explainStatusTitle.textContent = `${resp.status} ${resp.statusText || ''}`;
    }
    if (elements.explainStatusDesc) {
      let desc = 'Standard HTTP response.';
      if (resp.status >= 200 && resp.status < 300) desc = 'The request succeeded and the server processed the response normally.';
      else if (resp.status >= 300 && resp.status < 400) desc = 'Redirection action required to complete the request.';
      else if (resp.status === 400) desc = 'Bad Request: The server could not understand the request due to invalid syntax.';
      else if (resp.status === 401) desc = 'Unauthorized: Authentication is required and has failed or not been provided.';
      else if (resp.status === 403) desc = 'Forbidden: The client does not have access rights to the content.';
      else if (resp.status === 404) desc = 'Not Found: The server cannot find the requested resource.';
      else if (resp.status >= 500) desc = 'Server Error: The server encountered an unexpected condition.';
      elements.explainStatusDesc.textContent = desc;
    }
    if (elements.explainUrlVal) {
      elements.explainUrlVal.textContent = resp.url || '---';
    }
    if (elements.explainContentType) {
      elements.explainContentType.textContent = resp.contentType || 'Not specified';
    }
  }

  // ==========================================================================
  // HTTP Request Execution Engine
  // ==========================================================================

  async function executeSend() {
    const tab = getActiveTab();
    if (!tab) return;

    const trimmedUrl = (tab.url || '').trim();
    if (!trimmedUrl) {
      showToast('Please enter a request URL', 'error');
      if (elements.inputUrl) elements.inputUrl.focus();
      return;
    }

    if ((tab.method === 'GET' || tab.method === 'HEAD') && tab.body && tab.body.trim()) {
      showToast(`Method ${tab.method} cannot send a request body`, 'error');
      return;
    }

    if (tab.method !== 'GET' && tab.method !== 'HEAD' && tab.body && tab.body.trim()) {
      if (!validateBodyJson(tab.body)) {
        showToast('Invalid JSON body: please fix before sending', 'error');
        switchRequestSubtab('body');
        return;
      }
    }

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
      body: tab.method === 'GET' || tab.method === 'HEAD' ? null : tab.body || null,
      timeoutMs: state.settings.requestTimeoutMs || 15000
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
        // Record history entry (success)
        recordHistory({
          method: tab.method,
          url: trimmedUrl,
          params: tab.params,
          headers: tab.headers,
          status: result.response.status,
          durationMs: result.response.timeMs,
          bodyPreview: typeof result.response.body === 'string' ? result.response.body : '',
          isNetworkError: false
        });
      } else {
        tab.responseState = 'error';
        tab.error = result.error || { type: 'UNKNOWN', message: 'Request failed', details: 'No response received' };
        tab.response = null;
        renderResponseWorkspace();
        showToast(`Request failed: ${tab.error.message}`, 'error');
        // Record history entry (network error)
        recordHistory({
          method: tab.method,
          url: trimmedUrl,
          params: tab.params,
          headers: tab.headers,
          status: null,
          durationMs: 0,
          bodyPreview: '',
          isNetworkError: true,
          errorMessage: tab.error.message || 'Request failed'
        });
      }
    } catch (ipcErr) {
      if (tab.activeRequestId === requestPayload.requestId) {
        tab.activeRequestId = null;
        tab.responseState = 'error';
        tab.error = { type: 'BRIDGE_ERROR', message: 'IPC bridge error', details: ipcErr.message };
        renderResponseWorkspace();
        showToast('IPC Bridge failure: ' + ipcErr.message, 'error');
        recordHistory({
          method: tab.method,
          url: trimmedUrl,
          params: tab.params,
          headers: tab.headers,
          status: null,
          durationMs: 0,
          bodyPreview: '',
          isNetworkError: true,
          errorMessage: ipcErr.message || 'IPC Bridge failure'
        });
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
  // Step 3: Collections & Folders Management
  // ==========================================================================

  async function loadCollectionsTree() {
    try {
      if (!window.apiForge || typeof window.apiForge.getCollectionsTree !== 'function') {
        return;
      }
      state.collectionsTree = await window.apiForge.getCollectionsTree();
      renderCollectionsTree();
      updateBreadcrumb();
    } catch (err) {
      console.error('[ApiForge Lite] Error loading collections tree:', err);
      showToast('Failed to load collections: ' + err.message, 'error');
    }
  }

  function renderCollectionsTree() {
    if (!elements.collectionsTreeView) return;
    elements.collectionsTreeView.innerHTML = '';

    if (!state.collectionsTree || state.collectionsTree.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'collections-empty';
      emptyBox.innerHTML = `
        <p>No collections created yet</p>
        <button class="btn btn-secondary btn-sm" id="btn-empty-create-col">+ New Collection</button>
      `;
      elements.collectionsTreeView.appendChild(emptyBox);

      const emptyBtn = document.getElementById('btn-empty-create-col');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => openCreateCollectionModal());
      }
      return;
    }

    state.collectionsTree.forEach((col) => {
      renderCollectionNode(col);
    });
  }

  function renderCollectionNode(col) {
    const isExpanded = state.expandedNodes.has(col.id);
    const hasChildren = (col.folders && col.folders.length > 0) || (col.requests && col.requests.length > 0);

    const colNode = document.createElement('div');
    colNode.className = 'tree-node tree-collection-node';
    colNode.setAttribute('data-id', col.id);

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.style.setProperty('--indent-level', '0');

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = `tree-chevron ${isExpanded ? 'expanded' : ''} ${!hasChildren ? 'hidden' : ''}`;
    chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNodeExpanded(col.id);
    });
    row.appendChild(chevron);

    // Icon
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    row.appendChild(icon);

    // Title
    const title = document.createElement('span');
    title.className = 'tree-title';
    title.textContent = col.name;
    title.title = col.name;
    row.appendChild(title);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'tree-actions';

    // 1. Add Folder
    const btnAddFolder = document.createElement('button');
    btnAddFolder.className = 'tree-action-btn';
    btnAddFolder.title = 'Add folder';
    btnAddFolder.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;
    btnAddFolder.addEventListener('click', (e) => {
      e.stopPropagation();
      openCreateFolderModal(col.id, null);
    });
    actions.appendChild(btnAddFolder);

    // 2. Add Request
    const btnAddReq = document.createElement('button');
    btnAddReq.className = 'tree-action-btn';
    btnAddReq.title = 'Add request to collection';
    btnAddReq.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    btnAddReq.addEventListener('click', (e) => {
      e.stopPropagation();
      openSaveModalForNew(col.id, null);
    });
    actions.appendChild(btnAddReq);

    // 3. Rename
    const btnRename = document.createElement('button');
    btnRename.className = 'tree-action-btn';
    btnRename.title = 'Rename collection';
    btnRename.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    btnRename.addEventListener('click', (e) => {
      e.stopPropagation();
      openRenameCollectionModal(col.id, col.name);
    });
    actions.appendChild(btnRename);

    // 4. Duplicate
    const btnDuplicate = document.createElement('button');
    btnDuplicate.className = 'tree-action-btn';
    btnDuplicate.title = 'Duplicate collection';
    btnDuplicate.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    btnDuplicate.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.apiForge.duplicateCollection(col.id);
        showToast(`Duplicated collection "${col.name}"`, 'success');
        await loadCollectionsTree();
      } catch (err) {
        showToast('Duplicate error: ' + err.message, 'error');
      }
    });
    actions.appendChild(btnDuplicate);

    // 5. Delete
    const btnDelete = document.createElement('button');
    btnDelete.className = 'tree-action-btn btn-danger';
    btnDelete.title = 'Delete collection';
    btnDelete.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirmModal({
        title: 'Delete Collection',
        message: `Are you sure you want to delete collection "${col.name}" and all its contents?`,
        onConfirm: async () => {
          await window.apiForge.deleteCollection(col.id);
          showToast(`Deleted collection "${col.name}"`, 'info');
          await loadCollectionsTree();
        }
      });
    });
    actions.appendChild(btnDelete);

    row.appendChild(actions);

    row.addEventListener('click', () => {
      toggleNodeExpanded(col.id);
    });

    colNode.appendChild(row);

    // If expanded, render children
    if (isExpanded) {
      // 1. Root requests
      if (col.requests && col.requests.length > 0) {
        col.requests.forEach((req) => {
          renderRequestNode(col.id, null, req, 1, colNode);
        });
      }

      // 2. Folders
      if (col.folders && col.folders.length > 0) {
        col.folders.forEach((fld) => {
          renderFolderNode(col.id, fld, 1, colNode);
        });
      }
    }

    elements.collectionsTreeView.appendChild(colNode);
  }

  function renderFolderNode(collectionId, folder, level, parentContainer) {
    const isExpanded = state.expandedNodes.has(folder.id);
    const hasChildren = (folder.children && folder.children.length > 0) || (folder.requests && folder.requests.length > 0);

    const folderNode = document.createElement('div');
    folderNode.className = 'tree-node tree-folder-node';
    folderNode.setAttribute('data-id', folder.id);

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.style.setProperty('--indent-level', String(level));

    // Chevron
    const chevron = document.createElement('span');
    chevron.className = `tree-chevron ${isExpanded ? 'expanded' : ''} ${!hasChildren ? 'hidden' : ''}`;
    chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNodeExpanded(folder.id);
    });
    row.appendChild(chevron);

    // Icon
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    row.appendChild(icon);

    // Title
    const title = document.createElement('span');
    title.className = 'tree-title';
    title.textContent = folder.name;
    title.title = folder.name;
    row.appendChild(title);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';

    // 1. Add Subfolder
    const btnAddSubfolder = document.createElement('button');
    btnAddSubfolder.className = 'tree-action-btn';
    btnAddSubfolder.title = 'Add subfolder';
    btnAddSubfolder.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;
    btnAddSubfolder.addEventListener('click', (e) => {
      e.stopPropagation();
      openCreateFolderModal(collectionId, folder.id);
    });
    actions.appendChild(btnAddSubfolder);

    // 2. Add Request
    const btnAddReq = document.createElement('button');
    btnAddReq.className = 'tree-action-btn';
    btnAddReq.title = 'Add request to folder';
    btnAddReq.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    btnAddReq.addEventListener('click', (e) => {
      e.stopPropagation();
      openSaveModalForNew(collectionId, folder.id);
    });
    actions.appendChild(btnAddReq);

    // 3. Rename
    const btnRename = document.createElement('button');
    btnRename.className = 'tree-action-btn';
    btnRename.title = 'Rename folder';
    btnRename.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    btnRename.addEventListener('click', (e) => {
      e.stopPropagation();
      openRenameFolderModal(collectionId, folder.id, folder.name);
    });
    actions.appendChild(btnRename);

    // 4. Duplicate
    const btnDuplicate = document.createElement('button');
    btnDuplicate.className = 'tree-action-btn';
    btnDuplicate.title = 'Duplicate folder';
    btnDuplicate.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    btnDuplicate.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.apiForge.duplicateFolder(collectionId, folder.id);
        showToast(`Duplicated folder "${folder.name}"`, 'success');
        await loadCollectionsTree();
      } catch (err) {
        showToast('Duplicate error: ' + err.message, 'error');
      }
    });
    actions.appendChild(btnDuplicate);

    // 5. Delete
    const btnDelete = document.createElement('button');
    btnDelete.className = 'tree-action-btn btn-danger';
    btnDelete.title = 'Delete folder';
    btnDelete.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirmModal({
        title: 'Delete Folder',
        message: `Are you sure you want to delete folder "${folder.name}" and all its contents?`,
        onConfirm: async () => {
          await window.apiForge.deleteFolder(collectionId, folder.id);
          showToast(`Deleted folder "${folder.name}"`, 'info');
          await loadCollectionsTree();
        }
      });
    });
    actions.appendChild(btnDelete);

    row.appendChild(actions);

    row.addEventListener('click', () => {
      toggleNodeExpanded(folder.id);
    });

    folderNode.appendChild(row);

    // If expanded, render folder requests and subfolders
    if (isExpanded) {
      if (folder.requests && folder.requests.length > 0) {
        folder.requests.forEach((req) => {
          renderRequestNode(collectionId, folder.id, req, level + 1, folderNode);
        });
      }
      if (folder.children && folder.children.length > 0) {
        folder.children.forEach((child) => {
          renderFolderNode(collectionId, child, level + 1, folderNode);
        });
      }
    }

    parentContainer.appendChild(folderNode);
  }

  function renderRequestNode(collectionId, folderId, req, level, parentContainer) {
    const reqNode = document.createElement('div');
    reqNode.className = 'tree-node tree-request-node';
    reqNode.setAttribute('data-id', req.id);

    const activeTab = getActiveTab();
    const isCurrentActive = activeTab && activeTab.savedMeta && activeTab.savedMeta.requestId === req.id;

    const row = document.createElement('div');
    row.className = `tree-row ${isCurrentActive ? 'active' : ''}`;
    row.style.setProperty('--indent-level', String(level));

    // Spacer matching chevron width
    const spacer = document.createElement('span');
    spacer.className = 'tree-chevron hidden';
    row.appendChild(spacer);

    // Method badge
    const badge = document.createElement('span');
    const methodLower = (req.method || 'GET').toLowerCase();
    badge.className = `tree-method-badge tree-method-${methodLower}`;
    badge.textContent = req.method || 'GET';
    row.appendChild(badge);

    // Title
    const title = document.createElement('span');
    title.className = 'tree-title';
    title.textContent = req.name || 'Untitled Request';
    title.title = req.name || 'Untitled Request';
    row.appendChild(title);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';

    // 1. Rename
    const btnRename = document.createElement('button');
    btnRename.className = 'tree-action-btn';
    btnRename.title = 'Rename request';
    btnRename.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    btnRename.addEventListener('click', (e) => {
      e.stopPropagation();
      openRenameRequestModal(collectionId, req.id, req.name);
    });
    actions.appendChild(btnRename);

    // 2. Duplicate
    const btnDuplicate = document.createElement('button');
    btnDuplicate.className = 'tree-action-btn';
    btnDuplicate.title = 'Duplicate request';
    btnDuplicate.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    btnDuplicate.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await window.apiForge.duplicateRequest(collectionId, req.id);
        showToast(`Duplicated request "${req.name}"`, 'success');
        await loadCollectionsTree();
      } catch (err) {
        showToast('Duplicate error: ' + err.message, 'error');
      }
    });
    actions.appendChild(btnDuplicate);

    // 3. Delete
    const btnDelete = document.createElement('button');
    btnDelete.className = 'tree-action-btn btn-danger';
    btnDelete.title = 'Delete request';
    btnDelete.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeleteConfirmModal({
        title: 'Delete Request',
        message: `Are you sure you want to delete request "${req.name}"?`,
        onConfirm: async () => {
          await window.apiForge.deleteRequest(collectionId, req.id);
          showToast(`Deleted request "${req.name}"`, 'info');
          await loadCollectionsTree();
        }
      });
    });
    actions.appendChild(btnDelete);

    row.appendChild(actions);

    row.addEventListener('click', () => {
      openSavedRequest(collectionId, req.id);
    });

    reqNode.appendChild(row);
    parentContainer.appendChild(reqNode);
  }

  function toggleNodeExpanded(nodeId) {
    if (state.expandedNodes.has(nodeId)) {
      state.expandedNodes.delete(nodeId);
    } else {
      state.expandedNodes.add(nodeId);
    }
    renderCollectionsTree();
  }

  // ==========================================================================
  // Reopen Saved Request in Editor
  // ==========================================================================

  async function openSavedRequest(collectionId, requestId) {
    try {
      const reqData = await window.apiForge.getRequest(collectionId, requestId);
      if (!reqData) {
        showToast('Saved request not found', 'error');
        return;
      }

      // Check if an existing open tab is already this request
      const existingTab = state.tabs.find((t) => t.savedMeta && t.savedMeta.requestId === requestId);
      if (existingTab) {
        setActiveTab(existingTab.id);
        renderCollectionsTree();
        return;
      }

      // Check if active tab is clean/empty (not saved and no content entered)
      let targetTab = getActiveTab();
      const isClean =
        targetTab &&
        !targetTab.url &&
        !targetTab.body &&
        targetTab.params.length === 0 &&
        targetTab.headers.length === 0 &&
        !targetTab.savedMeta;

      if (!isClean) {
        targetTab = createTab({
          title: reqData.name || 'Saved Request',
          isCustomTitle: true
        });
      }

      targetTab.title = reqData.name || 'Saved Request';
      targetTab.isCustomTitle = true;
      targetTab.method = reqData.method || 'GET';
      targetTab.url = reqData.url || '';
      targetTab.params = Array.isArray(reqData.params) ? JSON.parse(JSON.stringify(reqData.params)) : [];
      targetTab.headers = Array.isArray(reqData.headers) ? JSON.parse(JSON.stringify(reqData.headers)) : [];
      targetTab.body = reqData.body || '';

      targetTab.savedMeta = {
        collectionId,
        folderId: reqData.folderId || null,
        requestId: reqData.id,
        savedName: reqData.name
      };

      targetTab.savedSnapshot = getRequestSnapshot(targetTab);

      setActiveTab(targetTab.id);
      renderCollectionsTree();
      showToast(`Opened: ${reqData.name}`, 'info');
    } catch (err) {
      console.error('[ApiForge Lite] Error reopening saved request:', err);
      showToast('Failed to open request: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // Save Request Actions (Save & Save As)
  // ==========================================================================

  async function handleSaveRequest() {
    const tab = getActiveTab();
    if (!tab) return;

    // If tab is already saved into a collection and folder, update directly
    if (tab.savedMeta && tab.savedMeta.collectionId && tab.savedMeta.requestId) {
      try {
        await window.apiForge.saveRequest({
          collectionId: tab.savedMeta.collectionId,
          folderId: tab.savedMeta.folderId,
          requestId: tab.savedMeta.requestId,
          request: {
            name: tab.savedMeta.savedName || tab.title,
            method: tab.method,
            url: tab.url,
            params: tab.params,
            headers: tab.headers,
            body: tab.body
          }
        });

        tab.savedSnapshot = getRequestSnapshot(tab);
        updateUnsavedIndicator();
        await loadCollectionsTree();
        showToast(`Saved "${tab.savedMeta.savedName || tab.title}"`, 'success');
      } catch (err) {
        showToast('Save failed: ' + err.message, 'error');
      }
    } else {
      // Unsaved request: open Save Modal
      openSaveModal();
    }
  }

  function openSaveModal() {
    const tab = getActiveTab();
    if (!tab) return;

    if (!state.collectionsTree || state.collectionsTree.length === 0) {
      showToast('Please create a collection first before saving requests.', 'info');
      openCreateCollectionModal();
      return;
    }

    if (elements.saveRequestName) {
      elements.saveRequestName.value = tab.savedMeta?.savedName || (tab.url ? tab.title : 'New Request');
    }

    // Populate Collections dropdown
    if (elements.saveTargetCollection) {
      elements.saveTargetCollection.innerHTML = '';
      state.collectionsTree.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (tab.savedMeta && tab.savedMeta.collectionId === c.id) {
          opt.selected = true;
        }
        elements.saveTargetCollection.appendChild(opt);
      });

      // Update folders dropdown for selected collection
      updateSaveModalFolders();
    }

    openModal(elements.modalSaveRequest);
    if (elements.saveRequestName) {
      elements.saveRequestName.focus();
      elements.saveRequestName.select();
    }
  }

  function openSaveModalForNew(collectionId, folderId) {
    if (!collectionId) return;

    // Create a new tab first
    createTab({
      title: 'New Request',
      method: 'GET',
      url: ''
    });

    if (elements.saveRequestName) {
      elements.saveRequestName.value = 'New Request';
    }

    if (elements.saveTargetCollection) {
      elements.saveTargetCollection.innerHTML = '';
      state.collectionsTree.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === collectionId) opt.selected = true;
        elements.saveTargetCollection.appendChild(opt);
      });
      updateSaveModalFolders(folderId);
    }

    openModal(elements.modalSaveRequest);
    if (elements.saveRequestName) {
      elements.saveRequestName.focus();
      elements.saveRequestName.select();
    }
  }

  function updateSaveModalFolders(preselectFolderId = null) {
    if (!elements.saveTargetFolder || !elements.saveTargetCollection) return;
    elements.saveTargetFolder.innerHTML = '<option value="">Root (No Folder)</option>';

    const selectedColId = elements.saveTargetCollection.value;
    const col = state.collectionsTree.find((c) => c.id === selectedColId);
    if (!col || !col.folders) return;

    function addFolderOptions(folders, prefix = '') {
      folders.forEach((f) => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = `${prefix}${f.name}`;
        if (preselectFolderId && preselectFolderId === f.id) {
          opt.selected = true;
        }
        elements.saveTargetFolder.appendChild(opt);
        if (f.children && f.children.length > 0) {
          addFolderOptions(f.children, prefix + 'â€” ');
        }
      });
    }

    addFolderOptions(col.folders);
  }

  async function handleConfirmSaveModal() {
    const tab = getActiveTab();
    if (!tab) return;

    const name = elements.saveRequestName ? elements.saveRequestName.value.trim() : '';
    if (!name) {
      showToast('Please enter a request name', 'error');
      if (elements.saveRequestName) elements.saveRequestName.focus();
      return;
    }

    const collectionId = elements.saveTargetCollection ? elements.saveTargetCollection.value : null;
    if (!collectionId) {
      showToast('Please select a collection', 'error');
      return;
    }

    const folderId = elements.saveTargetFolder && elements.saveTargetFolder.value ? elements.saveTargetFolder.value : null;

    try {
      const saved = await window.apiForge.saveRequest({
        collectionId,
        folderId,
        requestId: null, // Always create a fresh entry on modal confirm
        request: {
          name,
          method: tab.method,
          url: tab.url,
          params: tab.params,
          headers: tab.headers,
          body: tab.body
        }
      });

      tab.title = saved.name;
      tab.isCustomTitle = true;
      tab.savedMeta = {
        collectionId,
        folderId: saved.folderId || null,
        requestId: saved.id,
        savedName: saved.name
      };

      tab.savedSnapshot = getRequestSnapshot(tab);
      closeActiveModal();
      updateUnsavedIndicator();

      // Expand the destination collection and folder
      state.expandedNodes.add(collectionId);
      if (folderId) state.expandedNodes.add(folderId);

      await loadCollectionsTree();
      showToast(`Saved request "${saved.name}"`, 'success');
    } catch (err) {
      showToast('Save error: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // Modal Management Framework
  // ==========================================================================

  function openModal(modalEl) {
    closeActiveModal();
    if (!modalEl) return;
    if (elements.modalBackdrop) elements.modalBackdrop.hidden = false;
    modalEl.hidden = false;
    state.activeModal = modalEl;
  }

  function closeActiveModal() {
    if (elements.modalBackdrop) elements.modalBackdrop.hidden = true;
    if (elements.modalSaveRequest) elements.modalSaveRequest.hidden = true;
    if (elements.modalCollection) elements.modalCollection.hidden = true;
    if (elements.modalFolder) elements.modalFolder.hidden = true;
    if (elements.modalRenameRequest) elements.modalRenameRequest.hidden = true;
    if (elements.modalDelete) elements.modalDelete.hidden = true;
    if (elements.modalSettings) elements.modalSettings.hidden = true;
    if (elements.modalClearHistory) elements.modalClearHistory.hidden = true;
    state.activeModal = null;
    state.pendingModalAction = null;
  }

  // Collection Modals
  function openCreateCollectionModal() {
    if (elements.modalColTitle) elements.modalColTitle.textContent = 'Create Collection';
    if (elements.collectionNameInput) elements.collectionNameInput.value = '';
    state.pendingModalAction = async (name) => {
      const col = await window.apiForge.createCollection(name);
      state.expandedNodes.add(col.id);
      showToast(`Created collection "${col.name}"`, 'success');
      await loadCollectionsTree();
    };
    openModal(elements.modalCollection);
    if (elements.collectionNameInput) elements.collectionNameInput.focus();
  }

  function openRenameCollectionModal(collectionId, currentName) {
    if (elements.modalColTitle) elements.modalColTitle.textContent = 'Rename Collection';
    if (elements.collectionNameInput) elements.collectionNameInput.value = currentName || '';
    state.pendingModalAction = async (name) => {
      await window.apiForge.renameCollection(collectionId, name);
      showToast(`Renamed collection to "${name}"`, 'success');
      await loadCollectionsTree();
    };
    openModal(elements.modalCollection);
    if (elements.collectionNameInput) {
      elements.collectionNameInput.focus();
      elements.collectionNameInput.select();
    }
  }

  // Folder Modals
  function openCreateFolderModal(collectionId, parentFolderId = null) {
    if (elements.modalFldTitle) elements.modalFldTitle.textContent = parentFolderId ? 'Create Subfolder' : 'Create Folder';
    if (elements.folderNameInput) elements.folderNameInput.value = '';
    state.pendingModalAction = async (name) => {
      const fld = await window.apiForge.createFolder(collectionId, parentFolderId, name);
      state.expandedNodes.add(collectionId);
      if (parentFolderId) state.expandedNodes.add(parentFolderId);
      state.expandedNodes.add(fld.id);
      showToast(`Created folder "${fld.name}"`, 'success');
      await loadCollectionsTree();
    };
    openModal(elements.modalFolder);
    if (elements.folderNameInput) elements.folderNameInput.focus();
  }

  function openRenameFolderModal(collectionId, folderId, currentName) {
    if (elements.modalFldTitle) elements.modalFldTitle.textContent = 'Rename Folder';
    if (elements.folderNameInput) elements.folderNameInput.value = currentName || '';
    state.pendingModalAction = async (name) => {
      await window.apiForge.renameFolder(collectionId, folderId, name);
      showToast(`Renamed folder to "${name}"`, 'success');
      await loadCollectionsTree();
    };
    openModal(elements.modalFolder);
    if (elements.folderNameInput) {
      elements.folderNameInput.focus();
      elements.folderNameInput.select();
    }
  }

  // Request Rename Modal
  function openRenameRequestModal(collectionId, requestId, currentName) {
    if (elements.modalRenameReqTitle) elements.modalRenameReqTitle.textContent = 'Rename Request';
    if (elements.renameRequestInput) elements.renameRequestInput.value = currentName || '';
    state.pendingModalAction = async (name) => {
      await window.apiForge.renameRequest(collectionId, requestId, name);
      // Update any open tab corresponding to this request
      state.tabs.forEach((t) => {
        if (t.savedMeta && t.savedMeta.requestId === requestId) {
          t.savedMeta.savedName = name;
          t.title = name;
        }
      });
      renderTabStrip();
      updateBreadcrumb();
      showToast(`Renamed request to "${name}"`, 'success');
      await loadCollectionsTree();
    };
    openModal(elements.modalRenameRequest);
    if (elements.renameRequestInput) {
      elements.renameRequestInput.focus();
      elements.renameRequestInput.select();
    }
  }

  // Delete Confirm Modal
  function openDeleteConfirmModal({ title, message, onConfirm }) {
    if (elements.modalDelTitle) elements.modalDelTitle.textContent = title || 'Confirm Deletion';
    if (elements.deleteConfirmMessage) elements.deleteConfirmMessage.textContent = message || 'Are you sure you want to delete this item?';
    state.pendingModalAction = onConfirm;
    openModal(elements.modalDelete);
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
          updateUnsavedIndicator();
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
          updateUnsavedIndicator();
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
            elements.bodyActiveDot.hidden = !tab.body.trim() || tab.method === 'GET' || tab.method === 'HEAD';
          }
          updateUnsavedIndicator();
        }
      });
    }
    if (elements.btnFormatJson) {
      elements.btnFormatJson.addEventListener('click', formatBodyJson);
    }
    if (elements.btnValidateJson) {
      elements.btnValidateJson.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          const isValid = validateBodyJson(tab.body);
          if (isValid) showToast('JSON is valid', 'success');
          else showToast('JSON contains syntax errors', 'error');
        }
      });
    }
    if (elements.btnCopyBody) {
      elements.btnCopyBody.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab && tab.body) {
          copyText(tab.body, 'Copied body to clipboard');
        } else {
          showToast('No body to copy', 'info');
        }
      });
    }
    if (elements.btnClearBody) {
      elements.btnClearBody.addEventListener('click', clearBodyJson);
    }

    // 9. Response Sub-tabs
    elements.respTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-resp-tab');
        switchResponseSubtab(tabName);
      });
    });

    // 10. Response Body Modes (Pretty vs Raw)
    if (elements.btnModePretty) {
      elements.btnModePretty.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          tab.bodyViewMode = 'pretty';
          elements.btnModePretty.className = 'btn-view-mode active';
          if (elements.btnModeRaw) elements.btnModeRaw.className = 'btn-view-mode';
          if (tab.response) renderResponseBody(tab.response, 'pretty');
        }
      });
    }
    if (elements.btnModeRaw) {
      elements.btnModeRaw.addEventListener('click', () => {
        const tab = getActiveTab();
        if (tab) {
          tab.bodyViewMode = 'raw';
          elements.btnModeRaw.className = 'btn-view-mode active';
          if (elements.btnModePretty) elements.btnModePretty.className = 'btn-view-mode';
          if (tab.response) renderResponseBody(tab.response, 'raw');
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

    // 12. Save & Save As Buttons
    if (elements.btnSaveRequest) {
      elements.btnSaveRequest.addEventListener('click', handleSaveRequest);
    }
    if (elements.btnSaveAsRequest) {
      elements.btnSaveAsRequest.addEventListener('click', openSaveModal);
    }

    // 13. Create Collection Header Button
    if (elements.btnCreateCollection) {
      elements.btnCreateCollection.addEventListener('click', openCreateCollectionModal);
    }

    // 14. Modals - Backdrop & Close Buttons
    if (elements.modalBackdrop) {
      elements.modalBackdrop.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCloseSaveModal) {
      elements.btnCloseSaveModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCancelSaveModal) {
      elements.btnCancelSaveModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnConfirmSaveModal) {
      elements.btnConfirmSaveModal.addEventListener('click', handleConfirmSaveModal);
    }
    if (elements.saveTargetCollection) {
      elements.saveTargetCollection.addEventListener('change', () => updateSaveModalFolders());
    }

    // Collection Modal
    if (elements.btnCloseColModal) elements.btnCloseColModal.addEventListener('click', closeActiveModal);
    if (elements.btnCancelColModal) elements.btnCancelColModal.addEventListener('click', closeActiveModal);
    if (elements.btnConfirmColModal) {
      elements.btnConfirmColModal.addEventListener('click', async () => {
        const name = elements.collectionNameInput ? elements.collectionNameInput.value.trim() : '';
        if (!name) {
          showToast('Please enter a collection name', 'error');
          if (elements.collectionNameInput) elements.collectionNameInput.focus();
          return;
        }
        if (typeof state.pendingModalAction === 'function') {
          try {
            await state.pendingModalAction(name);
            closeActiveModal();
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        }
      });
    }

    // Folder Modal
    if (elements.btnCloseFldModal) elements.btnCloseFldModal.addEventListener('click', closeActiveModal);
    if (elements.btnCancelFldModal) elements.btnCancelFldModal.addEventListener('click', closeActiveModal);
    if (elements.btnConfirmFldModal) {
      elements.btnConfirmFldModal.addEventListener('click', async () => {
        const name = elements.folderNameInput ? elements.folderNameInput.value.trim() : '';
        if (!name) {
          showToast('Please enter a folder name', 'error');
          if (elements.folderNameInput) elements.folderNameInput.focus();
          return;
        }
        if (typeof state.pendingModalAction === 'function') {
          try {
            await state.pendingModalAction(name);
            closeActiveModal();
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        }
      });
    }

    // Request Rename Modal
    if (elements.btnCloseRenameReqModal) elements.btnCloseRenameReqModal.addEventListener('click', closeActiveModal);
    if (elements.btnCancelRenameReqModal) elements.btnCancelRenameReqModal.addEventListener('click', closeActiveModal);
    if (elements.btnConfirmRenameReqModal) {
      elements.btnConfirmRenameReqModal.addEventListener('click', async () => {
        const name = elements.renameRequestInput ? elements.renameRequestInput.value.trim() : '';
        if (!name) {
          showToast('Please enter a request name', 'error');
          if (elements.renameRequestInput) elements.renameRequestInput.focus();
          return;
        }
        if (typeof state.pendingModalAction === 'function') {
          try {
            await state.pendingModalAction(name);
            closeActiveModal();
          } catch (err) {
            showToast('Error: ' + err.message, 'error');
          }
        }
      });
    }

    // Delete Confirm Modal
    if (elements.btnCloseDelModal) elements.btnCloseDelModal.addEventListener('click', closeActiveModal);
    if (elements.btnCancelDelModal) elements.btnCancelDelModal.addEventListener('click', closeActiveModal);
    if (elements.btnConfirmDelModal) {
      elements.btnConfirmDelModal.addEventListener('click', async () => {
        if (typeof state.pendingModalAction === 'function') {
          try {
            await state.pendingModalAction();
            closeActiveModal();
          } catch (err) {
            showToast('Delete error: ' + err.message, 'error');
          }
        }
      });
    }

    // 15. Navigation Buttons (Phase tags)
    elements.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const feat = btn.getAttribute('data-feature') || 'Feature';
        const step = btn.getAttribute('data-step') || 'a future step';
        showToast(`${feat} module is scheduled for implementation in ${step}.`, 'info');
      });
    });


    // ------------------------------------------------------------------------
    // Step 4: History & Settings Event Bindings
    // ------------------------------------------------------------------------

    // History Panel toggle
    if (elements.navHistory) {
      elements.navHistory.addEventListener('click', () => {
        toggleHistoryPanel();
      });
    }

    // Clear History Button (opens confirm modal)
    if (elements.btnClearHistory) {
      elements.btnClearHistory.addEventListener('click', () => {
        openModal(elements.modalClearHistory);
      });
    }

    // Clear History Modal actions
    if (elements.btnConfirmClrHistModal) {
      elements.btnConfirmClrHistModal.addEventListener('click', clearAllHistory);
    }
    if (elements.btnCancelClrHistModal) {
      elements.btnCancelClrHistModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCloseClrHistModal) {
      elements.btnCloseClrHistModal.addEventListener('click', closeActiveModal);
    }

    // Settings Modal
    if (elements.navSettings) {
      elements.navSettings.addEventListener('click', () => {
        openSettingsModal();
      });
    }
    if (elements.btnCloseSettingsModal) {
      elements.btnCloseSettingsModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCancelSettingsModal) {
      elements.btnCancelSettingsModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnSaveSettings) {
      elements.btnSaveSettings.addEventListener('click', saveSettingsFromModal);
    }
    if (elements.btnResetSettings) {
      elements.btnResetSettings.addEventListener('click', resetSettingsFromModal);
    }

    // Theme toggles inside settings modal
    if (elements.btnThemeDark) {
      elements.btnThemeDark.addEventListener('click', () => {
        applyTheme('dark');
      });
    }
    if (elements.btnThemeLight) {
      elements.btnThemeLight.addEventListener('click', () => {
        applyTheme('light');
      });
    }

    // Timeout display updater
    if (elements.settingsTimeout) {
      elements.settingsTimeout.addEventListener('input', () => {
        updateTimeoutDisplay(elements.settingsTimeout.value);
      });
    }

    // 16. Keyboard Shortcuts (Ctrl+S, Ctrl+N, Ctrl+Enter, Esc)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.activeModal) {
        e.preventDefault();
        closeActiveModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveRequest();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createTab();
        showToast('Created new request tab', 'info');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (state.activeModal) {
          // Trigger confirm button of active modal
          if (state.activeModal === elements.modalSaveRequest && elements.btnConfirmSaveModal) {
            elements.btnConfirmSaveModal.click();
          } else if (state.activeModal === elements.modalCollection && elements.btnConfirmColModal) {
            elements.btnConfirmColModal.click();
          } else if (state.activeModal === elements.modalFolder && elements.btnConfirmFldModal) {
            elements.btnConfirmFldModal.click();
          } else if (state.activeModal === elements.modalRenameRequest && elements.btnConfirmRenameReqModal) {
            elements.btnConfirmRenameReqModal.click();
          } else if (state.activeModal === elements.modalDelete && elements.btnConfirmDelModal) {
            elements.btnConfirmDelModal.click();
          } else if (state.activeModal === elements.modalSettings && elements.btnSaveSettings) {
            elements.btnSaveSettings.click();
          } else if (state.activeModal === elements.modalClearHistory && elements.btnConfirmClrHistModal) {
            elements.btnConfirmClrHistModal.click();
          }
        } else {
          e.preventDefault();
          executeSend();
        }
      }
    });
  }


  // ==========================================================================
  // Step 4: History & Settings Implementation Functions
  // ==========================================================================

  async function loadSettings() {
    if (!window.apiForge || !window.apiForge.getSettings) return;
    try {
      const s = await window.apiForge.getSettings();
      if (s) {
        state.settings = { ...state.settings, ...s };
      }
      applyTheme(state.settings.theme);
    } catch (err) {
      console.warn('[Renderer] Failed to load settings:', err);
    }
  }

  function applyTheme(theme) {
    const valid = (theme === 'light') ? 'light' : 'dark';
    state.settings.theme = valid;

    if (valid === 'light') {
      document.body.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.body.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (elements.settingsTheme) elements.settingsTheme.value = valid;

    if (elements.btnThemeDark && elements.btnThemeLight) {
      if (valid === 'light') {
        elements.btnThemeLight.classList.add('theme-active');
        elements.btnThemeLight.setAttribute('aria-pressed', 'true');
        elements.btnThemeDark.classList.remove('theme-active');
        elements.btnThemeDark.setAttribute('aria-pressed', 'false');
      } else {
        elements.btnThemeDark.classList.add('theme-active');
        elements.btnThemeDark.setAttribute('aria-pressed', 'true');
        elements.btnThemeLight.classList.remove('theme-active');
        elements.btnThemeLight.setAttribute('aria-pressed', 'false');
      }
    }
  }

  function updateTimeoutDisplay(msVal) {
    if (!elements.settingsTimeoutDisplay) return;
    const ms = Number(msVal);
    if (!isNaN(ms) && ms >= 1000) {
      const sec = (ms / 1000).toFixed(1).replace(/\.0$/, '');
      elements.settingsTimeoutDisplay.textContent = `${sec} second${sec === '1' ? '' : 's'}`;
    } else {
      elements.settingsTimeoutDisplay.textContent = `${msVal} ms`;
    }
  }

  function openSettingsModal() {
    if (!elements.modalSettings) return;

    if (elements.settingsTimeout) {
      elements.settingsTimeout.value = state.settings.requestTimeoutMs || 15000;
      updateTimeoutDisplay(state.settings.requestTimeoutMs || 15000);
    }
    if (elements.settingsHistoryLimit) {
      elements.settingsHistoryLimit.value = state.settings.historyLimit || 100;
    }

    applyTheme(state.settings.theme || 'dark');

    if (elements.settingsTimeoutError) elements.settingsTimeoutError.hidden = true;
    if (elements.settingsHistoryLimitError) elements.settingsHistoryLimitError.hidden = true;

    openModal(elements.modalSettings);
  }

  async function saveSettingsFromModal() {
    if (!window.apiForge || !window.apiForge.saveSettings) return;

    const timeoutInput = elements.settingsTimeout ? parseInt(elements.settingsTimeout.value, 10) : 15000;
    const limitInput = elements.settingsHistoryLimit ? parseInt(elements.settingsHistoryLimit.value, 10) : 100;
    const themeInput = elements.settingsTheme ? elements.settingsTheme.value : 'dark';

    let hasError = false;

    if (isNaN(timeoutInput) || timeoutInput < 1000 || timeoutInput > 120000) {
      if (elements.settingsTimeoutError) {
        elements.settingsTimeoutError.textContent = 'Timeout must be an integer between 1,000 and 120,000 ms.';
        elements.settingsTimeoutError.hidden = false;
      }
      hasError = true;
    } else if (elements.settingsTimeoutError) {
      elements.settingsTimeoutError.hidden = true;
    }

    if (isNaN(limitInput) || limitInput < 10 || limitInput > 1000) {
      if (elements.settingsHistoryLimitError) {
        elements.settingsHistoryLimitError.textContent = 'History limit must be an integer between 10 and 1,000.';
        elements.settingsHistoryLimitError.hidden = false;
      }
      hasError = true;
    } else if (elements.settingsHistoryLimitError) {
      elements.settingsHistoryLimitError.hidden = true;
    }

    if (hasError) return;

    try {
      const saved = await window.apiForge.saveSettings({
        requestTimeoutMs: timeoutInput,
        historyLimit: limitInput,
        theme: themeInput
      });

      state.settings = saved;
      applyTheme(saved.theme);
      closeActiveModal();
      showToast('Settings saved successfully', 'success');

      // Reload history in case historyLimit was reduced and records were trimmed
      await loadHistory();
    } catch (err) {
      showToast(`Failed to save settings: ${err.message}`, 'error');
    }
  }

  async function resetSettingsFromModal() {
    if (!window.apiForge || !window.apiForge.resetSettings) return;
    try {
      const def = await window.apiForge.resetSettings();
      state.settings = def;
      applyTheme(def.theme);

      if (elements.settingsTimeout) elements.settingsTimeout.value = def.requestTimeoutMs;
      updateTimeoutDisplay(def.requestTimeoutMs);
      if (elements.settingsHistoryLimit) elements.settingsHistoryLimit.value = def.historyLimit;

      if (elements.settingsTimeoutError) elements.settingsTimeoutError.hidden = true;
      if (elements.settingsHistoryLimitError) elements.settingsHistoryLimitError.hidden = true;

      await loadHistory();
      showToast('Settings reset to defaults', 'info');
    } catch (err) {
      showToast(`Failed to reset settings: ${err.message}`, 'error');
    }
  }

  async function loadHistory() {
    if (!window.apiForge || !window.apiForge.getHistory) return;
    try {
      const entries = await window.apiForge.getHistory();
      state.history = Array.isArray(entries) ? entries : [];
      updateHistoryBadge();
      renderHistoryList();
    } catch (err) {
      console.warn('[Renderer] Failed to load history:', err);
    }
  }

  function updateHistoryBadge() {
    if (!elements.historyCountBadge) return;
    const count = (state.history || []).length;
    elements.historyCountBadge.textContent = count;
    elements.historyCountBadge.hidden = count === 0;
  }

  function formatHistoryTime(timestamp) {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (_) {
      return '';
    }
  }

  function renderHistoryList() {
    if (!elements.historyList) return;

    if (!state.history || state.history.length === 0) {
      elements.historyList.innerHTML = `
        <div class="history-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>No history yet</p>
          <span>Send a request to begin recording</span>
        </div>
      `;
      return;
    }

    elements.historyList.innerHTML = '';
    state.history.forEach(entry => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-entry';
      itemEl.setAttribute('role', 'button');
      itemEl.setAttribute('tabindex', '0');
      itemEl.setAttribute('data-history-id', entry.id);

      const methodLower = (entry.method || 'GET').toLowerCase();
      let statusHtml = '';
      if (entry.isNetworkError) {
        statusHtml = `<span class="history-entry-error-badge" title="${escapeHtml(entry.errorMessage || 'Network error')}">NET ERR</span>`;
      } else if (typeof entry.status === 'number') {
        const s = entry.status;
        const colorClass = s >= 200 && s < 300 ? 'status-2xx' : s >= 300 && s < 400 ? 'status-3xx' : s >= 400 && s < 500 ? 'status-4xx' : 'status-5xx';
        statusHtml = `<span class="history-entry-status ${colorClass}">${s}</span>`;
      }

      const durationHtml = entry.durationMs ? `<span class="history-entry-duration">${entry.durationMs}ms</span>` : '';
      const timeStr = formatHistoryTime(entry.timestamp);

      itemEl.innerHTML = `
        <span class="history-entry-method method-${methodLower}">${escapeHtml(entry.method || 'GET')}</span>
        <div class="history-entry-info">
          <div class="history-entry-url" title="${escapeHtml(entry.url || '')}">${escapeHtml(entry.url || '(Empty URL)')}</div>
          <div class="history-entry-meta">
            <span class="history-entry-time">${timeStr}</span>
            ${statusHtml}
            ${durationHtml}
          </div>
        </div>
      `;

      itemEl.addEventListener('click', () => {
        restoreHistoryEntry(entry);
      });

      itemEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          restoreHistoryEntry(entry);
        }
      });

      elements.historyList.appendChild(itemEl);
    });
  }

  function restoreHistoryEntry(entry) {
    if (!entry) return;

    let tab = getActiveTab();
    if (!tab) {
      tab = createTab();
    }

    tab.method = entry.method || 'GET';
    tab.url = entry.url || '';

    // Restore query params
    if (Array.isArray(entry.params) && entry.params.length > 0) {
      tab.params = JSON.parse(JSON.stringify(entry.params));
    } else {
      // Parse params from URL
      try {
        const parsedUrl = new URL(tab.url, 'http://localhost');
        const searchParams = Array.from(parsedUrl.searchParams.entries()).map(([k, v]) => ({
          key: k,
          value: v,
          enabled: true
        }));
        tab.params = searchParams.length > 0 ? searchParams : [{ key: '', value: '', enabled: true }];
      } catch (_) {
        tab.params = [{ key: '', value: '', enabled: true }];
      }
    }

    // Restore headers (check if any sensitive were redacted)
    let hadRedacted = false;
    if (Array.isArray(entry.requestHeaders) && entry.requestHeaders.length > 0) {
      tab.headers = entry.requestHeaders.map(h => {
        if (h.value === '***') {
          hadRedacted = true;
        }
        return { key: h.key, value: h.value, enabled: h.enabled !== false };
      });
    }

    // Update tab title
    try {
      const u = new URL(tab.url);
      tab.title = `${tab.method} ${u.pathname === '/' ? u.hostname : u.pathname}`;
    } catch (_) {
      tab.title = tab.url ? `${tab.method} ${tab.url.slice(0, 20)}` : `${tab.method} Request`;
    }

    setActiveTab(tab.id);

    if (hadRedacted) {
      showToast('Restored request from history. Sensitive header values (***) must be re-entered.', 'warning');
    } else {
      showToast(`Restored ${tab.method} request into active tab`, 'info');
    }
  }

  async function recordHistory(opts) {
    if (!window.apiForge || !window.apiForge.addHistoryEntry) return;
    try {
      const saved = await window.apiForge.addHistoryEntry(opts);
      if (saved) {
        state.history.unshift(saved);
        const limit = (state.settings && state.settings.historyLimit) || 100;
        if (state.history.length > limit) {
          state.history.splice(limit);
        }
        updateHistoryBadge();
        renderHistoryList();
      }
    } catch (err) {
      console.warn('[Renderer] Failed to record history entry:', err);
    }
  }

  async function clearAllHistory() {
    if (!window.apiForge || !window.apiForge.clearHistory) return;
    try {
      await window.apiForge.clearHistory();
      state.history = [];
      updateHistoryBadge();
      renderHistoryList();
      closeActiveModal();
      showToast('Request history cleared', 'info');
    } catch (err) {
      showToast(`Failed to clear history: ${err.message}`, 'error');
    }
  }

  function toggleHistoryPanel() {
    if (!elements.historyPanel) return;
    const isHidden = elements.historyPanel.hidden;
    elements.historyPanel.hidden = !isHidden;
    state.historyPanelOpen = !isHidden;

    if (elements.navHistory) {
      elements.navHistory.setAttribute('aria-pressed', String(!isHidden));
      if (!isHidden) {
        elements.navHistory.classList.add('nav-btn-active');
      } else {
        elements.navHistory.classList.remove('nav-btn-active');
      }
    }

    if (!isHidden) {
      loadHistory();
    }
  }

  // ==========================================================================
  // App Bootstrap
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', async () => {
    initializeBridge();
    createTab({ title: 'New Request', method: 'GET', url: '' });
    bindEvents();
    loadCollectionsTree();
    await loadSettings();
    await loadHistory();
    // Show history panel by default so it's readily accessible
    if (elements.historyPanel) {
      elements.historyPanel.hidden = false;
      state.historyPanelOpen = true;
      if (elements.navHistory) {
        elements.navHistory.setAttribute('aria-pressed', 'true');
        elements.navHistory.classList.add('nav-btn-active');
      }
    }
  });
})();




