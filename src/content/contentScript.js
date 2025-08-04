/**
 * Email Copilot Content Script
 * Injects AI-powered autocomplete into Gmail compose areas
 */

// Mark as injected to prevent double injection
window.emailCopilotInjected = true;

// Import utilities (these will be bundled by Vite)
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
    this.debouncedGetSuggestion = this.debounce(this.getSuggestion.bind(this), 500);
    
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
    console.log('Email Copilot: Initializing...');
    
    try {
      // Setup keyboard handlers
      this.setupKeyboardHandlers();
      
      // Setup Gmail observer
      this.setupGmailObserver();
      
      // Inject styles
      this.injectStyles();
      
      // Start observing for compose areas
      this.startObserving();
      
      console.log('Email Copilot: Successfully initialized');
    } catch (error) {
      console.error('Email Copilot: Failed to initialize:', error);
    }
  }

  /**
   * Setup keyboard event handlers
   */
  setupKeyboardHandlers() {
    // Set up accept suggestion callback
    this.keybindManager.setAcceptCallback(() => {
      this.acceptSuggestion();
    });

    // Set up reject suggestion callback
    this.keybindManager.setRejectCallback(() => {
      this.rejectSuggestion();
    });

    // Set up manual trigger callback
    this.keybindManager.setTriggerCallback((event) => {
      if (this.activeComposeElement) {
        this.debouncedGetSuggestion.cancel?.();
        this.getSuggestion();
      }
    });

    // Listen for keyboard events
    document.addEventListener('keydown', (event) => {
      this.keybindManager.handleKeyEvent(event);
    });
  }

  /**
   * Setup Gmail-specific DOM observer
   */
  setupGmailObserver() {
    this.gmailObserver.onComposeDetected = (composeElement) => {
      this.attachToComposeElement(composeElement);
    };

    this.gmailObserver.onComposeRemoved = (composeElement) => {
      this.detachFromComposeElement(composeElement);
    };
  }

  /**
   * Inject necessary CSS styles
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .email-copilot-ghost-text {
        position: absolute;
        color: #9ca3af;
        background-color: transparent;
        pointer-events: none;
        white-space: pre-wrap;
        word-wrap: break-word;
        z-index: 1000;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        border: none;
        outline: none;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }

      .email-copilot-ghost-text.visible {
        opacity: 0.6;
      }

      .email-copilot-ghost-text.hidden {
        opacity: 0;
      }

      .email-copilot-compose-wrapper {
        position: relative;
      }

      .email-copilot-suggestion-indicator {
        position: absolute;
        top: -20px;
        right: 0;
        background: #4285f4;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
        z-index: 1001;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Start observing the DOM for Gmail compose areas
   */
  startObserving() {
    // Check for existing compose areas
    this.findExistingComposeAreas();
    
    // Start observing for new compose areas
    this.gmailObserver.startObserving();
  }

  /**
   * Find and attach to existing Gmail compose areas
   */
  findExistingComposeAreas() {
    // Gmail compose selectors (multiple selectors for different Gmail versions)
    const composeSelectors = [
      'div[role="textbox"][aria-label*="message body"]',
      'div[role="textbox"][aria-label*="Message Body"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      '.Am.Al.editable'
    ];

    composeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (this.isValidComposeElement(element)) {
          this.attachToComposeElement(element);
        }
      });
    });
  }

  /**
   * Check if element is a valid Gmail compose area
   */
  isValidComposeElement(element) {
    if (!element || !element.isContentEditable) return false;
    
    // Check if it's in a Gmail compose window
    const composeContainer = element.closest('.nH, .M9, .aDM, .n1tfz');
    if (!composeContainer) return false;

    // Exclude reply/signature areas that shouldn't have suggestions
    if (element.closest('.gmail_signature, .gmail_quote')) return false;

    return true;
  }

  /**
   * Attach event listeners to a compose element
   */
  attachToComposeElement(element) {
    if (element.dataset.emailCopilotAttached) return;
    
    console.log('Email Copilot: Attaching to compose element', element);
    
    // Mark as attached
    element.dataset.emailCopilotAttached = 'true';
    
    // Add wrapper class for styling
    element.classList.add('email-copilot-compose-wrapper');
    
    // Setup event listeners
    element.addEventListener('input', this.handleInput.bind(this));
    element.addEventListener('keydown', this.handleKeyDown.bind(this));
    element.addEventListener('focus', this.handleFocus.bind(this));
    element.addEventListener('blur', this.handleBlur.bind(this));
    element.addEventListener('click', this.handleClick.bind(this));
  }

  /**
   * Detach from a compose element
   */
  detachFromComposeElement(element) {
    if (!element.dataset.emailCopilotAttached) return;
    
    console.log('Email Copilot: Detaching from compose element', element);
    
    // Remove event listeners and cleanup
    element.removeEventListener('input', this.handleInput.bind(this));
    element.removeEventListener('keydown', this.handleKeyDown.bind(this));
    element.removeEventListener('focus', this.handleFocus.bind(this));
    element.removeEventListener('blur', this.handleBlur.bind(this));
    element.removeEventListener('click', this.handleClick.bind(this));
    
    // Clear ghost text
    this.ghostRenderer.hide();
    
    // Remove marker
    delete element.dataset.emailCopilotAttached;
    element.classList.remove('email-copilot-compose-wrapper');
    
    if (this.activeComposeElement === element) {
      this.activeComposeElement = null;
    }
  }

  /**
   * Handle input events on compose elements
   */
  handleInput(event) {
    const element = event.target;
    
    if (!this.isEnabled || !this.isValidComposeElement(element)) return;
    
    this.activeComposeElement = element;
    
    // Hide current suggestion
    this.hideSuggestion();
    
    // Get new suggestion after a delay
    this.debouncedGetSuggestion();
  }

  /**
   * Handle keydown events
   */
  handleKeyDown(event) {
    const element = event.target;
    
    if (!this.isEnabled || !this.isValidComposeElement(element)) return;
    
    // Update active element
    this.activeComposeElement = element;
    
    // Handle special keys that should hide suggestions
    if (['Enter', 'Backspace', 'Delete'].includes(event.key)) {
      this.hideSuggestion();
    }
  }

  /**
   * Handle focus events
   */
  handleFocus(event) {
    const element = event.target;
    
    if (!this.isValidComposeElement(element)) return;
    
    this.activeComposeElement = element;
  }

  /**
   * Handle blur events
   */
  handleBlur(event) {
    // Hide suggestion when losing focus
    setTimeout(() => {
      if (document.activeElement !== event.target) {
        this.hideSuggestion();
      }
    }, 100);
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    const element = event.target;
    
    if (!this.isValidComposeElement(element)) return;
    
    this.activeComposeElement = element;
    
    // Hide suggestion on click
    this.hideSuggestion();
  }

  /**
   * Get AI suggestion for current context
   */
  async getSuggestion() {
    if (!this.activeComposeElement || !this.isEnabled) return;
    
    try {
      const context = this.getEmailContext();
      const partialText = this.getPartialText();
      
      // Don't suggest if there's no meaningful text
      if (!partialText || partialText.trim().length < 3) return;
      
      // Don't suggest if cursor is not at end of word
      if (!this.isCursorAtWordEnd()) return;
      
      console.log('Email Copilot: Getting suggestion for:', partialText);
      
      // Call background script for AI completion
      const response = await chrome.runtime.sendMessage({
        type: 'get_ai_completion',
        context: context,
        partialText: partialText
      });
      
      if (response && response.success && response.suggestion) {
        this.showSuggestion(response.suggestion.trim());
      }
    } catch (error) {
      console.error('Email Copilot: Failed to get suggestion:', error);
    }
  }

  /**
   * Get email context for AI
   */
  getEmailContext() {
    if (!this.activeComposeElement) return '';
    
    // Try to get subject and recipient context
    let context = '';
    
    // Find subject line
    const subjectElement = document.querySelector('input[name="subjectbox"], input[placeholder*="Subject"]');
    if (subjectElement && subjectElement.value) {
      context += `Subject: ${subjectElement.value}\n`;
    }
    
    // Find recipient
    const recipientElement = document.querySelector('input[name="to"], textarea[name="to"]');
    if (recipientElement && recipientElement.value) {
      context += `To: ${recipientElement.value}\n`;
    }
    
    return context;
  }

  /**
   * Get partial text for completion
   */
  getPartialText() {
    if (!this.activeComposeElement) return '';
    
    const element = this.activeComposeElement;
    const text = element.textContent || element.innerText || '';
    
    // Get last 100 characters before cursor
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBeforeCursor = text.substring(0, range.startOffset);
      return textBeforeCursor.slice(-100);
    }
    
    return text.slice(-100);
  }

  /**
   * Check if cursor is at end of word
   */
  isCursorAtWordEnd() {
    if (!this.activeComposeElement) return false;
    
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return false;
    
    const text = textNode.textContent;
    const offset = range.startOffset;
    
    // Check if at end of word
    const charBefore = text.charAt(offset - 1);
    const charAfter = text.charAt(offset);
    
    return /\w/.test(charBefore) && (/\s/.test(charAfter) || charAfter === '');
  }

  /**
   * Show suggestion as ghost text
   */
  showSuggestion(suggestion) {
    if (!this.activeComposeElement || !suggestion) return;
    
    this.currentSuggestion = suggestion;
    
    // Show ghost text
    this.ghostRenderer.show(this.activeComposeElement, suggestion);
    
    // Update keyboard handler state
    this.keybindManager.setSuggestionVisible(true);
    
    console.log('Email Copilot: Showing suggestion:', suggestion);
  }

  /**
   * Hide current suggestion
   */
  hideSuggestion() {
    this.currentSuggestion = null;
    this.ghostRenderer.hide();
    this.keybindManager.setSuggestionVisible(false);
  }

  /**
   * Accept current suggestion
   */
  acceptSuggestion() {
    if (!this.currentSuggestion || !this.activeComposeElement) return;
    
    console.log('Email Copilot: Accepting suggestion:', this.currentSuggestion);
    
    // Insert suggestion text
    this.insertTextAtCursor(this.currentSuggestion);
    
    // Hide suggestion
    this.hideSuggestion();
    
    // Track usage
    this.trackUsage('accept');
  }

  /**
   * Reject current suggestion
   */
  rejectSuggestion() {
    if (!this.currentSuggestion) return;
    
    console.log('Email Copilot: Rejecting suggestion');
    
    // Hide suggestion
    this.hideSuggestion();
    
    // Track usage
    this.trackUsage('reject');
  }

  /**
   * Insert text at current cursor position
   */
  insertTextAtCursor(text) {
    if (!this.activeComposeElement) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode(text);
      
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger input event
      this.activeComposeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Track usage analytics
   */
  trackUsage(action) {
    chrome.runtime.sendMessage({
      type: 'track_usage',
      action: action,
      timestamp: Date.now()
    });
  }

  /**
   * Enable/disable the extension
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hideSuggestion();
    }
  }
}

// Include the utility classes inline to avoid import issues
// ... (include the classes from the other files directly here for simplicity)

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EmailCopilotContent();
  });
} else {
  new EmailCopilotContent();
}