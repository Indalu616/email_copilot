/**
 * Keyboard Bindings and Utility Functions for Email Copilot
 */

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
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
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Keyboard event handler class for managing hotkeys
 */
export class KeybindManager {
  constructor() {
    this.handlers = new Map();
    this.isEnabled = true;
  }

  /**
   * Register a keyboard handler
   * @param {string} key - Key combination (e.g., 'Tab', 'Escape', 'Ctrl+Space')
   * @param {Function} handler - Handler function
   * @param {Object} options - Options for the handler
   */
  register(key, handler, options = {}) {
    const keyConfig = {
      handler,
      preventDefault: options.preventDefault !== false,
      stopPropagation: options.stopPropagation !== false,
      condition: options.condition || (() => true)
    };
    
    this.handlers.set(key.toLowerCase(), keyConfig);
  }

  /**
   * Unregister a keyboard handler
   * @param {string} key - Key combination to remove
   */
  unregister(key) {
    this.handlers.delete(key.toLowerCase());
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyEvent(event) {
    if (!this.isEnabled) return;

    const key = this.getKeyString(event);
    const keyConfig = this.handlers.get(key);

    if (keyConfig && keyConfig.condition(event)) {
      if (keyConfig.preventDefault) {
        event.preventDefault();
      }
      if (keyConfig.stopPropagation) {
        event.stopPropagation();
      }
      
      keyConfig.handler(event);
    }
  }

  /**
   * Convert keyboard event to key string
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} - Key string representation
   */
  getKeyString(event) {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  /**
   * Enable keyboard handling
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable keyboard handling
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Clear all handlers
   */
  clear() {
    this.handlers.clear();
  }
}

/**
 * Email Copilot specific keybind manager
 */
export class EmailCopilotKeybinds extends KeybindManager {
  constructor() {
    super();
    this.suggestionVisible = false;
    this.onAcceptSuggestion = null;
    this.onRejectSuggestion = null;
    this.onTriggerSuggestion = null;
    
    this.setupDefaultBindings();
  }

  /**
   * Setup default keyboard bindings for Email Copilot
   */
  setupDefaultBindings() {
    // Tab to accept suggestion
    this.register('tab', (event) => {
      if (this.suggestionVisible && this.onAcceptSuggestion) {
        this.onAcceptSuggestion(event);
      }
    }, {
      condition: () => this.suggestionVisible
    });

    // Escape to reject suggestion
    this.register('escape', (event) => {
      if (this.suggestionVisible && this.onRejectSuggestion) {
        this.onRejectSuggestion(event);
      }
    }, {
      condition: () => this.suggestionVisible
    });

    // Ctrl+Space to manually trigger suggestion
    this.register('ctrl+space', (event) => {
      if (this.onTriggerSuggestion) {
        this.onTriggerSuggestion(event);
      }
    });

    // Arrow keys to dismiss suggestion
    ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].forEach(key => {
      this.register(key, (event) => {
        if (this.suggestionVisible && this.onRejectSuggestion) {
          this.onRejectSuggestion(event);
        }
      }, {
        preventDefault: false,
        condition: () => this.suggestionVisible
      });
    });
  }

  /**
   * Set suggestion visibility state
   * @param {boolean} visible - Whether suggestion is visible
   */
  setSuggestionVisible(visible) {
    this.suggestionVisible = visible;
  }

  /**
   * Set callback for accepting suggestions
   * @param {Function} callback - Accept callback function
   */
  setAcceptCallback(callback) {
    this.onAcceptSuggestion = callback;
  }

  /**
   * Set callback for rejecting suggestions
   * @param {Function} callback - Reject callback function
   */
  setRejectCallback(callback) {
    this.onRejectSuggestion = callback;
  }

  /**
   * Set callback for triggering suggestions
   * @param {Function} callback - Trigger callback function
   */
  setTriggerCallback(callback) {
    this.onTriggerSuggestion = callback;
  }
}

/**
 * Text manipulation utilities
 */
export class TextUtils {
  /**
   * Get the current cursor position in a text element
   * @param {HTMLElement} element - Text input element
   * @returns {number} - Cursor position
   */
  static getCursorPosition(element) {
    if (element.selectionStart !== undefined) {
      return element.selectionStart;
    }
    return 0;
  }

  /**
   * Set cursor position in a text element
   * @param {HTMLElement} element - Text input element
   * @param {number} position - Position to set cursor
   */
  static setCursorPosition(element, position) {
    if (element.setSelectionRange) {
      element.focus();
      element.setSelectionRange(position, position);
    }
  }

  /**
   * Insert text at cursor position
   * @param {HTMLElement} element - Text input element
   * @param {string} text - Text to insert
   */
  static insertTextAtCursor(element, text) {
    const cursorPos = this.getCursorPosition(element);
    const currentValue = element.value;
    const newValue = currentValue.slice(0, cursorPos) + text + currentValue.slice(cursorPos);
    
    element.value = newValue;
    this.setCursorPosition(element, cursorPos + text.length);
    
    // Trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Get text context around cursor
   * @param {HTMLElement} element - Text input element
   * @param {number} contextLength - Length of context to retrieve
   * @returns {Object} - Context object with before and after text
   */
  static getTextContext(element, contextLength = 100) {
    const cursorPos = this.getCursorPosition(element);
    const text = element.value;
    
    return {
      before: text.slice(Math.max(0, cursorPos - contextLength), cursorPos),
      after: text.slice(cursorPos, Math.min(text.length, cursorPos + contextLength)),
      cursor: cursorPos,
      full: text
    };
  }

  /**
   * Check if cursor is at end of word
   * @param {HTMLElement} element - Text input element
   * @returns {boolean} - True if cursor is at end of word
   */
  static isCursorAtWordEnd(element) {
    const context = this.getTextContext(element, 10);
    const beforeText = context.before;
    const afterChar = context.after.charAt(0);
    
    // Check if last character before cursor is alphanumeric
    // and next character is space or punctuation
    const lastChar = beforeText.charAt(beforeText.length - 1);
    const isLastCharAlphanumeric = /\w/.test(lastChar);
    const isNextCharSpace = /\s/.test(afterChar) || afterChar === '';
    
    return isLastCharAlphanumeric && isNextCharSpace;
  }
}

// Create global instance
export const emailKeybinds = new EmailCopilotKeybinds();