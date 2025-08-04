/**
 * Email Copilot Content Script
 * GitHub Copilot-style AI autocomplete for Gmail
 * 
 * Architecture:
 * - GmailObserver: Detects compose areas using MutationObserver
 * - InputManager: Handles typing events and debouncing
 * - SuggestionEngine: Manages AI API calls and retry logic
 * - GhostRenderer: Renders and manages ghost text
 * - KeyboardHandler: Manages Tab/Esc interactions
 * - EmailCopilot: Main orchestrator class
 */

// Prevent multiple injections
if (window.emailCopilotInjected) {
  console.log('📧 Email Copilot: Already injected, skipping');
} else {
  window.emailCopilotInjected = true;
  console.log('📧 Email Copilot: Injecting content script');

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Debounce utility function
   */
  function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  /**
   * Throttle utility function
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Text sanitization utility
   */
  function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 500); // Limit suggestion length
  }

  /**
   * Check if user is in middle of selection or editing
   */
  function isUserEditing() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    return !range.collapsed; // User has text selected
  }

  /**
   * Get cursor position relative to element
   */
  function getCursorPosition(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const textBeforeCursor = range.cloneRange();
    textBeforeCursor.selectNodeContents(element);
    textBeforeCursor.setEnd(range.startContainer, range.startOffset);
    
    return {
      offset: textBeforeCursor.toString().length,
      range: range,
      atEnd: range.startOffset === range.startContainer.textContent?.length
    };
  }

  // =============================================================================
  // GMAIL OBSERVER MODULE
  // =============================================================================

  class GmailObserver {
    constructor() {
      this.observer = null;
      this.composeElements = new Set();
      this.callbacks = {
        onComposeAdded: [],
        onComposeRemoved: []
      };
      this.isObserving = false;
    }

    start() {
      if (this.isObserving) return;

      this.observer = new MutationObserver(this.handleMutations.bind(this));
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['contenteditable', 'role', 'aria-label', 'class']
      });

      this.isObserving = true;
      console.log('📧 GmailObserver: Started monitoring DOM');
      
      // Check for existing compose areas
      this.scanForExistingComposeAreas();
    }

    stop() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.isObserving = false;
      console.log('📧 GmailObserver: Stopped monitoring');
    }

    onComposeAdded(callback) {
      this.callbacks.onComposeAdded.push(callback);
    }

    onComposeRemoved(callback) {
      this.callbacks.onComposeRemoved.push(callback);
    }

    handleMutations(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check added nodes
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForComposeElements(node);
            }
          });

          // Check removed nodes
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.handleRemovedNode(node);
            }
          });
        } else if (mutation.type === 'attributes') {
          this.checkSingleElement(mutation.target);
        }
      }
    }

    scanForExistingComposeAreas() {
      console.log('📧 GmailObserver: Scanning for existing compose areas');
      this.scanForComposeElements(document.body);
    }

    scanForComposeElements(rootElement) {
      const composeSelectors = [
        // Gmail compose message body selectors (comprehensive)
        'div[role="textbox"][aria-label*="message body" i]',
        'div[role="textbox"][aria-label*="Message Body" i]',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][g_editable="true"]',
        '.Am.Al.editable',
        '.editable[contenteditable="true"]',
        '[contenteditable="true"].Am',
        'div[contenteditable="true"]:not([aria-label*="subject" i]):not([aria-label*="to" i]):not([aria-label*="cc" i]):not([aria-label*="bcc" i])'
      ];

      composeSelectors.forEach(selector => {
        try {
          const elements = rootElement.querySelectorAll ? 
            rootElement.querySelectorAll(selector) : 
            (rootElement.matches && rootElement.matches(selector) ? [rootElement] : []);
          
          elements.forEach(element => this.checkSingleElement(element));
        } catch (error) {
          // Ignore invalid selectors
        }
      });
    }

    checkSingleElement(element) {
      if (this.isValidComposeElement(element)) {
        if (!this.composeElements.has(element)) {
          this.addComposeElement(element);
        }
      } else if (this.composeElements.has(element)) {
        this.removeComposeElement(element);
      }
    }

    isValidComposeElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
      if (!element.isContentEditable) return false;
      if (element.hasAttribute('data-copilot-attached')) return false;

      // Check if it's in a Gmail compose container
      const composeContainer = element.closest('.nH, .M9, .aDM, .n1tfz, .aO7');
      if (!composeContainer) return false;

      // Exclude signature, quote, and other non-message areas
      const exclusionSelectors = [
        '.gmail_signature', '.gmail_quote', '.ii', '.adP', '.adO',
        '[aria-label*="subject" i]', '[aria-label*="to" i]', 
        '[aria-label*="cc" i]', '[aria-label*="bcc" i]'
      ];

      for (const selector of exclusionSelectors) {
        if (element.matches(selector) || element.closest(selector)) {
          return false;
        }
      }

      // Check element dimensions (must be reasonably sized)
      const rect = element.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 30) return false;

      // Additional validation for message body
      const ariaLabel = element.getAttribute('aria-label') || '';
      const hasMessageBodyLabel = /message.?body/i.test(ariaLabel);
      const isTextboxRole = element.getAttribute('role') === 'textbox';
      const hasGmailClasses = element.classList.contains('Am') || 
                              element.classList.contains('editable');

      return hasMessageBodyLabel || (isTextboxRole && composeContainer) || hasGmailClasses;
    }

    addComposeElement(element) {
      console.log('📧 GmailObserver: New compose element detected', element);
      this.composeElements.add(element);
      element.setAttribute('data-copilot-attached', 'true');

      this.callbacks.onComposeAdded.forEach(callback => {
        try {
          callback(element);
        } catch (error) {
          console.error('📧 Error in compose added callback:', error);
        }
      });
    }

    removeComposeElement(element) {
      console.log('📧 GmailObserver: Compose element removed', element);
      this.composeElements.delete(element);
      element.removeAttribute('data-copilot-attached');

      this.callbacks.onComposeRemoved.forEach(callback => {
        try {
          callback(element);
        } catch (error) {
          console.error('📧 Error in compose removed callback:', error);
        }
      });
    }

    handleRemovedNode(node) {
      // Check if any tracked compose elements were removed
      const removedElements = Array.from(this.composeElements).filter(element => 
        !document.contains(element) || node.contains(element)
      );

      removedElements.forEach(element => this.removeComposeElement(element));
    }
  }

  // =============================================================================
  // INPUT MANAGER MODULE
  // =============================================================================

  class InputManager {
    constructor(debounceMs = 300) {
      this.debounceMs = debounceMs;
      this.callbacks = {
        onInput: [],
        onBackspace: [],
        onDelete: []
      };
      this.lastInputTime = 0;
      this.isBackspacing = false;
      this.lastTextLength = 0;
    }

    attachToElement(element) {
      if (element.hasAttribute('data-input-attached')) return;
      
      element.setAttribute('data-input-attached', 'true');
      
      // Debounced input handler
      const debouncedInputHandler = debounce(
        this.handleInput.bind(this), 
        this.debounceMs
      );

      // Input event listener
      element.addEventListener('input', (event) => {
        this.lastInputTime = Date.now();
        const currentLength = element.textContent?.length || 0;
        
        // Detect backspacing/deleting
        this.isBackspacing = currentLength < this.lastTextLength;
        this.lastTextLength = currentLength;

        if (this.isBackspacing) {
          this.callbacks.onBackspace.forEach(cb => cb(element, event));
        } else {
          debouncedInputHandler(element, event);
        }
      });

      // Keydown event for immediate backspace/delete detection
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace') {
          this.isBackspacing = true;
          this.callbacks.onBackspace.forEach(cb => cb(element, event));
        } else if (event.key === 'Delete') {
          this.callbacks.onDelete.forEach(cb => cb(element, event));
        }
      });

      console.log('📧 InputManager: Attached to element');
    }

    detachFromElement(element) {
      element.removeAttribute('data-input-attached');
      // Note: Event listeners will be garbage collected when element is removed
    }

    handleInput(element, event) {
      // Don't trigger suggestions if user is selecting text or backspacing
      if (isUserEditing() || this.isBackspacing) {
        console.log('📧 InputManager: Skipping - user is editing or backspacing');
        return;
      }

      const text = this.extractText(element);
      if (!this.shouldTriggerSuggestion(text)) {
        console.log('📧 InputManager: Skipping - text not suitable for suggestion');
        return;
      }

      console.log('📧 InputManager: Triggering suggestion for text:', text.slice(-50));
      this.callbacks.onInput.forEach(callback => {
        try {
          callback(element, text, event);
        } catch (error) {
          console.error('📧 Error in input callback:', error);
        }
      });
    }

    extractText(element) {
      // Get text content, preserving some structure
      const text = element.textContent || element.innerText || '';
      return text.replace(/\s+/g, ' ').trim();
    }

    shouldTriggerSuggestion(text) {
      // Minimum text length
      if (text.length < 10) return false;
      
      // Check if cursor is at a reasonable position for suggestions
      const words = text.split(/\s+/);
      if (words.length < 3) return false;
      
      // Don't suggest if text ends with punctuation (user might be done)
      const lastChar = text.slice(-1);
      if (/[.!?]/.test(lastChar)) return false;
      
      return true;
    }

    onInput(callback) {
      this.callbacks.onInput.push(callback);
    }

    onBackspace(callback) {
      this.callbacks.onBackspace.push(callback);
    }

    onDelete(callback) {
      this.callbacks.onDelete.push(callback);
    }
  }

  // =============================================================================
  // SUGGESTION ENGINE MODULE
  // =============================================================================

  class SuggestionEngine {
    constructor() {
      this.pendingRequests = new Map();
      this.retryAttempts = 3;
      this.retryDelay = 1000; // Start with 1 second
      this.cache = new Map();
      this.cacheSize = 50;
    }

    async getSuggestion(text, context = '', retryCount = 0) {
      const cacheKey = this.getCacheKey(text, context);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        console.log('📧 SuggestionEngine: Using cached suggestion');
        return this.cache.get(cacheKey);
      }

      // Cancel any pending request for the same text
      if (this.pendingRequests.has(cacheKey)) {
        console.log('📧 SuggestionEngine: Cancelling previous request');
        this.pendingRequests.get(cacheKey).abort();
      }

      try {
        const result = await this.makeApiRequest(text, context, cacheKey);
        
        // Cache successful results
        if (result.success && result.suggestion) {
          this.addToCache(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        console.error('📧 SuggestionEngine: API request failed:', error);
        
        // Retry logic
        if (retryCount < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
          console.log(`📧 SuggestionEngine: Retrying in ${delay}ms (attempt ${retryCount + 1})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.getSuggestion(text, context, retryCount + 1);
        }
        
        return {
          success: false,
          error: error.message || 'Failed to get suggestion after retries'
        };
      }
    }

    async makeApiRequest(text, context, cacheKey) {
      const controller = new AbortController();
      this.pendingRequests.set(cacheKey, controller);

      try {
        console.log('📧 SuggestionEngine: Making API request');
        
        const response = await chrome.runtime.sendMessage({
          type: 'get_ai_completion',
          context: context,
          partialText: text,
          prompt: this.buildPrompt(text, context)
        });

        this.pendingRequests.delete(cacheKey);

        if (response && response.success) {
          const suggestion = sanitizeText(response.suggestion);
          if (suggestion && suggestion.length > 0) {
            return { success: true, suggestion };
          } else {
            return { success: false, error: 'Empty suggestion received' };
          }
        } else {
          return { 
            success: false, 
            error: response?.error || 'API request failed' 
          };
        }
      } catch (error) {
        this.pendingRequests.delete(cacheKey);
        throw error;
      }
    }

    buildPrompt(text, context) {
      let prompt = "Complete this professional email naturally and concisely:\n\n";
      
      if (context.trim()) {
        prompt += `Context: ${context}\n\n`;
      }
      
      prompt += `Email text: "${text}"\n\n`;
      prompt += "Continue the email with 1-2 sentences maximum. ";
      prompt += "Match the tone and style. Provide only the continuation, not the full email.";
      
      return prompt;
    }

    getCacheKey(text, context) {
      // Create a simple hash for caching
      const combined = `${text}|${context}`;
      return combined.slice(-100); // Use last 100 chars as key
    }

    addToCache(key, result) {
      // Simple LRU cache
      if (this.cache.size >= this.cacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, result);
    }

    cancelPendingRequests() {
      this.pendingRequests.forEach(controller => controller.abort());
      this.pendingRequests.clear();
    }
  }

  // =============================================================================
  // GHOST RENDERER MODULE
  // =============================================================================

  class GhostRenderer {
    constructor() {
      this.activeGhost = null;
      this.targetElement = null;
      this.isVisible = false;
    }

    show(element, suggestion) {
      if (!element || !suggestion) {
        console.warn('📧 GhostRenderer: Invalid parameters for show()');
        return false;
      }

      this.hide(); // Clear any existing ghost text
      
      try {
        this.targetElement = element;
        this.createGhostElement(suggestion);
        
        if (this.insertGhostText()) {
          this.isVisible = true;
          console.log('📧 GhostRenderer: Ghost text displayed');
          return true;
        } else {
          this.cleanup();
          return false;
        }
      } catch (error) {
        console.error('📧 GhostRenderer: Failed to show ghost text:', error);
        this.cleanup();
        return false;
      }
    }

    hide() {
      if (this.activeGhost) {
        try {
          this.activeGhost.remove();
        } catch (error) {
          // Element might already be removed
        }
      }
      this.cleanup();
    }

    cleanup() {
      this.activeGhost = null;
      this.targetElement = null;
      this.isVisible = false;
    }

    createGhostElement(suggestion) {
      this.activeGhost = document.createElement('span');
      this.activeGhost.className = 'email-copilot-ghost-text';
      this.activeGhost.textContent = suggestion;
      this.activeGhost.setAttribute('data-copilot-ghost', 'true');
      
      // Enhanced styling for better visibility
      Object.assign(this.activeGhost.style, {
        color: '#9ca3af',
        backgroundColor: 'rgba(66, 133, 244, 0.05)',
        fontStyle: 'italic',
        opacity: '0.75',
        pointerEvents: 'none',
        userSelect: 'none',
        borderRadius: '2px',
        padding: '0 2px',
        border: '1px solid rgba(66, 133, 244, 0.15)',
        display: 'inline',
        whiteSpace: 'pre-wrap'
      });
    }

    insertGhostText() {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) {
        console.warn('📧 GhostRenderer: No selection range available');
        return false;
      }

      try {
        const range = selection.getRangeAt(0);
        const clonedRange = range.cloneRange();
        
        // Position at the end of current selection
        clonedRange.collapse(false);
        clonedRange.insertNode(this.activeGhost);
        
        // Move cursor after ghost text to maintain position
        clonedRange.setStartAfter(this.activeGhost);
        clonedRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(clonedRange);
        
        return true;
      } catch (error) {
        console.error('📧 GhostRenderer: Failed to insert ghost text:', error);
        
        // Fallback: append to end of element
        try {
          this.targetElement.appendChild(this.activeGhost);
          return true;
        } catch (fallbackError) {
          console.error('📧 GhostRenderer: Fallback insertion also failed:', fallbackError);
          return false;
        }
      }
    }

    acceptSuggestion() {
      if (!this.isVisible || !this.activeGhost) {
        console.warn('📧 GhostRenderer: No ghost text to accept');
        return false;
      }

      try {
        const suggestionText = this.activeGhost.textContent;
        
        // Replace ghost element with actual text
        const textNode = document.createTextNode(suggestionText);
        this.activeGhost.parentNode.replaceChild(textNode, this.activeGhost);
        
        // Position cursor after inserted text
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event to notify Gmail
        this.targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        this.cleanup();
        console.log('📧 GhostRenderer: Suggestion accepted');
        return true;
      } catch (error) {
        console.error('📧 GhostRenderer: Failed to accept suggestion:', error);
        this.hide();
        return false;
      }
    }

    getSuggestionText() {
      return this.activeGhost ? this.activeGhost.textContent : '';
    }
  }

  // =============================================================================
  // KEYBOARD HANDLER MODULE
  // =============================================================================

  class KeyboardHandler {
    constructor() {
      this.callbacks = {
        onAccept: [],
        onReject: [],
        onManualTrigger: []
      };
      this.isListening = false;
    }

    startListening() {
      if (this.isListening) return;
      
      document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
      this.isListening = true;
      console.log('📧 KeyboardHandler: Started listening for keyboard events');
    }

    stopListening() {
      if (!this.isListening) return;
      
      document.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
      this.isListening = false;
      console.log('📧 KeyboardHandler: Stopped listening for keyboard events');
    }

    handleKeyDown(event) {
      // Only handle events in Gmail compose areas
      const target = event.target;
      if (!target.hasAttribute('data-copilot-attached')) return;

      const key = event.key;
      
      // Tab to accept suggestion
      if (key === 'Tab' && this.hasActiveGhost()) {
        event.preventDefault();
        event.stopPropagation();
        console.log('📧 KeyboardHandler: Tab pressed - accepting suggestion');
        this.callbacks.onAccept.forEach(cb => cb(target));
        return;
      }
      
      // Escape to reject suggestion
      if (key === 'Escape' && this.hasActiveGhost()) {
        event.preventDefault();
        event.stopPropagation();
        console.log('📧 KeyboardHandler: Escape pressed - rejecting suggestion');
        this.callbacks.onReject.forEach(cb => cb(target));
        return;
      }
      
      // Ctrl+Space for manual trigger
      if (event.ctrlKey && key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        console.log('📧 KeyboardHandler: Ctrl+Space pressed - manual trigger');
        this.callbacks.onManualTrigger.forEach(cb => cb(target));
        return;
      }
      
      // Arrow keys to dismiss suggestion
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key) && 
          this.hasActiveGhost()) {
        console.log('📧 KeyboardHandler: Arrow key pressed - dismissing suggestion');
        this.callbacks.onReject.forEach(cb => cb(target));
        return;
      }
    }

    hasActiveGhost() {
      return document.querySelector('.email-copilot-ghost-text[data-copilot-ghost="true"]') !== null;
    }

    onAccept(callback) {
      this.callbacks.onAccept.push(callback);
    }

    onReject(callback) {
      this.callbacks.onReject.push(callback);
    }

    onManualTrigger(callback) {
      this.callbacks.onManualTrigger.push(callback);
    }
  }

  // =============================================================================
  // MAIN EMAIL COPILOT CLASS
  // =============================================================================

  class EmailCopilot {
    constructor() {
      this.isEnabled = true;
      this.activeElement = null;
      this.isProcessing = false;
      
      // Initialize modules
      this.gmailObserver = new GmailObserver();
      this.inputManager = new InputManager(300); // 300ms debounce
      this.suggestionEngine = new SuggestionEngine();
      this.ghostRenderer = new GhostRenderer();
      this.keyboardHandler = new KeyboardHandler();
      
      // Bind methods
      this.handleComposeAdded = this.handleComposeAdded.bind(this);
      this.handleComposeRemoved = this.handleComposeRemoved.bind(this);
      this.handleInput = this.handleInput.bind(this);
      this.handleBackspace = this.handleBackspace.bind(this);
      this.handleAccept = this.handleAccept.bind(this);
      this.handleReject = this.handleReject.bind(this);
      this.handleManualTrigger = this.handleManualTrigger.bind(this);
      
      this.init();
    }

    async init() {
      console.log('📧 EmailCopilot: Initializing...');
      
      try {
        // Check if extension is enabled
        const settings = await this.getSettings();
        this.isEnabled = settings.enabled !== false;
        
        if (!this.isEnabled) {
          console.log('📧 EmailCopilot: Extension is disabled');
          return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Inject styles
        this.injectStyles();
        
        // Start observing Gmail
        this.gmailObserver.start();
        
        // Start keyboard handler
        this.keyboardHandler.startListening();
        
        console.log('✅ EmailCopilot: Successfully initialized');
        this.showStatusNotification('Email Copilot Active');
        
      } catch (error) {
        console.error('❌ EmailCopilot: Failed to initialize:', error);
      }
    }

    setupEventListeners() {
      // Gmail Observer events
      this.gmailObserver.onComposeAdded(this.handleComposeAdded);
      this.gmailObserver.onComposeRemoved(this.handleComposeRemoved);
      
      // Input Manager events
      this.inputManager.onInput(this.handleInput);
      this.inputManager.onBackspace(this.handleBackspace);
      this.inputManager.onDelete(this.handleBackspace);
      
      // Keyboard Handler events
      this.keyboardHandler.onAccept(this.handleAccept);
      this.keyboardHandler.onReject(this.handleReject);
      this.keyboardHandler.onManualTrigger(this.handleManualTrigger);
      
      // Extension settings changes
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'settings_changed') {
          this.isEnabled = message.enabled;
          if (!this.isEnabled) {
            this.clearAllSuggestions();
          }
        }
      });
    }

    handleComposeAdded(element) {
      console.log('📧 EmailCopilot: Attaching to new compose element');
      this.inputManager.attachToElement(element);
      this.addComposeIndicators(element);
    }

    handleComposeRemoved(element) {
      console.log('📧 EmailCopilot: Detaching from removed compose element');
      this.inputManager.detachFromElement(element);
      
      if (this.activeElement === element) {
        this.clearSuggestion();
        this.activeElement = null;
      }
    }

    async handleInput(element, text, event) {
      if (!this.isEnabled || this.isProcessing) return;
      
      this.activeElement = element;
      this.clearSuggestion();
      this.isProcessing = true;
      
      try {
        console.log('📧 EmailCopilot: Processing input for suggestion');
        this.showProcessingIndicator(element);
        
        const context = this.getEmailContext(element);
        const result = await this.suggestionEngine.getSuggestion(text, context);
        
        if (result.success && result.suggestion && this.activeElement === element) {
          if (this.ghostRenderer.show(element, result.suggestion)) {
            this.showSuggestionIndicator(element);
            this.trackUsage('suggestion_shown');
          }
        } else if (result.error) {
          console.warn('📧 EmailCopilot: Suggestion failed:', result.error);
          this.showErrorIndicator(element, result.error);
        }
        
      } catch (error) {
        console.error('📧 EmailCopilot: Error processing input:', error);
        this.showErrorIndicator(element, 'Failed to generate suggestion');
      } finally {
        this.isProcessing = false;
        this.hideProcessingIndicator(element);
      }
    }

    handleBackspace(element, event) {
      // Clear suggestions when user is backspacing
      this.clearSuggestion();
    }

    handleAccept(element) {
      if (this.ghostRenderer.acceptSuggestion()) {
        this.trackUsage('suggestion_accepted');
        this.showStatusIndicator(element, 'Suggestion accepted');
      }
    }

    handleReject(element) {
      this.clearSuggestion();
      this.trackUsage('suggestion_rejected');
    }

    async handleManualTrigger(element) {
      if (!this.isEnabled || this.isProcessing) return;
      
      const text = this.inputManager.extractText(element);
      if (text.length < 5) {
        this.showStatusIndicator(element, 'Type more text to get suggestions');
        return;
      }
      
      // Force suggestion even if conditions aren't met
      this.handleInput(element, text, null);
    }

    clearSuggestion() {
      this.ghostRenderer.hide();
    }

    clearAllSuggestions() {
      this.clearSuggestion();
      this.suggestionEngine.cancelPendingRequests();
    }

    getEmailContext(element) {
      // Extract email context (subject, recipients, etc.)
      let context = '';
      
      try {
        // Get subject
        const subjectElement = document.querySelector('input[name="subjectbox"], input[aria-label*="subject" i]');
        if (subjectElement?.value) {
          context += `Subject: ${subjectElement.value}\n`;
        }
        
        // Get recipients
        const toElement = document.querySelector('input[name="to"], span[email] [email]');
        if (toElement) {
          const recipients = toElement.textContent || toElement.value || '';
          if (recipients.trim()) {
            context += `To: ${recipients}\n`;
          }
        }
        
        return context.trim();
      } catch (error) {
        console.warn('📧 Failed to extract email context:', error);
        return '';
      }
    }

    async getSettings() {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get_settings' });
        return response?.success ? response.settings : {};
      } catch (error) {
        console.warn('📧 Failed to get settings:', error);
        return {};
      }
    }

    trackUsage(action) {
      try {
        chrome.runtime.sendMessage({
          type: 'track_usage',
          action: action,
          timestamp: Date.now()
        });
      } catch (error) {
        // Ignore tracking errors
      }
    }

    // UI Helper Methods
    addComposeIndicators(element) {
      // Add subtle indicator that Copilot is active
      this.showStatusIndicator(element, 'AI Copilot Ready', 2000);
    }

    showStatusNotification(message) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4285f4;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Google Sans', 'Roboto', sans-serif;
      `;
      notification.textContent = `✨ ${message}`;
      
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }

    showStatusIndicator(element, message, duration = 5000) {
      // Implementation for showing status messages near compose area
      const indicator = document.createElement('div');
      indicator.className = 'email-copilot-status-indicator';
      indicator.textContent = message;
      indicator.style.cssText = `
        position: absolute;
        top: -25px;
        right: 5px;
        background: #34a853;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        z-index: 1000;
        white-space: nowrap;
      `;
      
      const container = element.parentElement;
      if (container) {
        container.style.position = 'relative';
        container.appendChild(indicator);
        setTimeout(() => indicator.remove(), duration);
      }
    }

    showProcessingIndicator(element) {
      this.showStatusIndicator(element, '🤖 Generating suggestion...', 0);
    }

    hideProcessingIndicator(element) {
      const indicator = element.parentElement?.querySelector('.email-copilot-status-indicator');
      if (indicator?.textContent.includes('Generating')) {
        indicator.remove();
      }
    }

    showSuggestionIndicator(element) {
      this.showStatusIndicator(element, '💡 Press Tab to accept, Esc to dismiss');
    }

    showErrorIndicator(element, error) {
      this.showStatusIndicator(element, `⚠️ ${error}`, 3000);
    }

    injectStyles() {
      if (document.getElementById('email-copilot-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'email-copilot-styles';
      style.textContent = `
        .email-copilot-ghost-text {
          color: #9ca3af !important;
          background-color: rgba(66, 133, 244, 0.05) !important;
          font-style: italic !important;
          opacity: 0.75 !important;
          pointer-events: none !important;
          user-select: none !important;
          border-radius: 2px !important;
          padding: 0 2px !important;
          border: 1px solid rgba(66, 133, 244, 0.15) !important;
          display: inline !important;
          white-space: pre-wrap !important;
          transition: opacity 0.2s ease !important;
        }
        
        .email-copilot-status-indicator {
          font-family: 'Google Sans', 'Roboto', sans-serif !important;
          font-weight: 500 !important;
          animation: fadeInUp 0.3s ease !important;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      
      document.head.appendChild(style);
    }

    destroy() {
      console.log('📧 EmailCopilot: Cleaning up...');
      
      this.gmailObserver.stop();
      this.keyboardHandler.stopListening();
      this.clearAllSuggestions();
      
      // Remove styles
      const styles = document.getElementById('email-copilot-styles');
      if (styles) styles.remove();
    }
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // Initialize Email Copilot when DOM is ready
  function initializeEmailCopilot() {
    // Wait for Gmail to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => new EmailCopilot(), 1000);
      });
    } else {
      setTimeout(() => new EmailCopilot(), 1000);
    }
  }

  // Store reference globally for debugging
  window.emailCopilot = null;
  
  // Initialize
  initializeEmailCopilot();
}