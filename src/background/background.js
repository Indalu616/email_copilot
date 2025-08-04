/**
 * Background Service Worker for Email Copilot Extension
 * Handles API communication, storage, and extension lifecycle
 */

// Extension lifecycle
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Email Copilot: Extension installed/updated');
  
  if (details.reason === 'install') {
    // Set default settings on first install
    setDefaultSettings();
    
    // Open welcome page or settings
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup/index.html')
    });
  }
});

// Set default settings
async function setDefaultSettings() {
  const defaultSettings = {
    enabled: true,
    aiProvider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash',
    autoTrigger: true,
    triggerDelay: 500
  };
  
  try {
    await chrome.storage.sync.set(defaultSettings);
    console.log('Default settings applied');
  } catch (error) {
    console.error('Failed to set default settings:', error);
  }
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background: Received message', message.type);
  
  switch (message.type) {
    case 'test_api_connection':
      handleTestApiConnection(message, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'track_usage':
      handleTrackUsage(message);
      break;
      
    case 'get_settings':
      handleGetSettings(sendResponse);
      return true;
      
    default:
      console.log('Background: Unknown message type:', message.type);
  }
});

// Handle API connection testing
async function handleTestApiConnection(message, sendResponse) {
  try {
    const { provider, apiKey, model } = message;
    
    if (!apiKey) {
      sendResponse({ success: false, error: 'API key is required' });
      return;
    }
    
    const result = await testApiConnection(provider, apiKey, model);
    sendResponse({ success: result.success, error: result.error });
  } catch (error) {
    console.error('Background: API test failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Test API connection
async function testApiConnection(provider, apiKey, model) {
  const testPrompt = 'Complete this email: "Hello, I hope this message finds you"';
  
  try {
    if (provider === 'gemini') {
      return await testGeminiConnection(apiKey, testPrompt);
    } else if (provider === 'openai') {
      return await testOpenAIConnection(apiKey, model, testPrompt);
    } else {
      throw new Error('Unsupported AI provider');
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test Gemini API connection
async function testGeminiConnection(apiKey, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(endpoint, {
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
          maxOutputTokens: 50,
          temperature: 0.7
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return { success: true, response: data.candidates[0].content.parts[0].text };
    } else {
      throw new Error('Invalid response from Gemini API');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - check your internet connection');
    }
    throw error;
  }
}

// Test OpenAI API connection
async function testOpenAIConnection(apiKey, model, prompt) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 50,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return { success: true, response: data.choices[0].message.content };
    } else {
      throw new Error('Invalid response from OpenAI API');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - check your internet connection');
    }
    throw error;
  }
}

// Handle usage tracking
async function handleTrackUsage(message) {
  try {
    const { action, timestamp } = message;
    
    // Get current usage stats
    const result = await chrome.storage.local.get(['usageStats']);
    const usageStats = result.usageStats || {
      totalSuggestions: 0,
      acceptedSuggestions: 0,
      rejectedSuggestions: 0,
      dailyUsage: {}
    };
    
    // Update stats
    const today = new Date().toISOString().split('T')[0];
    
    if (!usageStats.dailyUsage[today]) {
      usageStats.dailyUsage[today] = {
        suggestions: 0,
        accepted: 0,
        rejected: 0
      };
    }
    
    if (action === 'accept') {
      usageStats.acceptedSuggestions++;
      usageStats.dailyUsage[today].accepted++;
    } else if (action === 'reject') {
      usageStats.rejectedSuggestions++;
      usageStats.dailyUsage[today].rejected++;
    }
    
    usageStats.totalSuggestions++;
    usageStats.dailyUsage[today].suggestions++;
    
    // Clean up old daily usage data (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    Object.keys(usageStats.dailyUsage).forEach(date => {
      if (new Date(date) < thirtyDaysAgo) {
        delete usageStats.dailyUsage[date];
      }
    });
    
    // Save updated stats
    await chrome.storage.local.set({ usageStats });
    
    console.log('Usage stats updated:', action);
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
}

// Handle get settings request
async function handleGetSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get([
      'enabled', 'aiProvider', 'apiKey', 'model', 'autoTrigger', 'triggerDelay'
    ]);
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Tab updates - inject content script when Gmail is loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isGmail = tab.url.includes('mail.google.com');
    
    if (isGmail) {
      console.log('Gmail tab detected, ensuring content script is injected');
      
      // Check if extension is enabled before injecting
      chrome.storage.sync.get(['enabled']).then(result => {
        if (result.enabled !== false) {
          injectContentScript(tabId);
        }
      });
    }
  }
});

// Inject content script into Gmail tabs
async function injectContentScript(tabId) {
  try {
    // Check if content script is already injected
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.emailCopilotInjected
    });
    
    if (results[0]?.result) {
      console.log('Content script already injected');
      return;
    }
    
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['contentScript.js']
    });
    
    console.log('Content script injected successfully');
  } catch (error) {
    console.error('Failed to inject content script:', error);
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will be handled by the popup, but we can add fallback logic here
  console.log('Extension icon clicked');
});

// Cleanup on extension disable/uninstall
chrome.runtime.onSuspend.addListener(() => {
  console.log('Email Copilot: Extension suspending');
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
  
  // Notify content scripts of settings changes
  if (namespace === 'sync' && changes.enabled) {
    notifyContentScripts('settings_changed', { enabled: changes.enabled.newValue });
  }
});

// Notify all Gmail tabs of changes
async function notifyContentScripts(type, data) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://mail.google.com/*' });
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type,
        ...data
      }).catch(error => {
        // Ignore errors for tabs without content script
      });
    });
  } catch (error) {
    console.error('Failed to notify content scripts:', error);
  }
}

// Error handling
chrome.runtime.onStartup.addListener(() => {
  console.log('Email Copilot: Extension starting up');
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20000);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();