/**
 * AI Client for Email Copilot Extension
 * Supports both Google Gemini and OpenAI APIs
 */

// Default configurations
const DEFAULT_CONFIG = {
  provider: 'gemini', // 'gemini' or 'openai'
  model: 'gemini-1.5-flash',
  maxTokens: 100,
  temperature: 0.7,
  timeout: 10000 // 10 seconds
};

// API endpoints
const ENDPOINTS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  openai: 'https://api.openai.com/v1/chat/completions'
};

/**
 * Email Copilot AI Client
 */
class AIClient {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the client with user settings
   */
  async initialize() {
    try {
      const settings = await this.getStoredSettings();
      this.config = { ...this.config, ...settings };
      return true;
    } catch (error) {
      console.error('Failed to initialize AI client:', error);
      return false;
    }
  }

  /**
   * Get stored settings from Chrome storage
   */
  async getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['aiProvider', 'apiKey', 'model'], (result) => {
        resolve({
          provider: result.aiProvider || 'gemini',
          apiKey: result.apiKey || '',
          model: result.model || 'gemini-1.5-flash'
        });
      });
    });
  }

  /**
   * Generate email completion suggestion
   * @param {string} context - The current email context
   * @param {string} partialText - The partial text being typed
   * @returns {Promise<string>} - The completion suggestion
   */
  async getEmailCompletion(context, partialText) {
    try {
      const prompt = this.buildEmailPrompt(context, partialText);
      
      if (this.config.provider === 'gemini') {
        return await this.callGeminiAPI(prompt);
      } else {
        return await this.callOpenAIAPI(prompt);
      }
    } catch (error) {
      console.error('Failed to get email completion:', error);
      return null;
    }
  }

  /**
   * Build optimized prompt for email completion
   */
  buildEmailPrompt(context, partialText) {
    return `You are an intelligent email writing assistant. Complete the following email text naturally and professionally.

Context: ${context}

Partial text: "${partialText}"

Rules:
- Provide ONLY the completion text, not the full email
- Keep it concise and contextually appropriate
- Match the writing tone and style
- Don't repeat the partial text
- Limit to 1-2 sentences maximum
- If unsure, provide a short, safe completion

Completion:`;
  }

  /**
   * Call Google Gemini API
   */
  async callGeminiAPI(prompt) {
    if (!this.config.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`${ENDPOINTS.gemini}?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stopSequences: ['\n\n', 'Context:', 'Partial text:']
        }
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return this.cleanCompletion(data.candidates[0].content.parts[0].text);
    }
    
    return null;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAIAPI(prompt) {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(ENDPOINTS.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stop: ['\n\n', 'Context:', 'Partial text:']
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return this.cleanCompletion(data.choices[0].message.content);
    }
    
    return null;
  }

  /**
   * Clean and format completion text
   */
  cleanCompletion(text) {
    return text
      .trim()
      .replace(/^(Completion:|Response:)/i, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const result = await this.getEmailCompletion(
        'Testing email connection',
        'Hello, this is a test'
      );
      return result !== null;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
const aiClient = new AIClient();

export default aiClient;