import React, { useState, useEffect } from 'react';

const App = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    aiProvider: 'gemini',
    apiKey: '',
    model: 'gemini-1.5-flash',
    autoTrigger: true,
    triggerDelay: 500
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await chrome.storage.sync.get([
        'enabled', 'aiProvider', 'apiKey', 'model', 'autoTrigger', 'triggerDelay'
      ]);
      
      setSettings(prev => ({
        ...prev,
        ...stored
      }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await chrome.storage.sync.set(settings);
      
      // Notify content scripts of settings change
      const tabs = await chrome.tabs.query({ url: '*://mail.google.com/*' });
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'settings_updated',
          settings: settings
        }).catch(() => {
          // Ignore errors for tabs without content script
        });
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!settings.apiKey.trim()) {
      alert('Please enter an API key first.');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('testing');

    try {
      // Save current settings temporarily for testing
      await chrome.storage.sync.set(settings);
      
      const response = await chrome.runtime.sendMessage({
        type: 'test_api_connection',
        provider: settings.aiProvider,
        apiKey: settings.apiKey,
        model: settings.model
      });

      setConnectionStatus(response.success ? 'success' : 'error');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setConnectionStatus('unknown');
  };

  const getModelOptions = () => {
    if (settings.aiProvider === 'gemini') {
      return [
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Recommended)' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-pro', label: 'Gemini Pro' }
      ];
    } else {
      return [
        { value: 'gpt-4', label: 'GPT-4 (Recommended)' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
      ];
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'testing': return 'text-blue-600';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'success': return '✓ Connection successful';
      case 'error': return '✗ Connection failed';
      case 'testing': return 'Testing connection...';
      default: return 'Not tested';
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <h1 className="title">Email Copilot</h1>
          <p className="subtitle">AI-powered email autocomplete</p>
        </div>
        <div className="enable-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="content">
        {/* AI Provider Selection */}
        <div className="setting-group">
          <label className="setting-label">AI Provider</label>
          <div className="provider-options">
            <label className="radio-option">
              <input
                type="radio"
                name="aiProvider"
                value="gemini"
                checked={settings.aiProvider === 'gemini'}
                onChange={(e) => handleSettingChange('aiProvider', e.target.value)}
              />
              <span className="radio-label">
                <span className="provider-name">Google Gemini</span>
                <span className="provider-description">Fast and accurate</span>
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="aiProvider"
                value="openai"
                checked={settings.aiProvider === 'openai'}
                onChange={(e) => handleSettingChange('aiProvider', e.target.value)}
              />
              <span className="radio-label">
                <span className="provider-name">OpenAI GPT</span>
                <span className="provider-description">High quality responses</span>
              </span>
            </label>
          </div>
        </div>

        {/* API Key */}
        <div className="setting-group">
          <label className="setting-label">
            API Key
            <a 
              href={settings.aiProvider === 'gemini' 
                ? 'https://makersuite.google.com/app/apikey'
                : 'https://platform.openai.com/api-keys'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="api-key-link"
            >
              Get API Key →
            </a>
          </label>
          <div className="api-key-container">
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => handleSettingChange('apiKey', e.target.value)}
              placeholder={`Enter your ${settings.aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
              className="api-key-input"
            />
            <button
              onClick={testConnection}
              disabled={!settings.apiKey.trim() || isTestingConnection}
              className="test-button"
            >
              {isTestingConnection ? '...' : 'Test'}
            </button>
          </div>
          <div className={`connection-status ${getConnectionStatusColor()}`}>
            {getConnectionStatusText()}
          </div>
        </div>

        {/* Model Selection */}
        <div className="setting-group">
          <label className="setting-label">Model</label>
          <select
            value={settings.model}
            onChange={(e) => handleSettingChange('model', e.target.value)}
            className="model-select"
          >
            {getModelOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Settings */}
        <div className="setting-group">
          <label className="setting-label">Advanced Settings</label>
          
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={settings.autoTrigger}
              onChange={(e) => handleSettingChange('autoTrigger', e.target.checked)}
            />
            <span>Auto-trigger suggestions while typing</span>
          </label>

          <div className="delay-setting">
            <label>Trigger delay: {settings.triggerDelay}ms</label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={settings.triggerDelay}
              onChange={(e) => handleSettingChange('triggerDelay', parseInt(e.target.value))}
              className="delay-slider"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="setting-group">
          <label className="setting-label">Keyboard Shortcuts</label>
          <div className="shortcuts-list">
            <div className="shortcut-item">
              <span className="shortcut-keys">Tab</span>
              <span>Accept suggestion</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-keys">Esc</span>
              <span>Dismiss suggestion</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-keys">Ctrl + Space</span>
              <span>Manual trigger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`save-button ${showSuccess ? 'success' : ''}`}
        >
          {showSuccess ? '✓ Saved!' : isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Status Messages */}
      {!settings.enabled && (
        <div className="status-message warning">
          Extension is disabled. Enable it to use AI suggestions.
        </div>
      )}
    </div>
  );
};

export default App;