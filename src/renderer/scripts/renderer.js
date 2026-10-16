/**
 * ApiForge Lite — Spring Edition
 * Renderer Process Controller (Step 1 Foundation)
 */

(function () {
  'use strict';

  // State Management
  const state = {
    tabs: [],
    activeTabId: null,
    tabCounter: 0,
    appInfo: null
  };

  // DOM Elements
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
    btnSend: document.getElementById('btn-send'),
    subtabButtons: document.querySelectorAll('.subtab-btn'),
    subtabPanels: document.querySelectorAll('.subtab-panel'),
    respTabButtons: document.querySelectorAll('.resp-tab-btn'),
    responseEmptyState: document.getElementById('response-empty-state'),
    responseStep1Feedback: document.getElementById('response-step1-feedback'),
    previewMethodBadge: document.getElementById('preview-method-badge'),
    previewUrlText: document.getElementById('preview-url-text'),
    btnDismissFeedback: document.getElementById('btn-dismiss-feedback'),
    toastContainer: document.getElementById('toast-container'),
    navButtons: document.querySelectorAll('.nav-btn[data-feature]')
  };

  // ==========================================================================
  // IPC Bridge Initialization
  // ==========================================================================

  async function initializeBridge() {
    try {
      if (!window.apiForge || typeof window.apiForge.getAppInfo !== 'function') {
        throw new Error('window.apiForge bridge is not available');
      }

      // Invoke the hardened IPC handler
      const info = await window.apiForge.getAppInfo();
      state.appInfo = info;

      // Update UI with real values returned by the main process
      if (elements.appVersionLabel) {
        elements.appVersionLabel.textContent = `v${info.version}`;
      }

      if (elements.bridgeStatusPill) {
        elements.bridgeStatusPill.textContent = `v${info.electronVersion || 'Electron'}`;
        elements.bridgeStatusPill.className = 'badge-status connected';
        elements.bridgeStatusPill.title = `Main Process Connected: Electron ${info.electronVersion}, Node ${info.nodeVersion}`;
      }

      if (elements.mainStatusIndicator && elements.statusIndicatorText) {
        elements.mainStatusIndicator.className = 'main-status-chip online';
        elements.statusIndicatorText.textContent = `Bridge: Online (v${info.version})`;
      }

      console.info('[ApiForge Lite] IPC bridge connected successfully:', info);
    } catch (err) {
      console.error('[ApiForge Lite] Failed to communicate with main process bridge:', err);

      if (elements.bridgeStatusPill) {
        elements.bridgeStatusPill.textContent = 'Disconnected';
        elements.bridgeStatusPill.className = 'badge-status error';
      }

      if (elements.mainStatusIndicator && elements.statusIndicatorText) {
        elements.mainStatusIndicator.className = 'main-status-chip offline';
        elements.statusIndicatorText.textContent = 'Bridge: Error';
      }

      showToast('Main process bridge error: ' + err.message, 'error');
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
      title: options.title || (isFirst ? 'New Request' : `New Request (${state.tabCounter})`),
      method: options.method || 'GET',
      url: options.url || ''
    };

    state.tabs.push(newTab);
    renderTabs();
    setActiveTab(tabId);
    return newTab;
  }

  function setActiveTab(tabId) {
    const targetTab = state.tabs.find((t) => t.id === tabId);
    if (!targetTab) return;

    state.activeTabId = tabId;

    // Synchronize Address Bar controls with active tab state
    if (elements.selectMethod) {
      elements.selectMethod.value = targetTab.method;
      elements.selectMethod.setAttribute('data-method', targetTab.method);
    }

    if (elements.inputUrl) {
      elements.inputUrl.value = targetTab.url;
    }

    renderTabs();
  }

  function closeTab(tabId, event) {
    if (event) {
      event.stopPropagation();
    }

    // Always keep at least one tab open
    if (state.tabs.length <= 1) {
      showToast('Cannot close the only open tab', 'info');
      return;
    }

    const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const wasActive = state.activeTabId === tabId;
    state.tabs.splice(tabIndex, 1);

    if (wasActive) {
      // Activate the nearest remaining tab
      const nextIndex = Math.max(0, tabIndex - 1);
      setActiveTab(state.tabs[nextIndex].id);
    } else {
      renderTabs();
    }
  }

  function renderTabs() {
    if (!elements.requestTabStrip) return;

    elements.requestTabStrip.innerHTML = '';

    state.tabs.forEach((tab) => {
      const tabElement = document.createElement('button');
      tabElement.className = `req-tab ${tab.id === state.activeTabId ? 'active' : ''}`;
      tabElement.setAttribute('role', 'tab');
      tabElement.setAttribute('aria-selected', tab.id === state.activeTabId ? 'true' : 'false');
      tabElement.setAttribute('id', `tab-elem-${tab.id}`);

      // Method tag
      const methodTag = document.createElement('span');
      methodTag.className = `tab-method-tag ${tab.method}`;
      methodTag.textContent = tab.method;

      // Title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'tab-title-text';
      titleSpan.textContent = tab.title;

      tabElement.appendChild(methodTag);
      tabElement.appendChild(titleSpan);

      // Close button if more than 1 tab
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

  function getActiveTab() {
    return state.tabs.find((t) => t.id === state.activeTabId);
  }

  // ==========================================================================
  // URL and Method Inputs Sync
  // ==========================================================================

  function bindInputEvents() {
    if (elements.inputUrl) {
      elements.inputUrl.addEventListener('input', (e) => {
        const activeTab = getActiveTab();
        if (activeTab) {
          activeTab.url = e.target.value.trim();
          // If the user has typed a URL, update the tab title for better UX
          if (activeTab.url) {
            try {
              const parsed = new URL(activeTab.url);
              activeTab.title = parsed.pathname !== '/' ? parsed.pathname : parsed.hostname;
            } catch {
              activeTab.title = activeTab.url.slice(0, 24);
            }
          } else {
            activeTab.title = 'New Request';
          }
          renderTabs();
        }
      });
    }

    if (elements.selectMethod) {
      elements.selectMethod.addEventListener('change', (e) => {
        const activeTab = getActiveTab();
        if (activeTab) {
          activeTab.method = e.target.value;
          elements.selectMethod.setAttribute('data-method', activeTab.method);
          renderTabs();
        }
      });
    }
  }

  // ==========================================================================
  // Sub-tabs & Response Tabs Switching
  // ==========================================================================

  function bindTabSwitchers() {
    // Request sub-tabs (Params, Headers, Body, Tests)
    elements.subtabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const subtabName = btn.getAttribute('data-subtab');
        elements.subtabButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        elements.subtabPanels.forEach((panel) => {
          if (panel.id === `panel-${subtabName}`) {
            panel.removeAttribute('hidden');
            panel.classList.add('active');
          } else {
            panel.setAttribute('hidden', '');
            panel.classList.remove('active');
          }
        });
      });
    });

    // Response tabs (Body, Headers, Explain)
    elements.respTabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        elements.respTabButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      });
    });
  }

  // ==========================================================================
  // Send Action (Honest Step 1 Behavior)
  // ==========================================================================

  function bindSendAction() {
    if (elements.btnSend) {
      elements.btnSend.addEventListener('click', () => {
        const activeTab = getActiveTab();
        if (!activeTab) return;

        // Show feedback card in response workspace
        if (elements.previewMethodBadge) {
          elements.previewMethodBadge.textContent = activeTab.method;
          elements.previewMethodBadge.className = `badge-method ${activeTab.method}`;
        }

        if (elements.previewUrlText) {
          elements.previewUrlText.textContent = activeTab.url || 'No URL configured';
        }

        if (elements.responseEmptyState) {
          elements.responseEmptyState.setAttribute('hidden', '');
        }

        if (elements.responseStep1Feedback) {
          elements.responseStep1Feedback.removeAttribute('hidden');
        }

        showToast(`Send queued: ${activeTab.method} ${activeTab.url || '(empty URL)'} — HTTP Engine scheduled for Step 2`, 'info');
      });
    }

    if (elements.btnDismissFeedback) {
      elements.btnDismissFeedback.addEventListener('click', () => {
        if (elements.responseStep1Feedback) {
          elements.responseStep1Feedback.setAttribute('hidden', '');
        }
        if (elements.responseEmptyState) {
          elements.responseEmptyState.removeAttribute('hidden');
        }
      });
    }
  }

  // ==========================================================================
  // Nav Features Notice (Collections, History, Environments, Settings)
  // ==========================================================================

  function bindNavButtons() {
    elements.navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const feature = btn.getAttribute('data-feature') || 'Feature';
        const step = btn.getAttribute('data-step') || 'a future step';
        showToast(`${feature} module is scheduled for implementation in ${step}.`, 'info');
      });
    });
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
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3500);
  }

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================

  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+N or Cmd+N creates a new tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createTab();
        showToast('Created new request tab', 'info');
      }
    });
  }

  // ==========================================================================
  // Bootstrap Application
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize IPC bridge to main process
    initializeBridge();

    // 2. Set up initial request tab
    createTab({ title: 'New Request', method: 'GET', url: '' });

    // 3. Bind UI interactions
    if (elements.btnNewRequest) {
      elements.btnNewRequest.addEventListener('click', () => createTab());
    }

    if (elements.btnAddTab) {
      elements.btnAddTab.addEventListener('click', () => createTab());
    }

    bindInputEvents();
    bindTabSwitchers();
    bindSendAction();
    bindNavButtons();
    bindKeyboardShortcuts();
  });
})();
