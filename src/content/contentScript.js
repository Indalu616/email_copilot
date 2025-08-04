/**
 * Email Copilot Content Script
 * Injects AI-powered autocomplete into Gmail compose areas
 */

// Mark as injected to prevent double injection
window.emailCopilotInjected = true;

// Add status indicator to Gmail
function createStatusIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'email-copilot-status';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4285f4;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: 'Google Sans', 'Roboto', sans-serif;
    ">
      ✨ Email Copilot Active
    </div>
  `;
  document.body.appendChild(indicator);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.remove();
    }
  }, 3000);
}

// Add Copilot button to Gmail compose toolbar
function addCopilotButton(composeElement) {
  // Find the compose toolbar (formatting buttons area)
  const toolbar = composeElement.closest('.M9').querySelector('.aoD.hl, .btC, .IZ');
  if (!toolbar || toolbar.querySelector('.email-copilot-button')) return;

  const copilotButton = document.createElement('div');
  copilotButton.className = 'email-copilot-button';
  copilotButton.innerHTML = `
    <div style="
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      margin: 0 4px;
      background: #f8f9fa;
      border: 1px solid #dadce0;
      border-radius: 20px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #5f6368;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      transition: all 0.2s ease;
      user-select: none;
    " 
    onmouseover="this.style.background='#e8f0fe'; this.style.borderColor='#4285f4'; this.style.color='#1a73e8';"
    onmouseout="this.style.background='#f8f9fa'; this.style.borderColor='#dadce0'; this.style.color='#5f6368';"
    onclick="this.dispatchEvent(new CustomEvent('copilot-trigger'));"
    title="Trigger AI suggestion (Ctrl+Space)">
      ✨ AI Copilot
    </div>
  `;

  // Add click handler
  copilotButton.addEventListener('copilot-trigger', () => {
    if (window.emailCopilotContent && window.emailCopilotContent.activeComposeElement === composeElement) {
      window.emailCopilotContent.getSuggestion(true);
    }
  });

  toolbar.appendChild(copilotButton);
  return copilotButton;
}

// Add status indicator to compose area
function addComposeStatusIndicator(composeElement) {
  const existingIndicator = composeElement.parentElement.querySelector('.email-copilot-status-bar');
  if (existingIndicator) return existingIndicator;

  const statusBar = document.createElement('div');
  statusBar.className = 'email-copilot-status-bar';
  statusBar.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      margin: 4px 0;
      background: linear-gradient(90deg, #e8f0fe 0%, #f8f9fa 100%);
      border: 1px solid #e1e3e1;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      color: #5f6368;
      font-family: 'Google Sans', 'Roboto', sans-serif;
    ">
      <span class="status-text">✨ AI Copilot Ready</span>
      <span class="status-shortcut">Ctrl+Space to trigger</span>
    </div>
  `;

  // Insert before the compose element
  composeElement.parentElement.insertBefore(statusBar, composeElement);
  return statusBar;
}

// Update status indicator
function updateStatusIndicator(element, status, message) {
  const statusBar = element?.closest('.M9')?.querySelector('.email-copilot-status-bar');
  if (!statusBar) return;

  const statusText = statusBar.querySelector('.status-text');
  const statusShortcut = statusBar.querySelector('.status-shortcut');
  
  if (statusText && statusShortcut) {
    switch (status) {
      case 'ready':
        statusText.textContent = '✨ AI Copilot Ready';
        statusShortcut.textContent = 'Ctrl+Space to trigger';
        statusBar.style.background = 'linear-gradient(90deg, #e8f0fe 0%, #f8f9fa 100%)';
        break;
      case 'thinking':
        statusText.textContent = '🤖 Generating suggestion...';
        statusShortcut.textContent = 'Please wait';
        statusBar.style.background = 'linear-gradient(90deg, #fef7e0 0%, #f8f9fa 100%)';
        break;
      case 'suggestion':
        statusText.textContent = '💡 Suggestion ready';
        statusShortcut.textContent = 'Tab to accept, Esc to dismiss';
        statusBar.style.background = 'linear-gradient(90deg, #e6f4ea 0%, #f8f9fa 100%)';
        break;
      case 'error':
        statusText.textContent = '⚠️ ' + (message || 'Error occurred');
        statusShortcut.textContent = 'Try Ctrl+Space';
        statusBar.style.background = 'linear-gradient(90deg, #fce8e6 0%, #f8f9fa 100%)';
        break;
    }
  }
}

// Gmail Observer class
class GmailObserver {
  constructor() {
    this.observer = null;
    this.observedElements = new Set();
    this.onComposeDetected = null;
    this.onComposeRemoved = null;
    this.isObserving = false;
  }

  startObserving() {
    if (this.isObserving) return;

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable', 'role', 'aria-label', 'class']
    });

    this.isObserving = true;
    console.log('📧 Gmail Observer: Started observing');
  }

  handleMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForComposeElements(node);
          }
        });
      } else if (mutation.type === 'attributes') {
        this.checkForComposeElements(mutation.target);
      }
    }
  }

  checkForComposeElements(element) {
    if (this.isComposeElement(element)) {
      this.handleComposeDetected(element);
    }

    // More comprehensive selectors for different Gmail layouts
    const composeSelectors = [
      'div[role="textbox"][aria-label*="message body"]',
      'div[role="textbox"][aria-label*="Message Body"]', 
      'div[role="textbox"][aria-label*="Message body"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][g_editable="true"]',
      '.Am.Al.editable',
      '.editable[contenteditable="true"]',
      '[contenteditable="true"].Am',
      'div[contenteditable="true"]:not(.gmail_signature):not(.gmail_quote)'
    ];

    composeSelectors.forEach(selector => {
      try {
        const elements = element.querySelectorAll ? element.querySelectorAll(selector) : [];
        elements.forEach(composeElement => {
          if (this.isComposeElement(composeElement)) {
            this.handleComposeDetected(composeElement);
          }
        });
      } catch (error) {
        // Ignore selector errors
      }
    });
  }

  isComposeElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (!element.isContentEditable) return false;
    
    // Check if already attached
    if (element.dataset.emailCopilotAttached) return false;
    
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label') || '';
    if (ariaLabel.toLowerCase().includes('message body') || 
        ariaLabel.toLowerCase().includes('message') ||
        ariaLabel.toLowerCase().includes('compose')) {
      return true;
    }

    // Check role
    if (element.getAttribute('role') === 'textbox') {
      const parentText = element.parentElement?.textContent || '';
      if (parentText.toLowerCase().includes('compose') || 
          parentText.toLowerCase().includes('message')) {
        return true;
      }
    }

    // Check Gmail-specific classes
    const gmailClasses = ['Am', 'Al', 'editable'];
    if (gmailClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }

    // Check if it's in a compose container
    const composeContainer = element.closest('.nH, .M9, .aDM, .n1tfz, .aO7, .nH .ar');
    if (composeContainer && element.isContentEditable) {
      // Make sure it's not signature or quote
      if (!element.closest('.gmail_signature, .gmail_quote, .ii, .adP, .adO')) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 50) {
          return true;
        }
      }
    }

    return false;
  }

  handleComposeDetected(element) {
    if (this.observedElements.has(element)) return;
    
    console.log('🎯 Gmail Observer: Compose element detected', element);
    this.observedElements.add(element);

    // Add UI integrations
    setTimeout(() => {
      addCopilotButton(element);
      addComposeStatusIndicator(element);
    }, 500);

    if (this.onComposeDetected) {
      try {
        this.onComposeDetected(element);
      } catch (error) {
        console.error('Error in compose detected callback:', error);
      }
    }
  }
}

// Ghost Text Renderer class
class GhostTextRenderer {
  constructor() {
    this.ghostElement = null;
    this.targetElement = null;
    this.isVisible = false;
  }

  show(targetElement, suggestion) {
    if (!targetElement || !suggestion) return;

    console.log('👻 Showing ghost text:', suggestion);
    
    this.targetElement = targetElement;
    this.hide();
    
    this.createGhostElement(suggestion);
    this.positionGhostElement();
    
    this.isVisible = true;
    
    // Update status indicator
    updateStatusIndicator(targetElement, 'suggestion');
  }

  hide() {
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }
    
    this.isVisible = false;
    
    // Update status indicator
    if (this.targetElement) {
      updateStatusIndicator(this.targetElement, 'ready');
    }
    
    this.targetElement = null;
  }

  createGhostElement(suggestion) {
    this.ghostElement = document.createElement('span');
    this.ghostElement.className = 'email-copilot-ghost-text';
    this.ghostElement.textContent = suggestion;
    
    // Enhanced styling
    this.ghostElement.style.cssText = `
      color: #9ca3af !important;
      background: rgba(66, 133, 244, 0.08) !important;
      font-style: italic !important;
      opacity: 0.8 !important;
      pointer-events: none !important;
      user-select: none !important;
      border-radius: 3px !important;
      padding: 1px 3px !important;
      margin: 0 1px !important;
      border: 1px solid rgba(66, 133, 244, 0.2) !important;
    `;
  }

  positionGhostElement() {
    if (!this.ghostElement || !this.targetElement) return;

    // For contenteditable divs, insert at cursor position
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        const clonedRange = range.cloneRange();
        clonedRange.collapse(false);
        clonedRange.insertNode(this.ghostElement);
        
        // Move cursor after ghost text
        clonedRange.setStartAfter(this.ghostElement);
        clonedRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(clonedRange);
        
      } catch (error) {
        console.error('Failed to position ghost text:', error);
        // Fallback: append to end
        this.targetElement.appendChild(this.ghostElement);
      }
    } else {
      // Fallback: append to end
      this.targetElement.appendChild(this.ghostElement);
    }
  }
}

// Keyboard Manager class
class EmailCopilotKeybinds {
  constructor() {
    this.suggestionVisible = false;
    this.onAcceptSuggestion = null;
    this.onRejectSuggestion = null;
    this.onTriggerSuggestion = null;
  }

  handleKeyEvent(event) {
    const key = event.key.toLowerCase();
    
    if (key === 'tab' && this.suggestionVisible && this.onAcceptSuggestion) {
      event.preventDefault();
      event.stopPropagation();
      console.log('⌨️ Tab pressed - accepting suggestion');
      this.onAcceptSuggestion(event);
    } else if (key === 'escape' && this.suggestionVisible && this.onRejectSuggestion) {
      event.preventDefault();
      event.stopPropagation();
      console.log('⌨️ Escape pressed - rejecting suggestion');
      this.onRejectSuggestion(event);
    } else if (event.ctrlKey && key === ' ' && this.onTriggerSuggestion) {
      event.preventDefault();
      event.stopPropagation();
      console.log('⌨️ Ctrl+Space pressed - manual trigger');
      this.onTriggerSuggestion(event);
    } else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key) && 
               this.suggestionVisible && this.onRejectSuggestion) {
      console.log('⌨️ Arrow key pressed - dismissing suggestion');
      this.onRejectSuggestion(event);
    }
  }

  setSuggestionVisible(visible) {
    this.suggestionVisible = visible;
    console.log('🎯 Suggestion visibility changed:', visible);
  }

  setAcceptCallback(callback) {
    this.onAcceptSuggestion = callback;
  }

  setRejectCallback(callback) {
    this.onRejectSuggestion = callback;
  }

  setTriggerCallback(callback) {
    this.onTriggerSuggestion = callback;
  }
}

// Main Email Copilot Content class
class EmailCopilotContent {
  constructor() {
    this.isEnabled = true;
    this.ghostRenderer = new GhostTextRenderer();
    this.gmailObserver = new GmailObserver();
    this.activeComposeElement = null;
    this.currentSuggestion = null;
    this.suggestionTimeout = null;
    this.keybindManager = new EmailCopilotKeybinds();
    
    // Debounced function for getting suggestions
    this.debouncedGetSuggestion = this.debounce(this.getSuggestion.bind(this), 800);
    
    this.initialize();
  }

  /**
   * Debounce function to limit API calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Initialize the content script
   */
  async initialize() {
    console.log('🚀 Email Copilot: Initializing...');
    
    try {
      // Show status indicator
      createStatusIndicator();
      
      // Setup keyboard handlers
      this.setupKeyboardHandlers();
      
      // Setup Gmail observer
      this.setupGmailObserver();
      
      // Inject styles
      this.injectStyles();
      
      // Start observing for compose areas
      this.startObserving();
      
      console.log('✅ Email Copilot: Successfully initialized');
    } catch (error) {
      console.error('❌ Email Copilot: Failed to initialize:', error);
    }
  }

  setupKeyboardHandlers() {
    this.keybindManager.setAcceptCallback(() => {
      this.acceptSuggestion();
    });

    this.keybindManager.setRejectCallback(() => {
      this.rejectSuggestion();
    });

    this.keybindManager.setTriggerCallback((event) => {
      if (this.activeComposeElement) {
        console.log('🎯 Manual trigger activated');
        this.getSuggestion(true);
      }
    });

    document.addEventListener('keydown', (event) => {
      this.keybindManager.handleKeyEvent(event);
    });
  }

  setupGmailObserver() {
    this.gmailObserver.onComposeDetected = (composeElement) => {
      this.attachToComposeElement(composeElement);
    };

    this.gmailObserver.onComposeRemoved = (composeElement) => {
      this.detachFromComposeElement(composeElement);
    };
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .email-copilot-ghost-text {
        color: #9ca3af !important;
        background: rgba(66, 133, 244, 0.08) !important;
        font-style: italic !important;
        opacity: 0.8 !important;
        pointer-events: none !important;
        user-select: none !important;
        border-radius: 3px !important;
        padding: 1px 3px !important;
        margin: 0 1px !important;
        border: 1px solid rgba(66, 133, 244, 0.2) !important;
        transition: all 0.2s ease !important;
      }

      .email-copilot-compose-wrapper {
        position: relative !important;
      }

      .email-copilot-button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
      }

      .email-copilot-status-bar {
        transition: all 0.3s ease !important;
      }

      @keyframes emailCopilotPulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }

      .email-copilot-thinking .status-text {
        animation: emailCopilotPulse 1.5s infinite !important;
      }
    `;
    document.head.appendChild(style);
  }

  startObserving() {
    // Wait for Gmail to fully load
    setTimeout(() => {
      this.findExistingComposeAreas();
      this.gmailObserver.startObserving();
    }, 1000);
  }

  findExistingComposeAreas() {
    const composeSelectors = [
      'div[role="textbox"][aria-label*="message body"]',
      'div[role="textbox"][aria-label*="Message Body"]',
      'div[role="textbox"][aria-label*="Message body"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][g_editable="true"]',
      '.Am.Al.editable',
      '.editable[contenteditable="true"]',
      '[contenteditable="true"].Am'
    ];

    console.log('🔍 Searching for existing compose areas...');
    
    composeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      console.log(`Found ${elements.length} elements for selector: ${selector}`);
      elements.forEach(element => {
        if (this.isValidComposeElement(element)) {
          console.log('✅ Valid compose element found:', element);
          this.attachToComposeElement(element);
        }
      });
    });
  }

  isValidComposeElement(element) {
    if (!element || !element.isContentEditable) return false;
    
    const composeContainer = element.closest('.nH, .M9, .aDM, .n1tfz, .aO7');
    if (!composeContainer) return false;

    if (element.closest('.gmail_signature, .gmail_quote, .ii, .adP, .adO')) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 50) return false;

    return true;
  }

  attachToComposeElement(element) {
    if (element.dataset.emailCopilotAttached) return;
    
    console.log('🔗 Attaching to compose element:', element);
    
    element.dataset.emailCopilotAttached = 'true';
    element.classList.add('email-copilot-compose-wrapper');
    
    element.addEventListener('input', this.handleInput.bind(this));
    element.addEventListener('keydown', this.handleKeyDown.bind(this));
    element.addEventListener('focus', this.handleFocus.bind(this));
    element.addEventListener('blur', this.handleBlur.bind(this));
    element.addEventListener('click', this.handleClick.bind(this));
    
    // Add UI elements
    setTimeout(() => {
      addCopilotButton(element);
      const statusBar = addComposeStatusIndicator(element);
      updateStatusIndicator(element, 'ready');
    }, 100);
  }

  detachFromComposeElement(element) {
    if (!element.dataset.emailCopilotAttached) return;
    
    console.log('🔓 Detaching from compose element:', element);
    
    this.ghostRenderer.hide();
    
    delete element.dataset.emailCopilotAttached;
    element.classList.remove('email-copilot-compose-wrapper');
    
    if (this.activeComposeElement === element) {
      this.activeComposeElement = null;
    }
  }

  handleInput(event) {
    const element = event.target;
    
    if (!this.isEnabled || !this.isValidComposeElement(element)) return;
    
    console.log('⌨️ Input detected in compose area');
    this.activeComposeElement = element;
    
    // Hide current suggestion
    this.hideSuggestion();
    
    // Update status
    updateStatusIndicator(element, 'thinking');
    
    // Get new suggestion after a delay
    this.debouncedGetSuggestion();
  }

  handleKeyDown(event) {
    const element = event.target;
    
    if (!this.isEnabled || !this.isValidComposeElement(element)) return;
    
    this.activeComposeElement = element;
    
    if (['Enter', 'Backspace', 'Delete'].includes(event.key)) {
      this.hideSuggestion();
    }
  }

  handleFocus(event) {
    const element = event.target;
    
    if (!this.isValidComposeElement(element)) return;
    
    console.log('🎯 Focus on compose element');
    this.activeComposeElement = element;
    updateStatusIndicator(element, 'ready');
  }

  handleBlur(event) {
    setTimeout(() => {
      if (document.activeElement !== event.target) {
        this.hideSuggestion();
      }
    }, 100);
  }

  handleClick(event) {
    const element = event.target;
    
    if (!this.isValidComposeElement(element)) return;
    
    this.activeComposeElement = element;
    this.hideSuggestion();
  }

  async getSuggestion(force = false) {
    if (!this.activeComposeElement || !this.isEnabled) return;
    
    try {
      const context = this.getEmailContext();
      const partialText = this.getPartialText();
      
      console.log('📝 Getting suggestion for text:', partialText);
      
      if (!force) {
        if (!partialText || partialText.trim().length < 5) {
          console.log('⚠️ Text too short, skipping suggestion');
          updateStatusIndicator(this.activeComposeElement, 'ready');
          return;
        }
        
        if (!this.isCursorAtWordEnd()) {
          console.log('⚠️ Not at word end, skipping suggestion');
          updateStatusIndicator(this.activeComposeElement, 'ready');
          return;
        }
      }
      
      console.log('🤖 Requesting AI completion...');
      updateStatusIndicator(this.activeComposeElement, 'thinking');
      
      // Call background script for AI completion
      const response = await chrome.runtime.sendMessage({
        type: 'get_ai_completion',
        context: context,
        partialText: partialText
      });
      
      if (response && response.success && response.suggestion) {
        console.log('✅ Received suggestion:', response.suggestion);
        this.showSuggestion(response.suggestion.trim());
      } else {
        console.log('❌ No suggestion received:', response);
        updateStatusIndicator(this.activeComposeElement, 'error', response?.error || 'No suggestion');
      }
    } catch (error) {
      console.error('❌ Failed to get suggestion:', error);
      updateStatusIndicator(this.activeComposeElement, 'error', 'Connection failed');
    }
  }

  getEmailContext() {
    if (!this.activeComposeElement) return '';
    
    let context = '';
    
    const subjectElement = document.querySelector('input[name="subjectbox"], input[placeholder*="Subject"], input[aria-label*="Subject"]');
    if (subjectElement && subjectElement.value) {
      context += `Subject: ${subjectElement.value}\n`;
    }
    
    const recipientElement = document.querySelector('input[name="to"], textarea[name="to"], div[aria-label*="To"]:not([role="textbox"])');
    if (recipientElement) {
      const recipientText = recipientElement.value || recipientElement.textContent || '';
      if (recipientText.trim()) {
        context += `To: ${recipientText}\n`;
      }
    }
    
    return context;
  }

  getPartialText() {
    if (!this.activeComposeElement) return '';
    
    const element = this.activeComposeElement;
    const text = element.textContent || element.innerText || '';
    
    // Get last 150 characters for better context
    return text.slice(-150);
  }

  isCursorAtWordEnd() {
    if (!this.activeComposeElement) return true;
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return true;
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return true;
    
    const text = textNode.textContent;
    const offset = range.startOffset;
    
    const charBefore = text.charAt(offset - 1);
    const charAfter = text.charAt(offset);
    
    return /\w/.test(charBefore) && (/\s/.test(charAfter) || charAfter === '' || /[.!?,;:]/.test(charAfter));
  }

  showSuggestion(suggestion) {
    if (!this.activeComposeElement || !suggestion) return;
    
    this.currentSuggestion = suggestion;
    this.ghostRenderer.show(this.activeComposeElement, suggestion);
    this.keybindManager.setSuggestionVisible(true);
    
    console.log('👻 Showing suggestion:', suggestion);
  }

  hideSuggestion() {
    this.currentSuggestion = null;
    this.ghostRenderer.hide();
    this.keybindManager.setSuggestionVisible(false);
  }

  acceptSuggestion() {
    if (!this.currentSuggestion || !this.activeComposeElement) return;
    
    console.log('✅ Accepting suggestion:', this.currentSuggestion);
    
    // Remove ghost text first
    this.ghostRenderer.hide();
    
    // Insert suggestion text
    this.insertTextAtCursor(this.currentSuggestion);
    
    // Clear suggestion
    this.currentSuggestion = null;
    this.keybindManager.setSuggestionVisible(false);
    
    // Update status
    updateStatusIndicator(this.activeComposeElement, 'ready');
    
    // Track usage
    this.trackUsage('accept');
  }

  rejectSuggestion() {
    if (!this.currentSuggestion) return;
    
    console.log('❌ Rejecting suggestion');
    
    this.hideSuggestion();
    updateStatusIndicator(this.activeComposeElement, 'ready');
    this.trackUsage('reject');
  }

  insertTextAtCursor(text) {
    if (!this.activeComposeElement) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Delete any ghost text first
      const ghostText = this.activeComposeElement.querySelector('.email-copilot-ghost-text');
      if (ghostText) {
        ghostText.remove();
      }
      
      // Insert the suggestion text
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      // Move cursor after inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger input event to notify Gmail
      this.activeComposeElement.dispatchEvent(new Event('input', { bubbles: true }));
      this.activeComposeElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  trackUsage(action) {
    chrome.runtime.sendMessage({
      type: 'track_usage',
      action: action,
      timestamp: Date.now()
    });
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hideSuggestion();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.emailCopilotContent = new EmailCopilotContent();
  });
} else {
  window.emailCopilotContent = new EmailCopilotContent();
}

// Also initialize after a short delay to ensure Gmail is loaded
setTimeout(() => {
  if (!window.emailCopilotContent) {
    window.emailCopilotContent = new EmailCopilotContent();
  }
}, 2000);