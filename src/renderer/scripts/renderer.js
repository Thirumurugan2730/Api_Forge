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
    historyPanelOpen: false,
    environments: [],
    activeEnvironmentId: null,
    selectedEnvIdForEdit: null
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
    btnConfirmClrHistModal: document.getElementById('btn-confirm-clear-hist-modal'),

    // Step 6: Automated Testing Elements
    tabTests: document.getElementById('tab-tests'),
    testsBadgeCount: document.getElementById('tests-badge-count'),
    panelTests: document.getElementById('panel-tests'),
    testsList: document.getElementById('tests-list'),
    btnAddTest: document.getElementById('btn-add-test'),
    btnRunTests: document.getElementById('btn-run-tests'),
    chkAutorunTests: document.getElementById('chk-autorun-tests'),
    testsSummaryBar: document.getElementById('tests-summary-bar'),
    testsSummaryBadge: document.getElementById('tests-summary-badge'),
    btnPresetStatus200: document.getElementById('btn-preset-status-200'),
    btnPresetTime1000: document.getElementById('btn-preset-time-1000'),
    btnPresetJsonProp: document.getElementById('btn-preset-json-prop'),
    btnPresetHeaderCt: document.getElementById('btn-preset-header-ct'),
    btnPresetContent: document.getElementById('btn-preset-content'),
    resptabTests: document.getElementById('resptab-tests'),
    respTestsBadge: document.getElementById('resp-tests-badge'),
    respPanelTests: document.getElementById('resp-panel-tests'),
    respTestsResultsContainer: document.getElementById('resp-tests-results-container'),

    // OpenAPI Import Elements (Step 7)
    btnImportOpenApi: document.getElementById('btn-import-openapi'),
    modalOpenApi: document.getElementById('modal-openapi'),
    btnCloseOpenApiModal: document.getElementById('btn-close-openapi-modal'),
    btnCancelOpenApi: document.getElementById('btn-cancel-openapi'),
    openapiTabUrl: document.getElementById('openapi-tab-url'),
    openapiTabFile: document.getElementById('openapi-tab-file'),
    openapiPanelUrl: document.getElementById('openapi-panel-url'),
    openapiPanelFile: document.getElementById('openapi-panel-file'),
    inputOpenApiUrl: document.getElementById('input-openapi-url'),
    btnFetchOpenApiUrl: document.getElementById('btn-fetch-openapi-url'),
    btnBrowseOpenApiFile: document.getElementById('btn-browse-openapi-file'),
    openapiSelectedFilename: document.getElementById('openapi-selected-filename'),
    openapiErrorBanner: document.getElementById('openapi-error-banner'),
    openapiErrorMessage: document.getElementById('openapi-error-message'),
    openapiLoadingBar: document.getElementById('openapi-loading-bar'),
    openapiLoadingText: document.getElementById('openapi-loading-text'),
    openapiPreviewSection: document.getElementById('openapi-preview-section'),
    openapiDocTitle: document.getElementById('openapi-doc-title'),
    openapiDocVersion: document.getElementById('openapi-doc-version'),
    openapiSpecVersion: document.getElementById('openapi-spec-version'),
    openapiDocDescription: document.getElementById('openapi-doc-description'),
    selectOpenApiServer: document.getElementById('select-openapi-server'),
    selectOpenApiTargetCollection: document.getElementById('select-openapi-target-collection'),
    selectOpenApiDupStrategy: document.getElementById('select-openapi-dup-strategy'),
    chkOpenApiUseBaseurl: document.getElementById('chk-openapi-use-baseurl'),
    openapiSelectedCounter: document.getElementById('openapi-selected-counter'),
    inputOpenApiFilter: document.getElementById('input-openapi-filter'),
    btnOpenApiSelectAll: document.getElementById('btn-openapi-select-all'),
    btnOpenApiDeselectAll: document.getElementById('btn-openapi-deselect-all'),
    openapiEndpointsList: document.getElementById('openapi-endpoints-list'),
    btnConfirmOpenApiImport: document.getElementById('btn-confirm-openapi-import'),

    // Step 8: Spring Boot Error Explainer Elements
    btnExplainError: document.getElementById('btn-explain-error'),
    resptabExplain: document.getElementById('resptab-explain'),
    respExplainBadge: document.getElementById('resp-explain-badge'),
    respPanelExplain: document.getElementById('resp-panel-explain'),
    explainContentContainer: document.getElementById('explain-content-container'),

    // Step 9: Spring Security Role Testing Elements
    tabRoles: document.getElementById('tab-roles'),
    panelRoles: document.getElementById('panel-roles'),
    rolesBadgeSummary: document.getElementById('roles-badge-summary'),
    rolesSummaryBar: document.getElementById('roles-summary-bar'),
    rolesSummaryBadge: document.getElementById('roles-summary-badge'),
    btnRunRoles: document.getElementById('btn-run-roles'),
    chkRoleAdminEnabled: document.getElementById('chk-role-admin-enabled'),
    selRoleAdminExpected: document.getElementById('sel-role-admin-expected'),
    txtRoleAdminStatus: document.getElementById('txt-role-admin-status'),
    selRoleAdminAuth: document.getElementById('sel-role-admin-auth'),
    txtRoleAdminToken: document.getElementById('txt-role-admin-token'),
    btnToggleAdminToken: document.getElementById('btn-toggle-admin-token'),
    roleAdminCustomHeaderRow: document.getElementById('role-admin-custom-header-row'),
    txtRoleAdminHeaderKey: document.getElementById('txt-role-admin-header-key'),
    chkRoleUserEnabled: document.getElementById('chk-role-user-enabled'),
    selRoleUserExpected: document.getElementById('sel-role-user-expected'),
    txtRoleUserStatus: document.getElementById('txt-role-user-status'),
    selRoleUserAuth: document.getElementById('sel-role-user-auth'),
    txtRoleUserToken: document.getElementById('txt-role-user-token'),
    btnToggleUserToken: document.getElementById('btn-toggle-user-token'),
    roleUserCustomHeaderRow: document.getElementById('role-user-custom-header-row'),
    txtRoleUserHeaderKey: document.getElementById('txt-role-user-header-key'),
    chkRoleAnonEnabled: document.getElementById('chk-role-anon-enabled'),
    selRoleAnonExpected: document.getElementById('sel-role-anon-expected'),
    txtRoleAnonStatus: document.getElementById('txt-role-anon-status'),
    rolesResultsTimestamp: document.getElementById('roles-results-timestamp'),
    rolesResultsTableContainer: document.getElementById('roles-results-table-container'),

    // Environment Management Elements
    navEnvironments: document.getElementById('nav-environments'),
    envCountBadge: document.getElementById('env-count-badge'),
    envSelector: document.getElementById('env-selector'),
    envDot: document.getElementById('env-dot'),
    envActiveName: document.getElementById('env-active-name'),
    modalEnvironments: document.getElementById('modal-environments'),
    btnCloseEnvModal: document.getElementById('btn-close-env-modal'),
    btnCloseEnvDone: document.getElementById('btn-close-env-done'),
    btnCreateEnv: document.getElementById('btn-create-env'),
    envList: document.getElementById('env-list'),
    inputEnvName: document.getElementById('input-env-name'),
    btnSetActiveEnv: document.getElementById('btn-set-active-env'),
    btnDeleteEnv: document.getElementById('btn-delete-env'),
    envVarsTbody: document.getElementById('env-vars-tbody'),
    btnAddEnvVar: document.getElementById('btn-add-env-var')
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
      body: tab.body || '',
      tests: tab.tests || [],
          roleTesting: tab.roleTesting || null,
            roleTesting: tab.roleTesting || null,
      roleTesting: tab.roleTesting ? {
        admin: { enabled: tab.roleTesting.admin?.enabled, expectedType: tab.roleTesting.admin?.expectedType, expectedStatus: tab.roleTesting.admin?.expectedStatus },
        user: { enabled: tab.roleTesting.user?.enabled, expectedType: tab.roleTesting.user?.expectedType, expectedStatus: tab.roleTesting.user?.expectedStatus },
        anonymous: { enabled: tab.roleTesting.anonymous?.enabled, expectedType: tab.roleTesting.anonymous?.expectedType, expectedStatus: tab.roleTesting.anonymous?.expectedStatus }
      } : null
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
      savedSnapshot: options.savedSnapshot !== undefined ? options.savedSnapshot : null,
      roleTesting: options.roleTesting ? JSON.parse(JSON.stringify(options.roleTesting)) : defaultRoleTestingConfig(),
      roleResults: null
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
    renderTestsTab();

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
      const isTarget = panel.getAttribute('data-panel') === subtabName || panel.id === `panel-${subtabName}`;
      panel.hidden = !isTarget;
    });
    if (subtabName === 'tests') {
      renderTestsTab();
    } else if (subtabName === 'roles') {
      renderRolesTab();
    }
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
      const isTarget = (btn.getAttribute('data-resptab') || btn.getAttribute('data-resp-tab')) === subtabName;
      btn.className = `resp-tab-btn ${isTarget ? 'active' : ''}`;
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    if (elements.respPanelBody) elements.respPanelBody.hidden = subtabName !== 'body';
    if (elements.respPanelHeaders) elements.respPanelHeaders.hidden = subtabName !== 'headers';
    if (elements.respPanelExplain) elements.respPanelExplain.hidden = subtabName !== 'explain';
    if (elements.respPanelTests) elements.respPanelTests.hidden = subtabName !== 'tests';
    if (subtabName === 'tests') {
      renderResponseTestsPanel();
    }
    if (subtabName === 'explain') {
      renderResponseExplain();
    }
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
      elements.statStatus.className = 'stat-val resp-status-pill empty stat-value status-badge badge-empty';
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

        elements.statStatus.className = `stat-val resp-status-pill status-${badgeClass.replace('badge-', '')} stat-value status-badge ${badgeClass}`;
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
      renderResponseExplain(tab);

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
    const countBadge = document.getElementById('resp-headers-pill-count');
    if (countBadge) {
      countBadge.textContent = `${entries.length} ${entries.length === 1 ? 'header' : 'headers'}`;
      countBadge.hidden = entries.length === 0;
    }

    if (entries.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" style="color: var(--text-muted); text-align: center; padding: 24px;">No headers returned</td>';
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

      const tdA = document.createElement('td');
      tdA.className = 'col-act';

      const btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.className = 'btn-copy-header';
      btnCopy.title = `Copy "${key}" value`;
      btnCopy.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      btnCopy.addEventListener('click', (e) => {
        e.stopPropagation();
        copyText(String(value), `Copied "${key}" value`);
      });

      tdA.appendChild(btnCopy);
      tr.appendChild(tdK);
      tr.appendChild(tdV);
      tr.appendChild(tdA);
      elements.responseHeadersTbody.appendChild(tr);
    });
  }

  async function renderResponseExplain(tab = getActiveTab()) {
    if (!tab) return;

    const isError = (tab.response && tab.response.status >= 400) || tab.responseState === 'error';
    if (elements.btnExplainError) elements.btnExplainError.hidden = !isError;
    if (elements.respExplainBadge) elements.respExplainBadge.hidden = !isError;

    if (!elements.explainContentContainer) return;

    if (!tab.response && tab.responseState !== 'error') {
      elements.explainContentContainer.innerHTML = `
        <div class="explain-empty-state">
          <p>Send a request to inspect and explain its response.</p>
        </div>
      `;
      return;
    }

    const respContext = {
      status: tab.response ? tab.response.status : 0,
      statusText: tab.response ? (tab.response.statusText || '') : (tab.error?.message || 'Network Failure'),
      headers: tab.response ? (tab.response.headers || {}) : {},
      body: tab.response && typeof tab.response.body === 'string' ? tab.response.body : '',
      requestMethod: tab.method || 'GET',
      requestUrl: tab.url || '',
      requestHeaders: tab.headers || [],
      requestBody: tab.body || ''
    };

    let explanation;
    try {
      if (window.apiForge && window.apiForge.explainError) {
        explanation = await window.apiForge.explainError(respContext);
      } else {
        return;
      }
    } catch (err) {
      console.error('[ApiForge Lite] Error generating explanation:', err);
      elements.explainContentContainer.innerHTML = `
        <div class="explain-overview-card is-error">
          <h4 class="explain-title">Failed to analyze response</h4>
          <p class="explain-text">${escapeHtml(err.message)}</p>
        </div>
      `;
      return;
    }

    let validationHtml = '';
    if (Array.isArray(explanation.validationErrors) && explanation.validationErrors.length > 0) {
      let rows = '';
      explanation.validationErrors.forEach(ve => {
        rows += `
          <tr>
            <td class="field-name">${escapeHtml(ve.field)}</td>
            <td>${escapeHtml(ve.message)}</td>
            <td><code>${escapeHtml(ve.rejectedValue !== null ? String(ve.rejectedValue) : '—')}</code></td>
            <td class="field-rule">${escapeHtml(ve.rule || 'Constraint')}</td>
          </tr>
        `;
      });

      validationHtml = `
        <div class="explain-section-card">
          <div class="explain-section-title validation">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Field Validation Constraints Violated (${explanation.validationErrors.length})</span>
          </div>
          <table class="explain-validation-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Validation Message</th>
                <th>Rejected Value</th>
                <th>Constraint</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }

    let evidenceHtml = '';
    if (Array.isArray(explanation.evidence) && explanation.evidence.length > 0) {
      let bullets = '';
      explanation.evidence.forEach(ev => {
        bullets += `<li>${escapeHtml(ev)}</li>`;
      });
      evidenceHtml = `
        <div class="explain-section-card">
          <div class="explain-section-title evidence">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Confirmed Evidence (Observed Facts)</span>
          </div>
          <ul class="explain-bullets-list">
            ${bullets}
          </ul>
        </div>
      `;
    }

    let causesHtml = '';
    if (Array.isArray(explanation.possibleCauses) && explanation.possibleCauses.length > 0) {
      let bullets = '';
      explanation.possibleCauses.forEach(c => {
        bullets += `<li>${escapeHtml(c)}</li>`;
      });
      causesHtml = `
        <div class="explain-section-card">
          <div class="explain-section-title causes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Possible Causes (Hypotheses to Investigate)</span>
          </div>
          <ul class="explain-bullets-list">
            ${bullets}
          </ul>
        </div>
      `;
    }

    let nextHtml = '';
    if (Array.isArray(explanation.whatToCheckNext) && explanation.whatToCheckNext.length > 0) {
      let bullets = '';
      explanation.whatToCheckNext.forEach(step => {
        bullets += `<li>${escapeHtml(step)}</li>`;
      });
      nextHtml = `
        <div class="explain-section-card">
          <div class="explain-section-title next">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>What to Check Next (Debugging Checklist)</span>
          </div>
          <ul class="explain-bullets-list">
            ${bullets}
          </ul>
        </div>
      `;
    }

    elements.explainContentContainer.innerHTML = `
      <div class="explain-overview-card ${explanation.isError ? 'is-error' : 'is-success'}">
        <div class="explain-header-top">
          <span class="explain-type-badge">${escapeHtml(explanation.errorType)}</span>
          <span class="explain-category-chip">${escapeHtml(explanation.category)}</span>
        </div>
        <h3 class="explain-title">${escapeHtml(explanation.title)}</h3>
      </div>

      <div class="explain-section-card">
        <div class="explain-section-title happened">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>What Happened</span>
        </div>
        <p class="explain-text">${escapeHtml(explanation.whatHappened)}</p>
      </div>

      ${evidenceHtml}
      ${validationHtml}
      ${causesHtml}
      ${nextHtml}
    `;
  }

  // ==========================================================================
  // HTTP Request Execution Engine
  // ==========================================================================

  async function executeSend() {
    const tab = getActiveTab();
    if (!tab) return;

    // Sync from active DOM controls if present
    if (elements.inputUrl && elements.inputUrl.value.trim()) {
      tab.url = elements.inputUrl.value.trim();
    }
    if (elements.selectMethod) {
      tab.method = elements.selectMethod.value || tab.method;
    }
    if (elements.inputBodyText && tab.method !== 'GET' && tab.method !== 'HEAD') {
      tab.body = elements.inputBodyText.value;
    }

    const trimmedUrl = (tab.url || '').trim();
    if (!trimmedUrl) {
      showToast('Please enter a request URL', 'error');
      if (elements.inputUrl) elements.inputUrl.focus();
      return;
    }

    // Step 7: Path parameter safety check (e.g. {id}, {userId})
    const pathParamMatch = trimmedUrl.match(/\{([a-zA-Z0-9_-]+)\}/);
    if (pathParamMatch) {
      showToast(`Unresolved path parameter "${pathParamMatch[0]}" in URL. Please replace it with a value before sending.`, 'error');
      if (elements.inputUrl) {
        elements.inputUrl.focus();
        const pIdx = elements.inputUrl.value.indexOf(pathParamMatch[0]);
        if (pIdx !== -1) {
          elements.inputUrl.setSelectionRange(pIdx, pIdx + pathParamMatch[0].length);
        }
      }
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

    const activeEnvVars = getActiveEnvironmentVariables();
    const effectiveUrl = substituteVariables(trimmedUrl, activeEnvVars);
    const effectiveHeaders = Array.isArray(tab.headers)
      ? tab.headers.map(h => ({ ...h, value: substituteVariables(h.value || '', activeEnvVars) }))
      : [];
    const effectiveParams = Array.isArray(tab.params)
      ? tab.params.map(p => ({ ...p, value: substituteVariables(p.value || '', activeEnvVars) }))
      : [];
    const effectiveBody = tab.body && tab.method !== 'GET' && tab.method !== 'HEAD'
      ? substituteVariables(tab.body, activeEnvVars)
      : (tab.body || null);

    const requestPayload = {
      requestId: tab.activeRequestId,
      method: tab.method,
      url: effectiveUrl,
      params: effectiveParams,
      headers: effectiveHeaders,
      body: tab.method === 'GET' || tab.method === 'HEAD' ? null : effectiveBody,
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
        if (tab.autoRunTests !== false && Array.isArray(tab.tests) && tab.tests.length > 0) {
          await runTabTests(tab);
        }
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
        if (tab.autoRunTests !== false && Array.isArray(tab.tests) && tab.tests.length > 0) {
          await runTabTests(tab);
        }
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
    loadEnvironments();
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
      targetTab.tests = Array.isArray(reqData.tests) ? JSON.parse(JSON.stringify(reqData.tests)) : [];
      targetTab.testResults = null;
      targetTab.roleTesting = reqData.roleTesting ? JSON.parse(JSON.stringify(reqData.roleTesting)) : defaultRoleTestingConfig();
      targetTab.roleResults = null;

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
            body: tab.body,
            tests: tab.tests || []
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
          body: tab.body,
          tests: tab.tests || []
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
    if (elements.modalEnvironments) elements.modalEnvironments.hidden = true;
    if (elements.modalClearHistory) elements.modalClearHistory.hidden = true;
    if (elements.modalOpenApi) elements.modalOpenApi.hidden = true;
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


  // ==========================================================================
  // Step 7: OpenAPI 3.x Import Controller
  // ==========================================================================

  let openApiImportState = {
    parsedSpec: null,
    selectedEndpointIds: new Set(),
    filterText: '',
    activeSourceTab: 'url'
  };

  function openOpenApiModal() {
    openApiImportState = {
      parsedSpec: null,
      selectedEndpointIds: new Set(),
      filterText: '',
      activeSourceTab: 'url'
    };

    if (elements.openapiErrorBanner) elements.openapiErrorBanner.hidden = true;
    if (elements.openapiLoadingBar) elements.openapiLoadingBar.hidden = true;
    if (elements.openapiPreviewSection) elements.openapiPreviewSection.hidden = true;
    if (elements.btnConfirmOpenApiImport) elements.btnConfirmOpenApiImport.disabled = true;

    // Switch to URL tab by default
    switchOpenApiSourceTab('url');

    // Populate Target Collections dropdown
    populateOpenApiTargetCollections();

    // Show modal via standard openModal
    openModal(elements.modalOpenApi);
  }

  function switchOpenApiSourceTab(tabName) {
    openApiImportState.activeSourceTab = tabName;
    if (elements.openapiErrorBanner) elements.openapiErrorBanner.hidden = true;

    if (tabName === 'url') {
      if (elements.openapiTabUrl) elements.openapiTabUrl.classList.add('active');
      if (elements.openapiTabFile) elements.openapiTabFile.classList.remove('active');
      if (elements.openapiPanelUrl) elements.openapiPanelUrl.hidden = false;
      if (elements.openapiPanelFile) elements.openapiPanelFile.hidden = true;
    } else {
      if (elements.openapiTabFile) elements.openapiTabFile.classList.add('active');
      if (elements.openapiTabUrl) elements.openapiTabUrl.classList.remove('active');
      if (elements.openapiPanelFile) elements.openapiPanelFile.hidden = false;
      if (elements.openapiPanelUrl) elements.openapiPanelUrl.hidden = true;
    }
  }

  function showOpenApiError(msg) {
    if (elements.openapiLoadingBar) elements.openapiLoadingBar.hidden = true;
    if (elements.openapiErrorBanner && elements.openapiErrorMessage) {
      elements.openapiErrorMessage.textContent = msg;
      elements.openapiErrorBanner.hidden = false;
    }
  }

  function populateOpenApiTargetCollections(defaultApiTitle = 'Spring Boot API') {
    if (!elements.selectOpenApiTargetCollection) return;
    elements.selectOpenApiTargetCollection.innerHTML = '';

    const newOption = document.createElement('option');
    newOption.value = 'new';
    newOption.textContent = `Create New Collection: ${defaultApiTitle}`;
    elements.selectOpenApiTargetCollection.appendChild(newOption);

    if (Array.isArray(state.collectionsTree)) {
      state.collectionsTree.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `Existing: ${c.name}`;
        elements.selectOpenApiTargetCollection.appendChild(opt);
      });
    }
  }

  async function handleFetchOpenApiFromUrl() {
    const url = elements.inputOpenApiUrl ? elements.inputOpenApiUrl.value.trim() : '';
    if (!url) {
      showOpenApiError('Please enter a valid OpenAPI documentation URL.');
      return;
    }

    if (elements.openapiErrorBanner) elements.openapiErrorBanner.hidden = true;
    if (elements.openapiLoadingBar) {
      elements.openapiLoadingText.textContent = `Connecting to ${url}...`;
      elements.openapiLoadingBar.hidden = false;
    }

    try {
      const result = await window.apiForge.fetchOpenApiFromUrl(url);
      if (elements.openapiLoadingBar) elements.openapiLoadingBar.hidden = true;

      if (!result.success) {
        showOpenApiError(result.error || 'Failed to parse OpenAPI document from URL');
        return;
      }

      renderOpenApiPreview(result);
    } catch (err) {
      showOpenApiError(err.message || 'Error fetching OpenAPI document');
    }
  }

  async function handleBrowseOpenApiFile() {
    if (elements.openapiErrorBanner) elements.openapiErrorBanner.hidden = true;
    if (elements.openapiLoadingBar) {
      elements.openapiLoadingText.textContent = 'Opening OpenAPI file...';
      elements.openapiLoadingBar.hidden = false;
    }

    try {
      const result = await window.apiForge.openOpenApiFile();
      if (elements.openapiLoadingBar) elements.openapiLoadingBar.hidden = true;

      if (result.cancelled) {
        return;
      }

      if (!result.success) {
        showOpenApiError(result.error || 'Failed to parse local OpenAPI file');
        return;
      }

      if (elements.openapiSelectedFilename) {
        elements.openapiSelectedFilename.textContent = result.filename || 'openapi.json';
      }

      renderOpenApiPreview(result);
    } catch (err) {
      showOpenApiError(err.message || 'Error opening OpenAPI file');
    }
  }

  function renderOpenApiPreview(spec) {
    openApiImportState.parsedSpec = spec;
    openApiImportState.selectedEndpointIds = new Set(spec.endpoints.map(e => e.id));

    // Populate API Info
    if (elements.openapiDocTitle) elements.openapiDocTitle.textContent = spec.apiInfo.title || 'Spring Boot API';
    if (elements.openapiDocVersion) elements.openapiDocVersion.textContent = 'v' + (spec.apiInfo.version || '1.0.0');
    if (elements.openapiSpecVersion) elements.openapiSpecVersion.textContent = 'OAS ' + (spec.apiInfo.openApiVersion || '3.0.x');
    if (elements.openapiDocDescription) elements.openapiDocDescription.textContent = spec.apiInfo.description || 'No description provided';

    // Populate Server dropdown
    if (elements.selectOpenApiServer) {
      elements.selectOpenApiServer.innerHTML = '';
      (spec.servers || ['http://localhost:8080']).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        elements.selectOpenApiServer.appendChild(opt);
      });
    }

    // Refresh Target Collection dropdown with doc title
    populateOpenApiTargetCollections(spec.apiInfo.title || 'Spring Boot API');

    // Reveal preview section
    if (elements.openapiPreviewSection) elements.openapiPreviewSection.hidden = false;

    // Render endpoints list
    renderOpenApiEndpointsList();
  }

  function renderOpenApiEndpointsList() {
    if (!elements.openapiEndpointsList || !openApiImportState.parsedSpec) return;

    const endpoints = openApiImportState.parsedSpec.endpoints || [];
    const filter = (openApiImportState.filterText || '').toLowerCase();

    elements.openapiEndpointsList.innerHTML = '';

    endpoints.forEach((ep) => {
      const matches = !filter ||
        ep.path.toLowerCase().includes(filter) ||
        (ep.summary && ep.summary.toLowerCase().includes(filter)) ||
        ep.method.toLowerCase().includes(filter);

      if (!matches) return;

      const isChecked = openApiImportState.selectedEndpointIds.has(ep.id);

      const item = document.createElement('div');
      item.className = 'openapi-endpoint-item';
      item.setAttribute('data-id', ep.id);

      // Highlight path parameters
      const highlightedPath = ep.path.replace(/\{([^}]+)\}/g, '<span class="openapi-path-param-highlight">{$1}</span>');

      item.innerHTML = `
        <input type="checkbox" class="openapi-endpoint-check" data-id="${ep.id}" ${isChecked ? 'checked' : ''}>
        <span class="openapi-method-badge ${ep.method.toLowerCase()}">${escapeHtml(ep.method)}</span>
        <div class="openapi-endpoint-info">
          <div class="openapi-endpoint-path">${highlightedPath}</div>
          <div class="openapi-endpoint-summary">${escapeHtml(ep.summary || '')}</div>
        </div>
        <div class="openapi-endpoint-meta">
          ${ep.pathParams.length > 0 ? `<span class="openapi-meta-tag">${ep.pathParams.length} path</span>` : ''}
          ${ep.queryParams.length > 0 ? `<span class="openapi-meta-tag">${ep.queryParams.length} query</span>` : ''}
          ${ep.body ? '<span class="openapi-meta-tag">body</span>' : ''}
        </div>
      `;

      // Click anywhere to toggle checkbox
      item.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
          const chk = item.querySelector('.openapi-endpoint-check');
          if (chk) {
            chk.checked = !chk.checked;
            toggleEndpointSelection(ep.id, chk.checked);
          }
        }
      });

      const chkBox = item.querySelector('.openapi-endpoint-check');
      if (chkBox) {
        chkBox.addEventListener('change', (e) => {
          toggleEndpointSelection(ep.id, e.target.checked);
        });
      }

      elements.openapiEndpointsList.appendChild(item);
    });

    updateOpenApiCounter();
  }

  function toggleEndpointSelection(endpointId, isSelected) {
    if (isSelected) {
      openApiImportState.selectedEndpointIds.add(endpointId);
    } else {
      openApiImportState.selectedEndpointIds.delete(endpointId);
    }
    updateOpenApiCounter();
  }

  function updateOpenApiCounter() {
    const total = openApiImportState.parsedSpec?.endpoints?.length || 0;
    const selected = openApiImportState.selectedEndpointIds.size;

    if (elements.openapiSelectedCounter) {
      elements.openapiSelectedCounter.textContent = `${selected} of ${total} selected`;
    }

    if (elements.btnConfirmOpenApiImport) {
      elements.btnConfirmOpenApiImport.disabled = selected === 0;
      elements.btnConfirmOpenApiImport.textContent = `Import ${selected} Selected Endpoint${selected === 1 ? '' : 's'}`;
    }
  }

  async function handleConfirmOpenApiImport() {
    if (!openApiImportState.parsedSpec) return;

    const allEndpoints = openApiImportState.parsedSpec.endpoints || [];
    const selectedEndpoints = allEndpoints.filter(e => openApiImportState.selectedEndpointIds.has(e.id));

    if (selectedEndpoints.length === 0) {
      showToast('Please select at least one endpoint to import', 'warning');
      return;
    }

    const targetCollectionId = elements.selectOpenApiTargetCollection ? elements.selectOpenApiTargetCollection.value : 'new';
    const targetCollectionName = openApiImportState.parsedSpec.apiInfo?.title || 'Spring Boot API';
    const serverUrl = elements.selectOpenApiServer ? elements.selectOpenApiServer.value : 'http://localhost:8080';
    const useBaseUrlVariable = elements.chkOpenApiUseBaseurl ? elements.chkOpenApiUseBaseurl.checked : true;
    const duplicateStrategy = elements.selectOpenApiDupStrategy ? elements.selectOpenApiDupStrategy.value : 'rename';

    const originalBtnText = elements.btnConfirmOpenApiImport ? elements.btnConfirmOpenApiImport.textContent : 'Import Selected Endpoints';
    if (elements.btnConfirmOpenApiImport) {
      elements.btnConfirmOpenApiImport.disabled = true;
      elements.btnConfirmOpenApiImport.textContent = 'Importing...';
    }

    try {
      if (!window.apiForge || typeof window.apiForge.importOpenApiEndpoints !== 'function') {
        throw new Error('API bridge importOpenApiEndpoints is not available');
      }

      const result = await window.apiForge.importOpenApiEndpoints({
        targetCollectionId,
        targetCollectionName,
        targetFolderId: null,
        endpoints: selectedEndpoints,
        options: {
          serverUrl,
          useBaseUrlVariable,
          duplicateStrategy
        }
      });

      if (!result.success) {
        showToast('Import failed: ' + (result.error || 'Unknown error'), 'error');
        return;
      }

      // If user imported from a remote server with {{baseUrl}}, ensure active environment's baseUrl is set
      if (serverUrl && useBaseUrlVariable && serverUrl !== 'http://localhost:8080') {
        const activeEnv = getActiveEnvironment();
        if (activeEnv && Array.isArray(activeEnv.variables)) {
          const baseUrlVar = activeEnv.variables.find(v => v.key === 'baseUrl');
          if (baseUrlVar && (baseUrlVar.value === 'http://localhost:8080' || !baseUrlVar.value)) {
            baseUrlVar.value = serverUrl;
            saveEnvironments();
            showToast(`Updated active environment baseUrl to ${serverUrl}`, 'info');
          }
        }
      }

      // Reload collections tree in sidebar
      await loadCollectionsTree();

      closeActiveModal();

      let msg = `Successfully imported ${result.importedCount} request${result.importedCount === 1 ? '' : 's'}`;
      if (result.skippedCount > 0) {
        msg += ` (${result.skippedCount} duplicate${result.skippedCount === 1 ? '' : 's'} skipped)`;
      }
      showToast(msg, 'success');
    } catch (err) {
      showToast('Failed to import endpoints: ' + err.message, 'error');
    } finally {
      if (elements.btnConfirmOpenApiImport) {
        elements.btnConfirmOpenApiImport.disabled = false;
        elements.btnConfirmOpenApiImport.textContent = originalBtnText;
      }
    }
  }


  // ==========================================================================
  // Step 9: Spring Security Role Testing Matrix Functions
  // ==========================================================================

  function defaultRoleTestingConfig() {
    return {
      admin: {
        enabled: true,
        authType: 'bearer',
        token: '',
        customHeaderKey: 'Authorization',
        customHeaderValue: '',
        expectedType: 'exact',
        expectedStatus: 200
      },
      user: {
        enabled: true,
        authType: 'bearer',
        token: '',
        customHeaderKey: 'Authorization',
        customHeaderValue: '',
        expectedType: 'denied',
        expectedStatus: 403
      },
      anonymous: {
        enabled: true,
        expectedType: 'exact',
        expectedStatus: 401
      }
    };
  }

  function renderRolesTab() {
    const tab = getActiveTab();
    if (!tab) return;

    if (!tab.roleTesting) {
      tab.roleTesting = defaultRoleTestingConfig();
    }

    const cfg = tab.roleTesting;

    // ADMIN fields
    if (elements.chkRoleAdminEnabled) elements.chkRoleAdminEnabled.checked = cfg.admin.enabled !== false;
    if (elements.selRoleAdminExpected) elements.selRoleAdminExpected.value = cfg.admin.expectedType || 'exact';
    if (elements.txtRoleAdminStatus) {
      elements.txtRoleAdminStatus.value = cfg.admin.expectedStatus || 200;
      elements.txtRoleAdminStatus.style.display = cfg.admin.expectedType === 'exact' ? '' : 'none';
    }
    if (elements.selRoleAdminAuth) elements.selRoleAdminAuth.value = cfg.admin.authType || 'bearer';
    if (elements.txtRoleAdminToken) elements.txtRoleAdminToken.value = cfg.admin.token || cfg.admin.tokenEnvVar || '';
    if (elements.roleAdminCustomHeaderRow) elements.roleAdminCustomHeaderRow.hidden = cfg.admin.authType !== 'header';
    if (elements.txtRoleAdminHeaderKey) elements.txtRoleAdminHeaderKey.value = cfg.admin.customHeaderKey || 'Authorization';

    // USER fields
    if (elements.chkRoleUserEnabled) elements.chkRoleUserEnabled.checked = cfg.user.enabled !== false;
    if (elements.selRoleUserExpected) elements.selRoleUserExpected.value = cfg.user.expectedType || 'exact';
    if (elements.txtRoleUserStatus) {
      elements.txtRoleUserStatus.value = cfg.user.expectedStatus || 403;
      elements.txtRoleUserStatus.style.display = cfg.user.expectedType === 'exact' ? '' : 'none';
    }
    if (elements.selRoleUserAuth) elements.selRoleUserAuth.value = cfg.user.authType || 'bearer';
    if (elements.txtRoleUserToken) elements.txtRoleUserToken.value = cfg.user.token || cfg.user.tokenEnvVar || '';
    if (elements.roleUserCustomHeaderRow) elements.roleUserCustomHeaderRow.hidden = cfg.user.authType !== 'header';
    if (elements.txtRoleUserHeaderKey) elements.txtRoleUserHeaderKey.value = cfg.user.customHeaderKey || 'Authorization';

    // Anonymous fields
    if (elements.chkRoleAnonEnabled) elements.chkRoleAnonEnabled.checked = cfg.anonymous.enabled !== false;
    if (elements.selRoleAnonExpected) elements.selRoleAnonExpected.value = cfg.anonymous.expectedType || 'exact';
    if (elements.txtRoleAnonStatus) {
      elements.txtRoleAnonStatus.value = cfg.anonymous.expectedStatus || 401;
      elements.txtRoleAnonStatus.style.display = cfg.anonymous.expectedType === 'exact' ? '' : 'none';
    }

    // Render results
    renderRolesResults(tab);
  }

  function syncRolesConfigFromUi() {
    const tab = getActiveTab();
    if (!tab) return;
    if (!tab.roleTesting) tab.roleTesting = defaultRoleTestingConfig();

    const cfg = tab.roleTesting;

    // ADMIN
    if (elements.chkRoleAdminEnabled) cfg.admin.enabled = elements.chkRoleAdminEnabled.checked;
    if (elements.selRoleAdminExpected) cfg.admin.expectedType = elements.selRoleAdminExpected.value;
    if (elements.txtRoleAdminStatus) cfg.admin.expectedStatus = parseInt(elements.txtRoleAdminStatus.value, 10) || null;
    if (elements.selRoleAdminAuth) cfg.admin.authType = elements.selRoleAdminAuth.value;
    if (elements.txtRoleAdminToken) {
      const val = elements.txtRoleAdminToken.value.trim();
      cfg.admin.token = val;
      if (/^\{\{[a-zA-Z0-9_.-]+\}\}$/.test(val)) {
        cfg.admin.tokenEnvVar = val;
      }
    }
    if (elements.txtRoleAdminHeaderKey) cfg.admin.customHeaderKey = elements.txtRoleAdminHeaderKey.value.trim() || 'Authorization';

    // USER
    if (elements.chkRoleUserEnabled) cfg.user.enabled = elements.chkRoleUserEnabled.checked;
    if (elements.selRoleUserExpected) cfg.user.expectedType = elements.selRoleUserExpected.value;
    if (elements.txtRoleUserStatus) cfg.user.expectedStatus = parseInt(elements.txtRoleUserStatus.value, 10) || null;
    if (elements.selRoleUserAuth) cfg.user.authType = elements.selRoleUserAuth.value;
    if (elements.txtRoleUserToken) {
      const val = elements.txtRoleUserToken.value.trim();
      cfg.user.token = val;
      if (/^\{\{[a-zA-Z0-9_.-]+\}\}$/.test(val)) {
        cfg.user.tokenEnvVar = val;
      }
    }
    if (elements.txtRoleUserHeaderKey) cfg.user.customHeaderKey = elements.txtRoleUserHeaderKey.value.trim() || 'Authorization';

    // Anonymous
    if (elements.chkRoleAnonEnabled) cfg.anonymous.enabled = elements.chkRoleAnonEnabled.checked;
    if (elements.selRoleAnonExpected) cfg.anonymous.expectedType = elements.selRoleAnonExpected.value;
    if (elements.txtRoleAnonStatus) cfg.anonymous.expectedStatus = parseInt(elements.txtRoleAnonStatus.value, 10) || null;

    updateUnsavedIndicator();
  }

  function renderRolesResults(tab) {
    if (!elements.rolesResultsTableContainer) return;

    const results = tab.roleResults;
    if (!results || !results.roles) {
      elements.rolesResultsTableContainer.innerHTML = `
        <div class="roles-empty-state" id="roles-empty-state">
          Configure tokens above and click <strong>Run Role Tests</strong> to verify Spring Security permissions across ADMIN, USER, and Anonymous users.
        </div>
      `;
      if (elements.rolesSummaryBar) elements.rolesSummaryBar.hidden = true;
      if (elements.rolesBadgeSummary) elements.rolesBadgeSummary.hidden = true;
      return;
    }

    const summary = results.summary;

    // Update summary bar
    if (elements.rolesSummaryBar && elements.rolesSummaryBadge) {
      elements.rolesSummaryBar.hidden = false;
      elements.rolesSummaryBadge.textContent = summary.statusLabel;
      if (summary.failed > 0 || summary.error > 0) {
        elements.rolesSummaryBadge.className = 'test-badge-summary has-failures';
      } else if (summary.allPassed) {
        elements.rolesSummaryBadge.className = 'test-badge-summary';
      } else {
        elements.rolesSummaryBadge.className = 'test-badge-summary';
      }
    }

    if (elements.rolesBadgeSummary) {
      elements.rolesBadgeSummary.hidden = false;
      elements.rolesBadgeSummary.textContent = summary.passed + '/' + summary.total;
    }

    if (elements.rolesResultsTimestamp) {
      elements.rolesResultsTimestamp.textContent = 'Last executed at ' + new Date(results.timestamp).toLocaleTimeString();
    }

    const roleOrder = ['admin', 'user', 'anonymous'];
    let rowsHtml = '';

    for (const rKey of roleOrder) {
      const roleData = results.roles[rKey];
      if (!roleData) continue;

      const isEnabled = roleData.enabled !== false;
      let tagClass = 'role-tag-anon';
      if (rKey === 'admin') tagClass = 'role-tag-admin';
      else if (rKey === 'user') tagClass = 'role-tag-user';

      let pillClass = 'role-pill-skipped';
      let pillText = 'SKIPPED';

      if (roleData.result === 'PASS') {
        pillClass = 'role-pill-pass';
        pillText = 'PASS';
      } else if (roleData.result === 'FAIL') {
        pillClass = 'role-pill-fail';
        pillText = 'FAIL';
      } else if (roleData.result === 'ERROR') {
        pillClass = 'role-pill-error';
        pillText = 'ERROR';
      } else if (roleData.result === 'INFO') {
        pillClass = 'role-pill-info';
        pillText = 'INFO';
      }

      // Expected display
      let expectedStr = 'None';
      if (roleData.expectedType === 'exact') {
        expectedStr = 'Status ' + (roleData.expectedStatus || '---');
      } else if (roleData.expectedType === '2xx') {
        expectedStr = '2xx Success';
      } else if (roleData.expectedType === 'denied') {
        expectedStr = '401/403 Denied';
      }

      // Actual status display
      let actualStatusStr = '<span style="color: var(--text-muted);">---</span>';
      if (roleData.status) {
        const is2xx = roleData.status >= 200 && roleData.status < 300;
        const is4xx = roleData.status >= 400 && roleData.status < 500;
        const color = is2xx ? '#4ade80' : (is4xx ? '#fbbf24' : '#f87171');
        actualStatusStr = `<strong style="color: ${color}; font-family: var(--font-mono);">${roleData.status} ${escapeHtml(roleData.statusText || '')}</strong>`;
      } else if (roleData.error) {
        actualStatusStr = `<span style="color: #f87171;">Error: ${escapeHtml(roleData.error.message || 'Network failure')}</span>`;
      }

      const durationStr = isEnabled && roleData.status ? `${roleData.durationMs || 0} ms` : '---';

      const hasExplanation = roleData.explanation && roleData.explanation.title;

      rowsHtml += `
        <tr class="role-matrix-row" data-role="${rKey}">
          <td>
            <span class="role-tag ${tagClass}">${roleData.label}</span>
          </td>
          <td style="font-size: 11px; color: var(--text-muted);">
            ${escapeHtml(expectedStr)}
          </td>
          <td>
            ${actualStatusStr}
          </td>
          <td style="font-family: var(--font-mono); font-size: 11px;">
            ${durationStr}
          </td>
          <td>
            <span class="role-pill ${pillClass}">${pillText}</span>
          </td>
          <td>
            <div class="role-actions-cell">
              ${isEnabled && roleData.response ? `<button type="button" class="btn-role-action btn-inspect-role" data-role="${rKey}">Inspect</button>` : ''}
              ${hasExplanation ? `<button type="button" class="btn-role-action btn-role-explain" data-role="${rKey}" title="Explain this error using Spring Error Explainer">Explain Error</button>` : ''}
            </div>
          </td>
        </tr>
        <tr class="role-details-row" id="role-details-${rKey}" hidden>
          <td colspan="6">
            <div class="role-expanded-content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-weight: 600; font-size: 11px; color: var(--text-muted);">${roleData.label} Response Payload:</span>
                <span style="font-size: 10px; color: var(--text-muted);">${roleData.message || ''}</span>
              </div>
              <div class="role-expanded-body">${escapeHtml(roleData.response?.body || (roleData.error?.message || 'No response body'))}</div>
              ${hasExplanation ? `
                <div style="margin-top: 6px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                  <strong style="color: #f87171; font-size: 11px;">${escapeHtml(roleData.explanation.title)}</strong>
                  <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--text-secondary);">${escapeHtml(roleData.explanation.whatHappened)}</p>
                </div>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }

    elements.rolesResultsTableContainer.innerHTML = `
      <table class="roles-table">
        <thead>
          <tr>
            <th>Identity</th>
            <th>Expected</th>
            <th>Actual Status</th>
            <th>Duration</th>
            <th>Result</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    // Bind inspect and explain actions
    elements.rolesResultsTableContainer.querySelectorAll('.btn-inspect-role').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roleKey = e.currentTarget.getAttribute('data-role');
        const detailRow = document.getElementById('role-details-' + roleKey);
        if (detailRow) {
          const isHidden = detailRow.hidden;
          detailRow.hidden = !isHidden;
          btn.textContent = isHidden ? 'Hide' : 'Inspect';
        }
      });
    });

    elements.rolesResultsTableContainer.querySelectorAll('.btn-role-explain').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const roleKey = e.currentTarget.getAttribute('data-role');
        const roleData = results.roles[roleKey];
        if (roleData && roleData.response) {
          // Load this role's response into the active tab and switch to Explain tab!
          tab.response = roleData.response;
          tab.responseState = 'success';
          renderResponseWorkspace();
          switchResponseSubtab('explain');
          showToast(`Viewing Spring Error Explanation for ${roleData.label}`, 'info');
        }
      });
    });
  }

  async function handleRunRoleTests() {
    console.log("[Renderer Debug] handleRunRoleTests called! tab:", getActiveTab()?.id, "elements.btnRunRoles:", !!elements.btnRunRoles);
    const tab = getActiveTab();
    if (!tab) return;

    if (elements.inputUrl && elements.inputUrl.value) {
      tab.url = elements.inputUrl.value.trim();
    }

    if (!tab.url || !tab.url.trim()) {
      console.log("[Renderer Debug] URL was empty! tab.url:", tab.url, "elements.inputUrl.value:", elements.inputUrl?.value);
      showToast('Please enter a Request URL first', 'error');
      return;
    }

    syncRolesConfigFromUi();

    if (!elements.btnRunRoles) return;

    const originalBtnHtml = elements.btnRunRoles.innerHTML;
    elements.btnRunRoles.disabled = true;
    elements.btnRunRoles.innerHTML = '<span class="spinner-sm"></span> <span>Running...</span>';

    try {
      const payload = {
        baseRequest: {
          method: tab.method,
          url: tab.url,
          params: tab.params,
          headers: tab.headers,
          body: tab.body,
          timeoutMs: state.settings?.requestTimeoutMs || 15000
        },
        roles: tab.roleTesting,
        envVariables: getActiveEnvironmentVariables()
      };

      console.log("[Renderer Debug] calling window.apiForge.runRoleMatrix with payload:", JSON.stringify(payload));
      const result = await window.apiForge.runRoleMatrix(payload);
      console.log("[Renderer Debug] runRoleMatrix result:", JSON.stringify(result));
      tab.roleResults = result;
      renderRolesResults(tab);

      const summary = result.summary;
      if (summary.failed > 0) {
        showToast(`Role Matrix: ${summary.failed} checks failed`, 'warning');
      } else if (summary.allPassed) {
        showToast(`Role Matrix: All ${summary.passed} checks passed!`, 'success');
      } else {
        showToast('Role Matrix completed', 'info');
      }
    } catch (err) {
      showToast('Role matrix failed: ' + err.message, 'error');
    } finally {
      elements.btnRunRoles.disabled = false;
      elements.btnRunRoles.innerHTML = originalBtnHtml;
    }
  }

  function bindRolesEventListeners() {
    // Run Role Tests button
    if (elements.btnRunRoles) {
      elements.btnRunRoles.addEventListener('click', handleRunRoleTests);
    }

    // Role subtab button
    if (elements.tabRoles) {
      elements.tabRoles.addEventListener('click', () => {
        switchRequestSubtab('roles');
      });
    }

    // Password mask toggles
    if (elements.btnToggleAdminToken && elements.txtRoleAdminToken) {
      elements.btnToggleAdminToken.addEventListener('click', () => {
        const isPassword = elements.txtRoleAdminToken.type === 'password';
        elements.txtRoleAdminToken.type = isPassword ? 'text' : 'password';
      });
    }
    if (elements.btnToggleUserToken && elements.txtRoleUserToken) {
      elements.btnToggleUserToken.addEventListener('click', () => {
        const isPassword = elements.txtRoleUserToken.type === 'password';
        elements.txtRoleUserToken.type = isPassword ? 'text' : 'password';
      });
    }

    // Auth selector change handlers
    if (elements.selRoleAdminAuth) {
      elements.selRoleAdminAuth.addEventListener('change', (e) => {
        if (elements.roleAdminCustomHeaderRow) {
          elements.roleAdminCustomHeaderRow.hidden = e.target.value !== 'header';
        }
        syncRolesConfigFromUi();
      });
    }
    if (elements.selRoleUserAuth) {
      elements.selRoleUserAuth.addEventListener('change', (e) => {
        if (elements.roleUserCustomHeaderRow) {
          elements.roleUserCustomHeaderRow.hidden = e.target.value !== 'header';
        }
        syncRolesConfigFromUi();
      });
    }

    // Expected rule change handlers
    if (elements.selRoleAdminExpected) {
      elements.selRoleAdminExpected.addEventListener('change', (e) => {
        if (elements.txtRoleAdminStatus) {
          elements.txtRoleAdminStatus.style.display = e.target.value === 'exact' ? '' : 'none';
        }
        syncRolesConfigFromUi();
      });
    }
    if (elements.selRoleUserExpected) {
      elements.selRoleUserExpected.addEventListener('change', (e) => {
        if (elements.txtRoleUserStatus) {
          elements.txtRoleUserStatus.style.display = e.target.value === 'exact' ? '' : 'none';
        }
        syncRolesConfigFromUi();
      });
    }
    if (elements.selRoleAnonExpected) {
      elements.selRoleAnonExpected.addEventListener('change', (e) => {
        if (elements.txtRoleAnonStatus) {
          elements.txtRoleAnonStatus.style.display = e.target.value === 'exact' ? '' : 'none';
        }
        syncRolesConfigFromUi();
      });
    }

    // Input blur/change handlers to sync
    [
      elements.chkRoleAdminEnabled, elements.txtRoleAdminStatus, elements.txtRoleAdminToken, elements.txtRoleAdminHeaderKey,
      elements.chkRoleUserEnabled, elements.txtRoleUserStatus, elements.txtRoleUserToken, elements.txtRoleUserHeaderKey,
      elements.chkRoleAnonEnabled, elements.txtRoleAnonStatus
    ].forEach(el => {
      if (el) {
        el.addEventListener('change', syncRolesConfigFromUi);
        el.addEventListener('input', syncRolesConfigFromUi);
      }
    });
  }

  
  // ==========================================================================
  // Environment Management & Variable Substitution System
  // ==========================================================================

  const DEFAULT_ENVIRONMENTS = [
    {
      id: 'env_local',
      name: 'Local Spring Boot',
      isDefault: true,
      variables: [
        { key: 'baseUrl', value: 'http://localhost:8080', enabled: true },
        { key: 'ADMIN_TOKEN', value: '', enabled: true },
        { key: 'USER_TOKEN', value: '', enabled: true }
      ]
    }
  ];

  function substituteVariables(text, envVars = {}) {
    if (typeof text !== 'string' || !text.includes('{{')) return typeof text === 'string' ? text : '';
    return text.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, varName) => {
      if (envVars && Object.prototype.hasOwnProperty.call(envVars, varName)) {
        return String(envVars[varName]);
      }
      return match;
    });
  }

  function loadEnvironments() {
    try {
      const stored = localStorage.getItem('apiforge_environments');
      if (stored) {
        const parsed = JSON.parse(stored);
        state.environments = Array.isArray(parsed) && parsed.length > 0 ? parsed : JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENTS));
      } else {
        state.environments = JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENTS));
        saveEnvironments();
      }
      const activeId = localStorage.getItem('apiforge_active_env_id');
      state.activeEnvironmentId = state.environments.some(e => e.id === activeId)
        ? activeId
        : (state.environments[0]?.id || null);
      state.selectedEnvIdForEdit = state.activeEnvironmentId || state.environments[0]?.id || null;
      updateEnvironmentUI();
    } catch (e) {
      console.warn('[Renderer] Failed to load environments:', e);
      state.environments = JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENTS));
      state.activeEnvironmentId = state.environments[0]?.id || null;
      state.selectedEnvIdForEdit = state.activeEnvironmentId;
      updateEnvironmentUI();
    }
  }

  function saveEnvironments() {
    try {
      localStorage.setItem('apiforge_environments', JSON.stringify(state.environments));
      if (state.activeEnvironmentId) {
        localStorage.setItem('apiforge_active_env_id', state.activeEnvironmentId);
      }
      updateEnvironmentUI();
    } catch (e) {
      console.warn('[Renderer] Failed to save environments:', e);
    }
  }

  function getActiveEnvironment() {
    return state.environments.find(e => e.id === state.activeEnvironmentId) || null;
  }

  function getActiveEnvironmentVariables() {
    const active = getActiveEnvironment();
    if (!active || !Array.isArray(active.variables)) return {};
    const vars = {};
    active.variables.forEach(v => {
      if (v.key && v.key.trim() && v.enabled !== false) {
        vars[v.key.trim()] = v.value != null ? String(v.value) : '';
      }
    });
    return vars;
  }

  function updateEnvironmentUI() {
    const active = getActiveEnvironment();
    if (elements.envActiveName) {
      elements.envActiveName.textContent = active ? active.name : 'No Environment';
    }
    if (elements.envDot) {
      if (active) {
        elements.envDot.classList.add('active');
      } else {
        elements.envDot.classList.remove('active');
      }
    }
    if (elements.envCountBadge) {
      const vars = getActiveEnvironmentVariables();
      const count = Object.keys(vars).length;
      elements.envCountBadge.textContent = String(count);
      elements.envCountBadge.hidden = count === 0;
    }
  }

  function openEnvironmentsModal() {
    if (!state.selectedEnvIdForEdit) {
      state.selectedEnvIdForEdit = state.activeEnvironmentId || state.environments[0]?.id || null;
    }
    renderEnvironmentsModal();
    openModal(elements.modalEnvironments);
  }

  function renderEnvironmentsModal() {
    if (!elements.modalEnvironments || elements.modalEnvironments.hidden) return;

    // Render environment sidebar list
    if (elements.envList) {
      elements.envList.innerHTML = '';
      state.environments.forEach(env => {
        const li = document.createElement('li');
        li.className = 'env-list-item' + (env.id === state.selectedEnvIdForEdit ? ' selected' : '');
        li.innerHTML = `
          <span class="env-item-name">${escapeHtml(env.name)}</span>
          ${env.id === state.activeEnvironmentId ? '<span class="env-active-chip">Active</span>' : ''}
        `;
        li.addEventListener('click', () => {
          state.selectedEnvIdForEdit = env.id;
          renderEnvironmentsModal();
        });
        elements.envList.appendChild(li);
      });
    }

    // Render selected environment details
    const current = state.environments.find(e => e.id === state.selectedEnvIdForEdit);
    if (!current) return;

    if (elements.inputEnvName) {
      elements.inputEnvName.value = current.name || '';
      elements.inputEnvName.oninput = (e) => {
        current.name = e.target.value.trim() || 'Untitled Environment';
        saveEnvironments();
        // Update item name in list without full rerender
        const selectedLi = elements.envList?.querySelector('.env-list-item.selected .env-item-name');
        if (selectedLi) selectedLi.textContent = current.name;
      };
    }

    if (elements.btnSetActiveEnv) {
      elements.btnSetActiveEnv.disabled = current.id === state.activeEnvironmentId;
      elements.btnSetActiveEnv.textContent = current.id === state.activeEnvironmentId ? 'Active' : 'Set Active';
      elements.btnSetActiveEnv.onclick = () => {
        state.activeEnvironmentId = current.id;
        saveEnvironments();
        renderEnvironmentsModal();
        showToast(`Environment "${current.name}" is now active`, 'success');
      };
    }

    if (elements.btnDeleteEnv) {
      elements.btnDeleteEnv.disabled = state.environments.length <= 1;
      elements.btnDeleteEnv.onclick = () => {
        if (state.environments.length <= 1) {
          showToast('Cannot delete the only remaining environment', 'warning');
          return;
        }
        const delIdx = state.environments.findIndex(e => e.id === current.id);
        if (delIdx !== -1) {
          const removedName = current.name;
          state.environments.splice(delIdx, 1);
          if (state.activeEnvironmentId === current.id) {
            state.activeEnvironmentId = state.environments[0]?.id || null;
          }
          state.selectedEnvIdForEdit = state.environments[0]?.id || null;
          saveEnvironments();
          renderEnvironmentsModal();
          showToast(`Environment "${removedName}" deleted`, 'info');
        }
      };
    }

    // Render variables table
    if (elements.envVarsTbody) {
      elements.envVarsTbody.innerHTML = '';
      if (!Array.isArray(current.variables)) current.variables = [];

      current.variables.forEach((v, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="col-check">
            <input type="checkbox" class="kv-checkbox" ${v.enabled !== false ? 'checked' : ''} title="Toggle variable" />
          </td>
          <td class="col-key">
            <input type="text" class="kv-input kv-key" value="${escapeHtml(v.key || '')}" placeholder="Variable key" />
          </td>
          <td class="col-val">
            <input type="text" class="kv-input kv-val" value="${escapeHtml(v.value || '')}" placeholder="Variable value" />
          </td>
          <td class="col-act">
            <button type="button" class="btn-icon-xs btn-remove-row" title="Delete variable">&times;</button>
          </td>
        `;

        const chk = tr.querySelector('.kv-checkbox');
        const keyInput = tr.querySelector('.kv-key');
        const valInput = tr.querySelector('.kv-val');
        const btnRemove = tr.querySelector('.btn-remove-row');

        chk.addEventListener('change', () => {
          v.enabled = chk.checked;
          saveEnvironments();
        });

        keyInput.addEventListener('input', () => {
          v.key = keyInput.value.trim();
          saveEnvironments();
        });

        valInput.addEventListener('input', () => {
          v.value = valInput.value;
          saveEnvironments();
        });

        btnRemove.addEventListener('click', () => {
          current.variables.splice(idx, 1);
          saveEnvironments();
          renderEnvironmentsModal();
        });

        elements.envVarsTbody.appendChild(tr);
      });
    }
  }

  function addNewEnvironment() {
    const newEnv = {
      id: 'env_' + Date.now(),
      name: 'New Environment',
      variables: [
        { key: 'baseUrl', value: 'http://localhost:8080', enabled: true }
      ]
    };
    state.environments.push(newEnv);
    state.selectedEnvIdForEdit = newEnv.id;
    saveEnvironments();
    renderEnvironmentsModal();
    if (elements.inputEnvName) {
      elements.inputEnvName.focus();
      elements.inputEnvName.select();
    }
    showToast('New environment created', 'success');
  }

  function addNewEnvironmentVariable() {
    const current = state.environments.find(e => e.id === state.selectedEnvIdForEdit);
    if (!current) return;
    if (!Array.isArray(current.variables)) current.variables = [];
    current.variables.push({ key: '', value: '', enabled: true });
    saveEnvironments();
    renderEnvironmentsModal();
    const lastRowKey = elements.envVarsTbody?.querySelector('tr:last-child .kv-key');
    if (lastRowKey) lastRowKey.focus();
  }

  function bindEvents() {
    bindRolesEventListeners();

    // Step 8: Spring Boot Error Explainer Listeners
    if (elements.btnExplainError) {
      elements.btnExplainError.addEventListener('click', () => {
        switchResponseSubtab('explain');
      });
    }
    if (elements.resptabExplain) {
      elements.resptabExplain.addEventListener('click', () => {
        switchResponseSubtab('explain');
      });
    }

    // Step 7: OpenAPI Import Listeners
    if (elements.btnImportOpenApi) {
      elements.btnImportOpenApi.addEventListener('click', openOpenApiModal);
    }
    if (elements.btnCloseOpenApiModal) {
      elements.btnCloseOpenApiModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCancelOpenApi) {
      elements.btnCancelOpenApi.addEventListener('click', closeActiveModal);
    }
    if (elements.openapiTabUrl) {
      elements.openapiTabUrl.addEventListener('click', () => switchOpenApiSourceTab('url'));
    }
    if (elements.openapiTabFile) {
      elements.openapiTabFile.addEventListener('click', () => switchOpenApiSourceTab('file'));
    }
    if (elements.btnFetchOpenApiUrl) {
      elements.btnFetchOpenApiUrl.addEventListener('click', handleFetchOpenApiFromUrl);
    }
    if (elements.inputOpenApiUrl) {
      elements.inputOpenApiUrl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleFetchOpenApiFromUrl();
        }
      });
    }
    if (elements.btnBrowseOpenApiFile) {
      elements.btnBrowseOpenApiFile.addEventListener('click', handleBrowseOpenApiFile);
    }
    if (elements.btnOpenApiSelectAll) {
      elements.btnOpenApiSelectAll.addEventListener('click', () => {
        if (!openApiImportState.parsedSpec) return;
        openApiImportState.parsedSpec.endpoints.forEach(e => openApiImportState.selectedEndpointIds.add(e.id));
        renderOpenApiEndpointsList();
      });
    }
    if (elements.btnOpenApiDeselectAll) {
      elements.btnOpenApiDeselectAll.addEventListener('click', () => {
        openApiImportState.selectedEndpointIds.clear();
        renderOpenApiEndpointsList();
      });
    }
    if (elements.inputOpenApiFilter) {
      elements.inputOpenApiFilter.addEventListener('input', (e) => {
        openApiImportState.filterText = e.target.value;
        renderOpenApiEndpointsList();
      });
    }
    if (elements.btnConfirmOpenApiImport) {
      elements.btnConfirmOpenApiImport.addEventListener('click', handleConfirmOpenApiImport);
    }

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
        const tabName = btn.getAttribute('data-resptab') || btn.getAttribute('data-resp-tab');
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
      elements.btnCopyResponse.addEventListener('click', (e) => {
        e.stopPropagation();
        const tab = getActiveTab();
        if (tab && tab.response && tab.response.body) {
          copyText(tab.response.body, 'Copied response body');
        } else {
          showToast('No response body to copy', 'info');
        }
      });
    }

    // Isolate mouse events in response body to prevent bubbling or container interference
    if (elements.responseBodyPre) {
      elements.responseBodyPre.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      elements.responseBodyPre.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });
    }

    // Ensure Ctrl+C or clipboard copy copies ONLY the selected text
    document.addEventListener('copy', (e) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString();
      if (selectedText) {
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', selectedText);
          e.preventDefault();
        }
      }
    });
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

    
    // Environment Manager Event Listeners
    if (elements.navEnvironments) {
      elements.navEnvironments.addEventListener('click', openEnvironmentsModal);
    }
    if (elements.envSelector) {
      elements.envSelector.addEventListener('click', openEnvironmentsModal);
    }
    if (elements.btnCloseEnvModal) {
      elements.btnCloseEnvModal.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCloseEnvDone) {
      elements.btnCloseEnvDone.addEventListener('click', closeActiveModal);
    }
    if (elements.btnCreateEnv) {
      elements.btnCreateEnv.addEventListener('click', addNewEnvironment);
    }
    if (elements.btnAddEnvVar) {
      elements.btnAddEnvVar.addEventListener('click', addNewEnvironmentVariable);
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

    // Step 6: Automated Testing Event Bindings
    if (elements.btnAddTest) {
      elements.btnAddTest.addEventListener('click', () => {
        addTestAssertion('status_code', { targetStatusCode: 200 });
      });
    }

    if (elements.btnRunTests) {
      elements.btnRunTests.addEventListener('click', () => {
        runTabTests();
      });
    }

    if (elements.chkAutorunTests) {
      elements.chkAutorunTests.addEventListener('change', (e) => {
        const tab = getActiveTab();
        if (tab) {
          tab.autoRunTests = e.target.checked;
        }
      });
    }

    // Quick presets
    if (elements.btnPresetStatus200) {
      elements.btnPresetStatus200.addEventListener('click', () => {
        addTestAssertion('status_code', { targetStatusCode: 200 });
      });
    }
    if (elements.btnPresetTime1000) {
      elements.btnPresetTime1000.addEventListener('click', () => {
        addTestAssertion('response_time', { maxDurationMs: 1000 });
      });
    }
    if (elements.btnPresetJsonProp) {
      elements.btnPresetJsonProp.addEventListener('click', () => {
        addTestAssertion('json_body', { property: '$.status', checkType: 'equals', expectedValue: 'success' });
      });
    }
    if (elements.btnPresetHeaderCt) {
      elements.btnPresetHeaderCt.addEventListener('click', () => {
        addTestAssertion('header', { headerName: 'Content-Type', checkType: 'exists' });
      });
    }
    if (elements.btnPresetContent) {
      elements.btnPresetContent.addEventListener('click', () => {
        addTestAssertion('content', { expectedContent: 'success', isCaseSensitive: false });
      });
    }

    // Response Tests Tab
    if (elements.resptabTests) {
      elements.resptabTests.addEventListener('click', () => {
        switchResponseSubtab('tests');
      });
    }

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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          const selectedText = selection.toString();
          if (selectedText && selectedText.length > 0) {
            // Text is selected: allow native copy event to copy only the selected text
            return;
          }
        }
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
  // Step 6: Automated API Testing Implementation
  // ==========================================================================

  function renderTestsTab() {
    const tab = getActiveTab();
    if (!tab) return;

    if (!Array.isArray(tab.tests)) {
      tab.tests = [];
    }

    // 1. Update subtab badge count
    if (elements.testsBadgeCount) {
      const activeCount = tab.tests.length;
      elements.testsBadgeCount.textContent = activeCount;
      elements.testsBadgeCount.hidden = activeCount === 0;
    }

    // 2. Update auto-run checkbox
    if (elements.chkAutorunTests) {
      elements.chkAutorunTests.checked = tab.autoRunTests !== false;
    }

    // 3. Update summary badge in toolbar
    if (elements.testsSummaryBar && elements.testsSummaryBadge) {
      if (tab.testResults && tab.testResults.total > 0) {
        elements.testsSummaryBar.hidden = false;
        elements.testsSummaryBadge.textContent = `${tab.testResults.passed}/${tab.testResults.total} Passed`;
        if (tab.testResults.failed > 0) {
          elements.testsSummaryBadge.classList.add('has-failures');
        } else {
          elements.testsSummaryBadge.classList.remove('has-failures');
        }
      } else {
        elements.testsSummaryBar.hidden = true;
      }
    }

    // 4. Update assertions list container
    if (!elements.testsList) return;

    if (tab.tests.length === 0) {
      elements.testsList.innerHTML = `
        <div class="tests-empty-state">
          <div class="tests-empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 13l2 2 4-4"></path>
            </svg>
          </div>
          <h4>No test assertions configured</h4>
          <p>Add assertions above to automatically validate HTTP status codes, response times, headers, JSON body values, or text content.</p>
        </div>
      `;
      return;
    }

    elements.testsList.innerHTML = '';
    tab.tests.forEach((test, idx) => {
      const card = document.createElement('div');
      card.className = `test-assertion-card ${test.enabled === false ? 'disabled' : ''}`;
      card.setAttribute('data-test-id', test.id || `test_${idx}`);

      // Match result if available
      const testResult = tab.testResults && tab.testResults.results
        ? tab.testResults.results.find(r => r.id === test.id) || tab.testResults.results[idx]
        : null;

      // Header row
      const headerRow = document.createElement('div');
      headerRow.className = 'test-card-header';

      headerRow.innerHTML = `
        <div class="test-card-header-left">
          <span class="test-index-badge">#${idx + 1}</span>
          <select class="test-type-select" data-index="${idx}" aria-label="Assertion type">
            <option value="status_code" ${test.type === 'status_code' ? 'selected' : ''}>Status Code</option>
            <option value="response_time" ${test.type === 'response_time' ? 'selected' : ''}>Response Time</option>
            <option value="json_body" ${test.type === 'json_body' ? 'selected' : ''}>JSON Body</option>
            <option value="header" ${test.type === 'header' ? 'selected' : ''}>Header</option>
            <option value="content" ${test.type === 'content' ? 'selected' : ''}>Body Content</option>
          </select>
        </div>
        <div class="test-card-header-right">
          <label class="test-enable-toggle" title="Enable or disable this assertion">
            <input type="checkbox" class="chk-test-enabled" data-index="${idx}" ${test.enabled !== false ? 'checked' : ''}>
            <span>Enabled</span>
          </label>
          <button type="button" class="btn-icon-xs btn-danger-xs btn-delete-test" data-index="${idx}" title="Delete assertion" aria-label="Delete assertion">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Body row based on type
      const bodyRow = document.createElement('div');
      bodyRow.className = 'test-card-body';

      switch (test.type || 'status_code') {
        case 'status_code':
          bodyRow.innerHTML = `
            <div class="test-field-group">
              <span class="test-field-label">Status code equals:</span>
              <input type="number" class="test-input test-input-number inp-status-code" data-index="${idx}" value="${test.targetStatusCode !== undefined ? test.targetStatusCode : 200}" min="100" max="599" step="1">
            </div>
          `;
          break;

        case 'response_time':
          bodyRow.innerHTML = `
            <div class="test-field-group">
              <span class="test-field-label">Response duration below:</span>
              <input type="number" class="test-input test-input-number inp-response-time" data-index="${idx}" value="${test.maxDurationMs !== undefined ? test.maxDurationMs : 1000}" min="1" step="50">
              <span class="test-field-label">ms</span>
            </div>
          `;
          break;

        case 'json_body':
          bodyRow.innerHTML = `
            <div class="test-field-group">
              <span class="test-field-label">Path:</span>
              <input type="text" class="test-input inp-json-prop" data-index="${idx}" placeholder="$.status" value="${escapeHtml(test.property || '')}">
            </div>
            <div class="test-field-group">
              <select class="test-operator-select sel-json-op" data-index="${idx}">
                <option value="equals" ${test.checkType !== 'exists' ? 'selected' : ''}>equals</option>
                <option value="exists" ${test.checkType === 'exists' ? 'selected' : ''}>exists</option>
              </select>
            </div>
            <div class="test-field-group inp-json-val-group" style="${test.checkType === 'exists' ? 'display:none;' : ''}">
              <span class="test-field-label">Value:</span>
              <input type="text" class="test-input inp-json-val" data-index="${idx}" placeholder="expected value" value="${escapeHtml(test.expectedValue !== undefined ? String(test.expectedValue) : '')}">
            </div>
          `;
          break;

        case 'header':
          bodyRow.innerHTML = `
            <div class="test-field-group">
              <span class="test-field-label">Header:</span>
              <input type="text" class="test-input inp-header-name" data-index="${idx}" placeholder="Content-Type" value="${escapeHtml(test.headerName || '')}">
            </div>
            <div class="test-field-group">
              <select class="test-operator-select sel-header-op" data-index="${idx}">
                <option value="exists" ${test.checkType === 'exists' ? 'selected' : ''}>exists</option>
                <option value="equals" ${test.checkType !== 'exists' ? 'selected' : ''}>equals</option>
              </select>
            </div>
            <div class="test-field-group inp-header-val-group" style="${test.checkType === 'exists' ? 'display:none;' : ''}">
              <span class="test-field-label">Value:</span>
              <input type="text" class="test-input inp-header-val" data-index="${idx}" placeholder="application/json" value="${escapeHtml(test.expectedValue !== undefined ? String(test.expectedValue) : '')}">
            </div>
          `;
          break;

        case 'content':
          bodyRow.innerHTML = `
            <div class="test-field-group" style="flex: 1;">
              <span class="test-field-label">Body contains:</span>
              <input type="text" class="test-input test-input-wide inp-content-text" data-index="${idx}" placeholder="text to search in body" value="${escapeHtml(test.expectedContent || '')}">
            </div>
            <div class="test-field-group">
              <label class="test-checkbox-label">
                <input type="checkbox" class="chk-content-case" data-index="${idx}" ${test.isCaseSensitive ? 'checked' : ''}>
                <span>Match Case</span>
              </label>
            </div>
          `;
          break;
      }

      card.appendChild(headerRow);
      card.appendChild(bodyRow);

      // Result banner (if run)
      if (testResult) {
        const resultBanner = document.createElement('div');
        resultBanner.className = `test-card-result ${testResult.pass ? 'pass' : 'fail'}`;
        resultBanner.innerHTML = `
          <span class="test-status-pill ${testResult.pass ? 'pass' : 'fail'}">${testResult.pass ? 'PASS' : 'FAIL'}</span>
          <div class="test-result-details">
            <span class="test-result-msg">${escapeHtml(testResult.message)}</span>
            <div class="test-result-diff">
              <span class="test-diff-expected">Expected: <strong>${escapeHtml(testResult.expected)}</strong></span>
              <span class="test-diff-actual">Actual: <strong>${escapeHtml(testResult.actual)}</strong></span>
            </div>
          </div>
        `;
        card.appendChild(resultBanner);
      }

      elements.testsList.appendChild(card);
    });

    bindTestCardListeners();
  }

  function bindTestCardListeners() {
    const tab = getActiveTab();
    if (!tab || !elements.testsList) return;

    // Type select
    elements.testsList.querySelectorAll('.test-type-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          const newType = e.target.value;
          tab.tests[idx].type = newType;
          if (newType === 'status_code' && tab.tests[idx].targetStatusCode === undefined) tab.tests[idx].targetStatusCode = 200;
          if (newType === 'response_time' && tab.tests[idx].maxDurationMs === undefined) tab.tests[idx].maxDurationMs = 1000;
          if (newType === 'json_body' && !tab.tests[idx].property) { tab.tests[idx].property = '$.status'; tab.tests[idx].checkType = 'equals'; tab.tests[idx].expectedValue = 'success'; }
          if (newType === 'header' && !tab.tests[idx].headerName) { tab.tests[idx].headerName = 'Content-Type'; tab.tests[idx].checkType = 'exists'; }
          if (newType === 'content' && tab.tests[idx].expectedContent === undefined) tab.tests[idx].expectedContent = '';
          updateUnsavedIndicator();
          renderTestsTab();
        }
      });
    });

    // Enabled toggle
    elements.testsList.querySelectorAll('.chk-test-enabled').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].enabled = e.target.checked;
          updateUnsavedIndicator();
          renderTestsTab();
        }
      });
    });

    // Delete test
    elements.testsList.querySelectorAll('.btn-delete-test').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests.splice(idx, 1);
          updateUnsavedIndicator();
          renderTestsTab();
          showToast('Assertion removed', 'info');
        }
      });
    });

    // Status code input
    elements.testsList.querySelectorAll('.inp-status-code').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].targetStatusCode = parseInt(e.target.value, 10);
          updateUnsavedIndicator();
        }
      });
    });

    // Response time input
    elements.testsList.querySelectorAll('.inp-response-time').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].maxDurationMs = parseInt(e.target.value, 10);
          updateUnsavedIndicator();
        }
      });
    });

    // JSON body inputs
    elements.testsList.querySelectorAll('.inp-json-prop').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].property = e.target.value;
          updateUnsavedIndicator();
        }
      });
    });

    elements.testsList.querySelectorAll('.sel-json-op').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].checkType = e.target.value;
          const card = e.target.closest('.test-assertion-card');
          const valGroup = card ? card.querySelector('.inp-json-val-group') : null;
          if (valGroup) {
            valGroup.style.display = e.target.value === 'exists' ? 'none' : 'inline-flex';
          }
          updateUnsavedIndicator();
        }
      });
    });

    elements.testsList.querySelectorAll('.inp-json-val').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].expectedValue = e.target.value;
          updateUnsavedIndicator();
        }
      });
    });

    // Header inputs
    elements.testsList.querySelectorAll('.inp-header-name').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].headerName = e.target.value;
          updateUnsavedIndicator();
        }
      });
    });

    elements.testsList.querySelectorAll('.sel-header-op').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].checkType = e.target.value;
          const card = e.target.closest('.test-assertion-card');
          const valGroup = card ? card.querySelector('.inp-header-val-group') : null;
          if (valGroup) {
            valGroup.style.display = e.target.value === 'exists' ? 'none' : 'inline-flex';
          }
          updateUnsavedIndicator();
        }
      });
    });

    elements.testsList.querySelectorAll('.inp-header-val').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].expectedValue = e.target.value;
          updateUnsavedIndicator();
        }
      });
    });

    // Content inputs
    elements.testsList.querySelectorAll('.inp-content-text').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].expectedContent = e.target.value;
          updateUnsavedIndicator();
        }
      });
    });

    elements.testsList.querySelectorAll('.chk-content-case').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (tab.tests[idx]) {
          tab.tests[idx].isCaseSensitive = e.target.checked;
          updateUnsavedIndicator();
        }
      });
    });
  }

  function addTestAssertion(type = 'status_code', defaults = {}) {
    const tab = getActiveTab();
    if (!tab) return;
    if (!Array.isArray(tab.tests)) tab.tests = [];

    const newTest = {
      id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      enabled: true,
      targetStatusCode: defaults.targetStatusCode !== undefined ? defaults.targetStatusCode : 200,
      maxDurationMs: defaults.maxDurationMs !== undefined ? defaults.maxDurationMs : 1000,
      property: defaults.property || '$.status',
      checkType: defaults.checkType || (type === 'header' ? 'exists' : 'equals'),
      expectedValue: defaults.expectedValue !== undefined ? defaults.expectedValue : (type === 'json_body' ? 'success' : ''),
      headerName: defaults.headerName || 'Content-Type',
      expectedContent: defaults.expectedContent !== undefined ? defaults.expectedContent : '',
      isCaseSensitive: Boolean(defaults.isCaseSensitive)
    };

    tab.tests.push(newTest);
    updateUnsavedIndicator();
    renderTestsTab();
    showToast(`Added ${formatTestTypeName(type)} assertion`, 'info');
  }

  function formatTestTypeName(type) {
    switch (type) {
      case 'status_code': return 'Status Code';
      case 'response_time': return 'Response Time';
      case 'json_body': return 'JSON Body';
      case 'header': return 'Header';
      case 'content': return 'Body Content';
      default: return 'Test';
    }
  }

  async function runTabTests(tab = getActiveTab()) {
    if (!tab) return;
    if (!window.apiForge || !window.apiForge.evaluateTests) return;

    if (!Array.isArray(tab.tests) || tab.tests.length === 0) {
      showToast('No test assertions configured to run', 'info');
      return;
    }

    let responseCtx = null;
    if (tab.response && typeof tab.response.status === 'number') {
      responseCtx = {
        status: tab.response.status,
        timeMs: tab.response.timeMs || 0,
        headers: tab.response.headers || {},
        body: typeof tab.response.body === 'string' ? tab.response.body : '',
        isNetworkError: false
      };
    } else if (tab.responseState === 'error') {
      responseCtx = {
        status: null,
        timeMs: 0,
        headers: {},
        body: '',
        isNetworkError: true,
        errorMessage: tab.error?.message || 'Network error'
      };
    } else {
      showToast('Please send the request first to evaluate assertions against its response', 'info');
      return;
    }

    try {
      const suiteResult = await window.apiForge.evaluateTests(tab.tests, responseCtx);
      tab.testResults = suiteResult;

      renderTestsTab();
      renderResponseTestsPanel();

      if (elements.respTestsBadge) {
        elements.respTestsBadge.textContent = `${suiteResult.passed}/${suiteResult.total}`;
        elements.respTestsBadge.hidden = false;
        if (suiteResult.failed > 0) {
          elements.respTestsBadge.style.background = 'var(--color-error)';
        } else {
          elements.respTestsBadge.style.background = 'var(--color-success)';
        }
      }

      if (suiteResult.allPassed) {
        showToast(`All ${suiteResult.total} assertions passed!`, 'success');
      } else {
        showToast(`Assertions: ${suiteResult.passed} passed, ${suiteResult.failed} failed`, 'warning');
      }
    } catch (err) {
      console.error('[ApiForge Lite] Error evaluating tests:', err);
      showToast('Failed to evaluate tests: ' + err.message, 'error');
    }
  }

  function renderResponseTestsPanel() {
    const tab = getActiveTab();
    if (!tab || !elements.respTestsResultsContainer) return;

    if (!tab.testResults || tab.testResults.total === 0) {
      elements.respTestsResultsContainer.innerHTML = `
        <div class="tests-empty-state">
          <h4>No test results available</h4>
          <p>Add assertions under the request "Tests" tab and send the request or click "Run Tests".</p>
        </div>
      `;
      return;
    }

    const { total, passed, failed, results } = tab.testResults;

    let html = `
      <div class="resp-tests-overview-card">
        <span class="resp-overview-title">Test Results Summary</span>
        <div class="resp-overview-counts">
          <span class="resp-count-chip passed">${passed} Passed</span>
          ${failed > 0 ? `<span class="resp-count-chip failed">${failed} Failed</span>` : ''}
          <span class="resp-count-chip">${total} Total</span>
        </div>
      </div>
      <div class="resp-tests-list">
    `;

    results.forEach((r) => {
      html += `
        <div class="resp-test-row ${r.pass ? 'pass' : 'fail'}">
          <span class="test-status-pill ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</span>
          <div class="test-result-details">
            <span class="test-result-msg"><strong>${escapeHtml(r.description)}</strong> — ${escapeHtml(r.message)}</span>
            <div class="test-result-diff">
              <span class="test-diff-expected">Expected: <strong>${escapeHtml(r.expected)}</strong></span>
              <span class="test-diff-actual">Actual: <strong>${escapeHtml(r.actual)}</strong></span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    elements.respTestsResultsContainer.innerHTML = html;
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
        if (elements.historyPanel) {
          elements.historyPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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

  
  // ==========================================================================
  // Spring Boot OpenAPI Endpoint Discovery & Sidebar Integration
  // ==========================================================================
  let discoveredEndpointsData = [];
  const collapsedPathGroups = new Set();
  let activeSelectedEndpointKey = null;

  async function discoverSpringBootEndpoints(silent = false) {
    const listContainer = document.getElementById('endpoints-list-container');
    const loadingEl = document.getElementById('endpoints-loading');
    const errorEl = document.getElementById('endpoints-error');
    const errorTextEl = document.getElementById('endpoints-error-text');
    const treeEl = document.getElementById('endpoints-tree');
    const countBadge = document.getElementById('endpoints-count-badge');

    if (loadingEl) loadingEl.hidden = false;
    if (errorEl) errorEl.hidden = true;
    if (treeEl) treeEl.innerHTML = '';

    const activeEnvVars = getActiveEnvironmentVariables();
    const baseUrl = (activeEnvVars.baseUrl || 'http://localhost:8080').replace(/\/+$/, '');
    const openApiUrl = baseUrl + '/v3/api-docs';

    try {
      if (!window.apiForge || typeof window.apiForge.fetchOpenApiFromUrl !== 'function') {
        throw new Error('API bridge unavailable');
      }

      const result = await window.apiForge.fetchOpenApiFromUrl(openApiUrl);

      if (loadingEl) loadingEl.hidden = true;

      if (!result.success || !Array.isArray(result.endpoints)) {
        throw new Error(result.error || 'Failed to parse OpenAPI document from ' + openApiUrl);
      }

      discoveredEndpointsData = result.endpoints;

      if (countBadge) {
        countBadge.textContent = String(discoveredEndpointsData.length);
        countBadge.hidden = false;
      }

      if (discoveredEndpointsData.length === 0) {
        if (errorEl && errorTextEl) {
          errorTextEl.textContent = 'No endpoints found in OpenAPI specification.';
          errorEl.hidden = false;
        }
        return;
      }

      renderDiscoveredEndpointsTree(discoveredEndpointsData);

      if (!silent) {
        showToast(`Discovered ${discoveredEndpointsData.length} Spring Boot endpoints`, 'success');
      }
    } catch (err) {
      if (loadingEl) loadingEl.hidden = true;
      if (countBadge) countBadge.hidden = true;
      const navCountBadge = document.getElementById('nav-endpoints-count');
      if (navCountBadge) navCountBadge.hidden = true;

      if (errorEl && errorTextEl) {
        errorTextEl.textContent = `Spring Boot backend unavailable at ${openApiUrl}. Start backend to discover endpoints.`;
        errorEl.hidden = false;
      }
      if (!silent) {
        console.warn('[ApiForge Lite] Could not discover endpoints:', err.message);
      }
    }
  }

  function renderDiscoveredEndpointsTree(endpoints) {
    const treeEl = document.getElementById('endpoints-tree');
    if (!treeEl) return;
    treeEl.innerHTML = '';

    // Group endpoints by path
    const groupedByPath = {};
    endpoints.forEach((ep) => {
      const p = ep.path || '/';
      if (!groupedByPath[p]) groupedByPath[p] = [];
      groupedByPath[p].push(ep);
    });

    Object.entries(groupedByPath).forEach(([pathKey, epList]) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'endpoint-path-group';

      const isCollapsed = collapsedPathGroups.has(pathKey);

      // Path header row
      const pathHeader = document.createElement('div');
      pathHeader.className = 'endpoint-path-header';
      pathHeader.innerHTML = `
        <span class="endpoint-path-chevron ${isCollapsed ? 'collapsed' : ''}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-spring);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span>${escapeHtml(pathKey)}</span>
      `;

      const itemsList = document.createElement('div');
      itemsList.className = `endpoint-items-list ${isCollapsed ? 'collapsed' : ''}`;

      pathHeader.addEventListener('click', () => {
        if (collapsedPathGroups.has(pathKey)) {
          collapsedPathGroups.delete(pathKey);
          itemsList.classList.remove('collapsed');
          pathHeader.querySelector('.endpoint-path-chevron')?.classList.remove('collapsed');
        } else {
          collapsedPathGroups.add(pathKey);
          itemsList.classList.add('collapsed');
          pathHeader.querySelector('.endpoint-path-chevron')?.classList.add('collapsed');
        }
      });

      // Individual endpoint rows
      epList.forEach((ep) => {
        const itemRow = document.createElement('div');
        const epKey = `${ep.method}_${ep.path}`;
        const isActive = activeSelectedEndpointKey === epKey;
        const methodLower = (ep.method || 'GET').toLowerCase();

        itemRow.className = `endpoint-item-row ${isActive ? 'active' : ''}`;
        itemRow.innerHTML = `
          <span class="tree-method-badge tree-method-${methodLower}">${escapeHtml(ep.method)}</span>
          <span class="endpoint-item-title" title="${escapeHtml(ep.summary || ep.path)}">${escapeHtml(ep.summary || ep.path)}</span>
        `;

        itemRow.addEventListener('click', () => {
          document.querySelectorAll('.endpoint-item-row.active').forEach(r => r.classList.remove('active'));
          itemRow.classList.add('active');
          activeSelectedEndpointKey = epKey;
          loadDiscoveredEndpointIntoEditor(ep);
        });

        itemsList.appendChild(itemRow);
      });

      groupEl.appendChild(pathHeader);
      groupEl.appendChild(itemsList);
      treeEl.appendChild(groupEl);
    });
  }

  function loadDiscoveredEndpointIntoEditor(ep) {
    let targetTab = getActiveTab();
    if (!targetTab) {
      targetTab = createTab({ title: ep.summary || `${ep.method} ${ep.path}`, method: ep.method, url: '' });
    }

    // Determine the base URL dynamically: prefer the endpoint's serverUrl, then active environment's baseUrl, then fallback
    const activeEnvVars = getActiveEnvironmentVariables();
    const serverUrl = ep.serverUrl || activeEnvVars.baseUrl || 'http://localhost:8080';
    const cleanServerUrl = serverUrl.replace(/\/+$/, '');
    const cleanPath = ep.path.startsWith('/') ? ep.path : '/' + ep.path;
    const fullUrl = cleanServerUrl + cleanPath;

    const params = (ep.queryParams || []).map(p => ({
      key: p.name,
      value: p.example || '',
      enabled: true
    }));

    const headers = (ep.headerParams || []).map(h => ({
      key: h.name,
      value: h.example || '',
      enabled: true
    }));

    let bodyContent = ep.body || '';
    if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      const hasContentType = headers.some(h => h.key.toLowerCase() === 'content-type');
      if (!hasContentType) {
        headers.unshift({
          key: 'Content-Type',
          value: ep.contentType || 'application/json',
          enabled: true
        });
      }
    }

    targetTab.title = ep.summary || `${ep.method} ${ep.path}`;
    targetTab.isCustomTitle = true;
    targetTab.method = ep.method;
    targetTab.url = fullUrl;
    targetTab.params = params.length > 0 ? params : [];
    targetTab.headers = headers.length > 0 ? headers : [];
    targetTab.body = bodyContent;
    targetTab.tests = [];
    targetTab.response = null;
    targetTab.responseState = 'empty';

    setActiveTab(targetTab.id);

    if (bodyContent && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      switchRequestSubtab('body');
    } else if (params.length > 0) {
      switchRequestSubtab('params');
    }

    showToast(`Loaded ${ep.method} ${ep.path}`, 'info');
  }


  document.addEventListener('DOMContentLoaded', async () => {
    initializeBridge();
    createTab({ title: 'New Request', method: 'GET', url: '' });
    bindEvents();
    loadCollectionsTree();
    await loadSettings();
    await loadHistory();
    // No automatic endpoint discovery on startup - starts completely clean

    const btnRefreshEndpoints = document.getElementById('btn-refresh-endpoints');
    if (btnRefreshEndpoints) {
      btnRefreshEndpoints.addEventListener('click', () => discoverSpringBootEndpoints(false));
    }
    const btnRetryEndpoints = document.getElementById('btn-retry-endpoints');
    if (btnRetryEndpoints) {
      btnRetryEndpoints.addEventListener('click', () => discoverSpringBootEndpoints(false));
    }
    const navEndpoints = document.getElementById('nav-endpoints');
    if (navEndpoints) {
      navEndpoints.addEventListener('click', () => {
        const endpointsSec = document.getElementById('sidebar-endpoints-section');
        if (endpointsSec) {
          endpointsSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        discoverSpringBootEndpoints(false);
      });
    }

    if (elements.historyPanel) {
      elements.historyPanel.hidden = true;
      state.historyPanelOpen = false;
      if (elements.navHistory) {
        elements.navHistory.setAttribute('aria-pressed', 'false');
        elements.navHistory.classList.remove('nav-btn-active');
      }
    }
  });
})();




