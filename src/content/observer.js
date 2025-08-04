/**
 * Gmail DOM Observer for Email Copilot
 * Watches for Gmail compose areas being added/removed from DOM
 */

class GmailObserver {
  constructor() {
    this.observer = null;
    this.observedElements = new Set();
    this.onComposeDetected = null;
    this.onComposeRemoved = null;
    this.isObserving = false;
  }

  /**
   * Start observing the DOM for Gmail compose changes
   */
  startObserving() {
    if (this.isObserving) return;

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable', 'role', 'aria-label']
    });

    this.isObserving = true;
    console.log('Gmail Observer: Started observing');
  }

  /**
   * Stop observing the DOM
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isObserving = false;
    this.observedElements.clear();
    console.log('Gmail Observer: Stopped observing');
  }

  /**
   * Handle DOM mutations
   * @param {MutationRecord[]} mutations - Array of mutation records
   */
  handleMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        this.handleChildListMutation(mutation);
      } else if (mutation.type === 'attributes') {
        this.handleAttributeMutation(mutation);
      }
    }
  }

  /**
   * Handle child list mutations (elements added/removed)
   * @param {MutationRecord} mutation - Mutation record
   */
  handleChildListMutation(mutation) {
    // Check added nodes
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.checkForComposeElements(node);
      }
    });

    // Check removed nodes
    mutation.removedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this.handleRemovedNode(node);
      }
    });
  }

  /**
   * Handle attribute mutations
   * @param {MutationRecord} mutation - Mutation record
   */
  handleAttributeMutation(mutation) {
    const element = mutation.target;
    
    if (this.isComposeElement(element)) {
      if (!this.observedElements.has(element)) {
        this.handleComposeDetected(element);
      }
    } else if (this.observedElements.has(element)) {
      this.handleComposeRemoved(element);
    }
  }

  /**
   * Check element and its descendants for compose areas
   * @param {Element} element - Element to check
   */
  checkForComposeElements(element) {
    // Check the element itself
    if (this.isComposeElement(element)) {
      this.handleComposeDetected(element);
    }

    // Check descendants
    const composeSelectors = [
      'div[role="textbox"][aria-label*="message body"]',
      'div[role="textbox"][aria-label*="Message Body"]',
      'div[contenteditable="true"][aria-label*="Message"]',
      'div[contenteditable="true"][role="textbox"]',
      '.Am.Al.editable',
      '[data-message-id] div[contenteditable="true"]'
    ];

    composeSelectors.forEach(selector => {
      try {
        const elements = element.querySelectorAll(selector);
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

  /**
   * Handle removed DOM nodes
   * @param {Element} element - Removed element
   */
  handleRemovedNode(element) {
    // Check if any observed compose elements were removed
    this.observedElements.forEach(observedElement => {
      if (!document.contains(observedElement) || element.contains(observedElement)) {
        this.handleComposeRemoved(observedElement);
      }
    });
  }

  /**
   * Check if element is a Gmail compose area
   * @param {Element} element - Element to check
   * @returns {boolean} - True if it's a compose element
   */
  isComposeElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    // Must be contenteditable
    if (!element.isContentEditable) return false;

    // Check for Gmail-specific indicators
    const isGmailCompose = this.hasGmailComposeIndicators(element);
    if (!isGmailCompose) return false;

    // Exclude certain elements
    if (this.shouldExcludeElement(element)) return false;

    return true;
  }

  /**
   * Check for Gmail compose indicators
   * @param {Element} element - Element to check
   * @returns {boolean} - True if has Gmail compose indicators
   */
  hasGmailComposeIndicators(element) {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label') || '';
    if (ariaLabel.toLowerCase().includes('message body') || 
        ariaLabel.toLowerCase().includes('message') ||
        ariaLabel.toLowerCase().includes('compose')) {
      return true;
    }

    // Check role
    if (element.getAttribute('role') === 'textbox') {
      return true;
    }

    // Check for Gmail-specific classes
    const gmailClasses = ['Am', 'Al', 'editable'];
    if (gmailClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }

    // Check parent containers for Gmail compose indicators
    const parent = element.closest('.nH, .M9, .aDM, .n1tfz, [role="dialog"]');
    if (parent) {
      // Look for compose-related elements in the parent
      const composeIndicators = parent.querySelectorAll('[aria-label*="Send"], [aria-label*="Subject"], .gU.Up');
      if (composeIndicators.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if element should be excluded
   * @param {Element} element - Element to check
   * @returns {boolean} - True if should be excluded
   */
  shouldExcludeElement(element) {
    // Exclude signature areas
    if (element.closest('.gmail_signature, .m_gmail_signature')) return true;

    // Exclude quoted content
    if (element.closest('.gmail_quote, .m_gmail_quote')) return true;

    // Exclude certain classes
    const excludeClasses = ['adP', 'adO', 'ii', 'a3s'];
    if (excludeClasses.some(cls => element.classList.contains(cls))) return true;

    // Exclude if too small (likely not main compose area)
    const rect = element.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 50) return true;

    // Exclude if not visible
    if (rect.width === 0 || rect.height === 0) return true;

    return false;
  }

  /**
   * Handle compose element detected
   * @param {Element} element - Detected compose element
   */
  handleComposeDetected(element) {
    if (this.observedElements.has(element)) return;

    console.log('Gmail Observer: Compose element detected', element);
    
    this.observedElements.add(element);

    if (this.onComposeDetected) {
      try {
        this.onComposeDetected(element);
      } catch (error) {
        console.error('Error in compose detected callback:', error);
      }
    }
  }

  /**
   * Handle compose element removed
   * @param {Element} element - Removed compose element
   */
  handleComposeRemoved(element) {
    if (!this.observedElements.has(element)) return;

    console.log('Gmail Observer: Compose element removed', element);
    
    this.observedElements.delete(element);

    if (this.onComposeRemoved) {
      try {
        this.onComposeRemoved(element);
      } catch (error) {
        console.error('Error in compose removed callback:', error);
      }
    }
  }

  /**
   * Get all currently observed compose elements
   * @returns {Set<Element>} - Set of observed elements
   */
  getObservedElements() {
    return new Set(this.observedElements);
  }

  /**
   * Check if specific element is being observed
   * @param {Element} element - Element to check
   * @returns {boolean} - True if being observed
   */
  isObserved(element) {
    return this.observedElements.has(element);
  }

  /**
   * Manually trigger check for compose elements
   */
  triggerCheck() {
    this.checkForComposeElements(document.body);
  }
}

export default GmailObserver;