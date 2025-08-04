/**
 * Ghost Text Renderer for Email Copilot
 * Renders inline suggestions similar to GitHub Copilot
 */

class GhostTextRenderer {
  constructor() {
    this.ghostElement = null;
    this.targetElement = null;
    this.isVisible = false;
    this.resizeObserver = null;
  }

  /**
   * Show ghost text suggestion
   * @param {HTMLElement} targetElement - The element to show suggestion in
   * @param {string} suggestion - The suggestion text to display
   */
  show(targetElement, suggestion) {
    if (!targetElement || !suggestion) return;

    this.targetElement = targetElement;
    this.hide(); // Hide any existing ghost text
    
    this.createGhostElement(suggestion);
    this.positionGhostElement();
    this.attachToElement();
    
    this.isVisible = true;
    
    // Set up resize observer to reposition on layout changes
    this.setupResizeObserver();
  }

  /**
   * Hide ghost text
   */
  hide() {
    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.isVisible = false;
    this.targetElement = null;
  }

  /**
   * Create the ghost text element
   * @param {string} suggestion - The suggestion text
   */
  createGhostElement(suggestion) {
    this.ghostElement = document.createElement('div');
    this.ghostElement.className = 'email-copilot-ghost-text';
    this.ghostElement.textContent = suggestion;
    this.ghostElement.style.cssText = `
      position: absolute;
      color: #9ca3af;
      background: transparent;
      pointer-events: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      z-index: 1000;
      opacity: 0.6;
      transition: opacity 0.2s ease;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      font-weight: inherit;
      text-decoration: none;
      text-align: left;
      border: none;
      outline: none;
      margin: 0;
      padding: 0;
    `;
  }

  /**
   * Position the ghost element at the cursor
   */
  positionGhostElement() {
    if (!this.ghostElement || !this.targetElement) return;

    const cursorPosition = this.getCursorPosition();
    if (!cursorPosition) return;

    // Copy font styles from target element
    this.copyFontStyles();
    
    // Position relative to cursor
    this.ghostElement.style.left = `${cursorPosition.x}px`;
    this.ghostElement.style.top = `${cursorPosition.y}px`;
  }

  /**
   * Get current cursor position
   * @returns {Object|null} - Cursor position {x, y} or null
   */
  getCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    
    // Create a temporary element to measure position
    const tempElement = document.createElement('span');
    tempElement.textContent = '\u200B'; // Zero-width space
    
    try {
      range.insertNode(tempElement);
      const rect = tempElement.getBoundingClientRect();
      const targetRect = this.targetElement.getBoundingClientRect();
      
      // Calculate position relative to target element
      const position = {
        x: rect.left - targetRect.left,
        y: rect.top - targetRect.top
      };
      
      // Clean up temporary element
      tempElement.remove();
      
      return position;
    } catch (error) {
      console.error('Failed to get cursor position:', error);
      return null;
    }
  }

  /**
   * Copy font styles from target element to ghost element
   */
  copyFontStyles() {
    if (!this.ghostElement || !this.targetElement) return;

    const computedStyle = window.getComputedStyle(this.targetElement);
    
    const stylesToCopy = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'wordSpacing'
    ];

    stylesToCopy.forEach(property => {
      this.ghostElement.style[property] = computedStyle[property];
    });
  }

  /**
   * Attach ghost element to the DOM
   */
  attachToElement() {
    if (!this.ghostElement || !this.targetElement) return;

    // Find a suitable container (preferably the target's parent)
    let container = this.targetElement.parentElement;
    
    // Ensure container has relative positioning
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    container.appendChild(this.ghostElement);
    
    // Animate in
    setTimeout(() => {
      if (this.ghostElement) {
        this.ghostElement.classList.add('visible');
      }
    }, 10);
  }

  /**
   * Setup resize observer to reposition ghost text on layout changes
   */
  setupResizeObserver() {
    if (!window.ResizeObserver || !this.targetElement) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isVisible && this.ghostElement) {
        this.positionGhostElement();
      }
    });

    this.resizeObserver.observe(this.targetElement);
    this.resizeObserver.observe(document.body);
  }

  /**
   * Update ghost text content
   * @param {string} newSuggestion - New suggestion text
   */
  updateSuggestion(newSuggestion) {
    if (!this.ghostElement || !this.isVisible) return;

    this.ghostElement.textContent = newSuggestion;
    this.positionGhostElement();
  }

  /**
   * Check if ghost text is currently visible
   * @returns {boolean} - True if visible
   */
  isGhostVisible() {
    return this.isVisible && this.ghostElement && this.ghostElement.parentElement;
  }

  /**
   * Set ghost text opacity
   * @param {number} opacity - Opacity value (0-1)
   */
  setOpacity(opacity) {
    if (this.ghostElement) {
      this.ghostElement.style.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Get ghost text content
   * @returns {string} - Current ghost text content
   */
  getGhostText() {
    return this.ghostElement ? this.ghostElement.textContent : '';
  }
}

export default GhostTextRenderer;