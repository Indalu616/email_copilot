/**
 * Email Copilot Content Script - GitHub Copilot Style
 * Real-time AI autocomplete for Gmail with instant suggestions
 */

// Prevent multiple injections
if (window.emailCopilotInjected) {
  console.log('📧 Email Copilot: Already injected, skipping');
} else {
  window.emailCopilotInjected = true;
  console.log('📧 Email Copilot: Injecting GitHub Copilot-style content script');

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Lightweight debounce for API calls only
   */
  function debounce(func, wait) {
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
      .slice(0, 300); // Shorter suggestions for real-time feel
  }

  /**
   * Check if user is selecting text
   */
  function hasTextSelection() {
    const selection = window.getSelection();
    return selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed;
  }

  /**
   * Get text content and cursor position
   */
  function getTextAndCursor(element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const textContent = element.textContent || '';
    
    // Get cursor position in text
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const caretOffset = preCaretRange.toString().length;

    return {
      fullText: textContent,
      textBeforeCursor: textContent.substring(0, caretOffset),
      textAfterCursor: textContent.substring(caretOffset),
      cursorOffset: caretOffset,
      range: range
    };
  }

  // =============================================================================
  // REAL-TIME SUGGESTION ENGINE
  // =============================================================================

  class RealTimeSuggestionEngine {
    constructor() {
      this.activeRequests = new Map();
      this.cache = new Map();
      this.cacheSize = 100;
      this.lastRequestTime = 0;
      this.minRequestInterval = 150; // Minimum 150ms between requests
    }

    async getSuggestion(text, context = '') {
      const now = Date.now();
      const cacheKey = this.getCacheKey(text, context);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Throttle requests to prevent spam
      if (now - this.lastRequestTime < this.minRequestInterval) {
        return { success: false, error: 'Rate limited' };
      }

      // Cancel previous request for same key
      if (this.activeRequests.has(cacheKey)) {
        this.activeRequests.get(cacheKey).cancel();
      }

      this.lastRequestTime = now;

      try {
        const result = await this.makeApiRequest(text, context, cacheKey);
        
        if (result.success && result.suggestion) {
          this.addToCache(cacheKey, result);
        }
        
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    async makeApiRequest(text, context, cacheKey) {
      return new Promise((resolve, reject) => {
        let cancelled = false;
        
        // Store cancellation function
        this.activeRequests.set(cacheKey, {
          cancel: () => { cancelled = true; }
        });

        // Make API call
        chrome.runtime.sendMessage({
          type: 'get_ai_completion',
          context: context,
          partialText: text,
          prompt: this.buildPrompt(text, context)
        }).then(response => {
          this.activeRequests.delete(cacheKey);
          
          if (cancelled) {
            reject(new Error('Request cancelled'));
            return;
          }

          if (response && response.success) {
            const suggestion = sanitizeText(response.suggestion);
            if (suggestion && suggestion.length > 0) {
              resolve({ success: true, suggestion });
            } else {
              resolve({ success: false, error: 'Empty suggestion' });
            }
          } else {
            resolve({ 
              success: false, 
              error: response?.error || 'API request failed' 
            });
          }
        }).catch(error => {
          this.activeRequests.delete(cacheKey);
          if (!cancelled) {
            reject(error);
          }
        });
      });
    }

    buildPrompt(text, context) {
      // GitHub Copilot style prompt - shorter and more focused
      let prompt = "Complete this email naturally:";
      
      if (context.trim()) {
        prompt += `\n\nContext: ${context}`;
      }
      
      prompt += `\n\nText: "${text}"`;
      prompt += "\n\nContinue with 1 sentence:";
      
      return prompt;
    }

    getCacheKey(text, context) {
      return `${text.slice(-50)}|${context}`.toLowerCase();
    }

    addToCache(key, result) {
      if (this.cache.size >= this.cacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      this.cache.set(key, result);
    }

    cancelAllRequests() {
      this.activeRequests.forEach(request => request.cancel());
      this.activeRequests.clear();
    }
  }

  // =============================================================================
  // REAL-TIME GHOST RENDERER
  // =============================================================================

  class RealTimeGhostRenderer {
    constructor() {
      this.activeGhost = null;
      this.targetElement = null;
      this.currentSuggestion = '';
    }

    showSuggestion(element, suggestion, insertPosition) {
      if (!element || !suggestion || !insertPosition) {
        return false;
      }

      // Remove any existing ghost
      this.hideSuggestion();

      try {
        this.targetElement = element;
        this.currentSuggestion = suggestion;
        
        // Create ghost element
        this.activeGhost = document.createElement('span');
        this.activeGhost.className = 'copilot-ghost-suggestion';
        this.activeGhost.textContent = suggestion;
        this.activeGhost.setAttribute('data-copilot-ghost', 'true');
        
        // GitHub Copilot styling
        Object.assign(this.activeGhost.style, {
          color: '#6e7681',
          backgroundColor: 'transparent',
          fontStyle: 'normal',
          opacity: '0.6',
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          lineHeight: 'inherit',
          whiteSpace: 'pre-wrap',
          display: 'inline'
        });

        // Insert at cursor position
        const range = insertPosition.range.cloneRange();
        range.collapse(false);
        range.insertNode(this.activeGhost);
        
        // Restore cursor position after ghost
        range.setStartAfter(this.activeGhost);
        range.collapse(true);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        console.log('👻 Real-time suggestion shown:', suggestion);
        return true;

      } catch (error) {
        console.error('👻 Failed to show suggestion:', error);
        this.cleanup();
        return false;
      }
    }

    hideSuggestion() {
      if (this.activeGhost) {
        try {
          // Store cursor position before removing ghost
          const selection = window.getSelection();
          let range = null;
          
          if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            // If cursor is after ghost, move it before
            if (range.startContainer === this.activeGhost.nextSibling || 
                range.startContainer === this.activeGhost.parentNode) {
              range.setStartBefore(this.activeGhost);
              range.collapse(true);
            }
          }
          
          this.activeGhost.remove();
          
          // Restore cursor position
          if (range) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      this.cleanup();
    }

    acceptSuggestion() {
      if (!this.activeGhost || !this.currentSuggestion) {
        return false;
      }

      try {
        // Replace ghost with actual text
        const textNode = document.createTextNode(this.currentSuggestion);
        this.activeGhost.parentNode.replaceChild(textNode, this.activeGhost);
        
        // Position cursor after inserted text
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        this.targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        
        this.cleanup();
        console.log('✅ Suggestion accepted:', this.currentSuggestion);
        return true;

      } catch (error) {
        console.error('❌ Failed to accept suggestion:', error);
        this.hideSuggestion();
        return false;
      }
    }

    cleanup() {
      this.activeGhost = null;
      this.targetElement = null;
      this.currentSuggestion = '';
    }

    hasActiveSuggestion() {
      return this.activeGhost !== null;
    }

    getCurrentSuggestion() {
      return this.currentSuggestion;
    }
  }

  // =============================================================================
  // REAL-TIME INPUT PROCESSOR
  // =============================================================================

  class RealTimeInputProcessor {
    constructor(suggestionEngine, ghostRenderer) {
      this.suggestionEngine = suggestionEngine;
      this.ghostRenderer = ghostRenderer;
      this.activeElement = null;
      this.isProcessing = false;
      this.lastProcessedText = '';
      this.processingTimeout = null;
      
      // Debounce for API calls only (not for hiding suggestions)
      this.debouncedApiCall = debounce(this.makeApiCall.bind(this), 200);
    }

    attachToElement(element) {
      if (element.hasAttribute('data-copilot-attached')) return;
      
      element.setAttribute('data-copilot-attached', 'true');
      
      // Real-time input handler - NO debouncing
      element.addEventListener('input', this.handleInput.bind(this));
      element.addEventListener('keydown', this.handleKeyDown.bind(this));
      element.addEventListener('compositionstart', this.handleCompositionStart.bind(this));
      element.addEventListener('compositionend', this.handleCompositionEnd.bind(this));
      
      console.log('📧 Real-time processor attached to element');
    }

    handleInput(event) {
      const element = event.target;
      this.activeElement = element;

      // Hide suggestion immediately on any input
      this.ghostRenderer.hideSuggestion();

      // Don't process if user is selecting text
      if (hasTextSelection()) {
        return;
      }

      const textInfo = getTextAndCursor(element);
      if (!textInfo) return;

      const currentText = textInfo.textBeforeCursor;
      
      // Check if we should trigger suggestion
      if (this.shouldTriggerSuggestion(currentText, textInfo)) {
        // Clear any pending API call
        if (this.processingTimeout) {
          clearTimeout(this.processingTimeout);
        }
        
        // Trigger API call with short delay
        this.processingTimeout = setTimeout(() => {
          this.debouncedApiCall(currentText, textInfo);
        }, 50); // Very short delay for responsive feel
      }
    }

    handleKeyDown(event) {
      const key = event.key;
      
      // Handle Tab to accept suggestion
      if (key === 'Tab' && this.ghostRenderer.hasActiveSuggestion()) {
        event.preventDefault();
        event.stopPropagation();
        this.ghostRenderer.acceptSuggestion();
        return;
      }
      
      // Handle Escape to dismiss suggestion
      if (key === 'Escape' && this.ghostRenderer.hasActiveSuggestion()) {
        event.preventDefault();
        event.stopPropagation();
        this.ghostRenderer.hideSuggestion();
        return;
      }
      
      // Handle Ctrl+Space for manual trigger
      if (event.ctrlKey && key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        this.triggerManualSuggestion();
        return;
      }
      
      // Hide suggestion on navigation keys
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
        this.ghostRenderer.hideSuggestion();
        return;
      }
      
      // Hide suggestion on backspace/delete
      if (['Backspace', 'Delete'].includes(key)) {
        this.ghostRenderer.hideSuggestion();
        return;
      }
    }

    handleCompositionStart() {
      // Hide suggestions during IME composition
      this.ghostRenderer.hideSuggestion();
    }

    handleCompositionEnd() {
      // Trigger suggestion after composition ends
      setTimeout(() => {
        if (this.activeElement) {
          const textInfo = getTextAndCursor(this.activeElement);
          if (textInfo) {
            this.handleInput({ target: this.activeElement });
          }
        }
      }, 50);
    }

    shouldTriggerSuggestion(text, textInfo) {
      // Don't trigger if text is too short
      if (text.length < 8) return false;
      
      // Don't trigger if we just processed this text
      if (text === this.lastProcessedText) return false;
      
      // Don't trigger if cursor is not at end
      if (textInfo.textAfterCursor.trim().length > 0) return false;
      
      // Don't trigger if text ends with punctuation
      if (/[.!?]\s*$/.test(text)) return false;
      
      // Don't trigger if currently processing
      if (this.isProcessing) return false;
      
      // Must have at least 2 words
      const words = text.trim().split(/\s+/);
      if (words.length < 2) return false;
      
      return true;
    }

    async makeApiCall(text, textInfo) {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      this.lastProcessedText = text;
      
      try {
        const context = this.getEmailContext();
        console.log('🤖 Requesting real-time suggestion for:', text.slice(-30));
        
        const result = await this.suggestionEngine.getSuggestion(text, context);
        
        // Only show if we're still on the same text and element
        const currentTextInfo = getTextAndCursor(this.activeElement);
        if (currentTextInfo && 
            currentTextInfo.textBeforeCursor === text && 
            this.activeElement === document.activeElement) {
          
          if (result.success && result.suggestion) {
            this.ghostRenderer.showSuggestion(
              this.activeElement, 
              result.suggestion, 
              currentTextInfo
            );
            this.trackUsage('suggestion_shown');
          }
        }
        
      } catch (error) {
        console.error('🤖 Real-time suggestion failed:', error);
      } finally {
        this.isProcessing = false;
      }
    }

    async triggerManualSuggestion() {
      if (!this.activeElement) return;
      
      const textInfo = getTextAndCursor(this.activeElement);
      if (!textInfo) return;
      
      const text = textInfo.textBeforeCursor;
      if (text.length < 3) {
        this.showStatusMessage('Type more text for suggestions');
        return;
      }
      
      // Force suggestion regardless of normal conditions
      this.lastProcessedText = ''; // Reset to force processing
      await this.makeApiCall(text, textInfo);
    }

    getEmailContext() {
      let context = '';
      
      try {
        // Get subject
        const subjectElement = document.querySelector('input[name="subjectbox"], input[aria-label*="subject" i]');
        if (subjectElement?.value) {
          context += `Subject: ${subjectElement.value}\n`;
        }
        
        return context.trim();
      } catch (error) {
        return '';
      }
    }

    showStatusMessage(message) {
      // Show temporary status message
      const statusEl = document.createElement('div');
      statusEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1f2937;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      statusEl.textContent = message;
      document.body.appendChild(statusEl);
      
      setTimeout(() => statusEl.remove(), 2000);
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
  }

  // =============================================================================
  // GMAIL OBSERVER
  // =============================================================================

  class GmailComposeObserver {
    constructor(inputProcessor) {
      this.inputProcessor = inputProcessor;
      this.observer = null;
      this.attachedElements = new Set();
    }

    start() {
      this.observer = new MutationObserver(this.handleMutations.bind(this));
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['contenteditable', 'role', 'aria-label']
      });

      // Check for existing compose areas
      this.scanForComposeAreas();
      console.log('📧 Gmail observer started');
    }

    handleMutations(mutations) {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForComposeAreas(node);
            }
          });
        } else if (mutation.type === 'attributes') {
          this.checkElement(mutation.target);
        }
      }
    }

    scanForComposeAreas(root = document.body) {
      const selectors = [
        'div[role="textbox"][aria-label*="message body" i]',
        'div[role="textbox"][aria-label*="Message Body" i]',
        'div[contenteditable="true"][aria-label*="message" i]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"][g_editable="true"]',
        '.Am.Al.editable',
        '.editable[contenteditable="true"]'
      ];

      selectors.forEach(selector => {
        try {
          const elements = root.querySelectorAll ? 
            root.querySelectorAll(selector) : 
            (root.matches && root.matches(selector) ? [root] : []);
          
          elements.forEach(element => this.checkElement(element));
        } catch (error) {
          // Ignore invalid selectors
        }
      });
    }

    checkElement(element) {
      if (this.isValidComposeElement(element) && !this.attachedElements.has(element)) {
        this.attachedElements.add(element);
        this.inputProcessor.attachToElement(element);
        this.showAttachmentIndicator(element);
        console.log('📧 Attached to compose element:', element);
      }
    }

    isValidComposeElement(element) {
      if (!element || !element.isContentEditable) return false;
      if (element.hasAttribute('data-copilot-attached')) return false;

      // Must be in Gmail compose container
      const composeContainer = element.closest('.nH, .M9, .aDM, .n1tfz, .aO7');
      if (!composeContainer) return false;

      // Exclude signatures, quotes, etc.
      const exclusions = [
        '.gmail_signature', '.gmail_quote', '.ii', '.adP', '.adO',
        '[aria-label*="subject" i]', '[aria-label*="to" i]', '[aria-label*="cc" i]'
      ];
      
      for (const exc of exclusions) {
        if (element.matches(exc) || element.closest(exc)) {
          return false;
        }
      }

      // Check size
      const rect = element.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 30) return false;

      return true;
    }

    showAttachmentIndicator(element) {
      const indicator = document.createElement('div');
      indicator.style.cssText = `
        position: absolute;
        top: -20px;
        right: 5px;
        background: #10b981;
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 500;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      indicator.textContent = '⚡ Copilot';
      
      const container = element.parentElement;
      if (container) {
        container.style.position = 'relative';
        container.appendChild(indicator);
        setTimeout(() => indicator.remove(), 3000);
      }
    }

    stop() {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.attachedElements.clear();
    }
  }

  // =============================================================================
  // MAIN COPILOT CLASS
  // =============================================================================

  class EmailCopilot {
    constructor() {
      this.suggestionEngine = new RealTimeSuggestionEngine();
      this.ghostRenderer = new RealTimeGhostRenderer();
      this.inputProcessor = new RealTimeInputProcessor(this.suggestionEngine, this.ghostRenderer);
      this.gmailObserver = new GmailComposeObserver(this.inputProcessor);
      
      this.init();
    }

    async init() {
      console.log('📧 Email Copilot: Initializing real-time completion...');
      
      try {
        // Check if enabled
        const settings = await this.getSettings();
        if (settings.enabled === false) {
          console.log('📧 Extension is disabled');
          return;
        }
        
        // Inject styles
        this.injectStyles();
        
        // Start observing Gmail
        this.gmailObserver.start();
        
        // Show activation notification
        this.showActivationNotification();
        
        console.log('✅ Email Copilot: Real-time completion active!');
        
      } catch (error) {
        console.error('❌ Email Copilot: Failed to initialize:', error);
      }
    }

    async getSettings() {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get_settings' });
        return response?.success ? response.settings : {};
      } catch (error) {
        return {};
      }
    }

    showActivationNotification() {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.3s ease;
      `;
      notification.innerHTML = '⚡ Email Copilot<br><small>Real-time suggestions active</small>';
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 4000);
    }

    injectStyles() {
      if (document.getElementById('email-copilot-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'email-copilot-styles';
      style.textContent = `
        .copilot-ghost-suggestion {
          color: #6e7681 !important;
          background-color: transparent !important;
          font-style: normal !important;
          opacity: 0.6 !important;
          pointer-events: none !important;
          user-select: none !important;
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
          white-space: pre-wrap !important;
          display: inline !important;
          transition: opacity 0.1s ease !important;
        }
        
        .copilot-ghost-suggestion:hover {
          opacity: 0.8 !important;
        }
      `;
      
      document.head.appendChild(style);
    }

    destroy() {
      this.gmailObserver.stop();
      this.suggestionEngine.cancelAllRequests();
      this.ghostRenderer.hideSuggestion();
      
      const styles = document.getElementById('email-copilot-styles');
      if (styles) styles.remove();
    }
  }

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // Initialize immediately for real-time feel
  function initializeEmailCopilot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          window.emailCopilot = new EmailCopilot();
        }, 500);
      });
    } else {
      setTimeout(() => {
        window.emailCopilot = new EmailCopilot();
      }, 500);
    }
  }

  // Start initialization
  initializeEmailCopilot();
}