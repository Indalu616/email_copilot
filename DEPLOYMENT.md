# Email Copilot - Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Node.js 16+ and npm installed
- Chrome browser for testing
- API key from Google Gemini or OpenAI

### 1. Build the Extension

```bash
# Install dependencies
npm install

# Build for production
npm run build:extension
```

This creates a `dist/` folder with the built extension.

### 2. Load in Chrome (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder
5. The extension should now appear in your extensions list

### 3. Configure the Extension

1. Click the Email Copilot icon in the Chrome toolbar
2. Choose your AI provider (Gemini recommended)
3. Enter your API key:
   - **Gemini**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
4. Test the connection
5. Save settings

### 4. Test in Gmail

1. Open [Gmail](https://mail.google.com)
2. Start composing a new email
3. Type some text and wait for suggestions
4. Use `Tab` to accept or `Esc` to dismiss suggestions

## 📦 Production Deployment

### Chrome Web Store Preparation

1. **Zip the extension:**
   ```bash
   cd dist
   zip -r email-copilot-extension.zip *
   ```

2. **Create store assets:**
   - Screenshots (1280x800 or 640x400)
   - Promotional images (440x280, 920x680)
   - Extension description and changelog

3. **Submit to Chrome Web Store:**
   - Go to [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay one-time $5 developer fee
   - Upload zip file
   - Fill in store listing details
   - Submit for review

### Enterprise Deployment

For enterprise deployment, you can distribute the extension via:

1. **Google Admin Console** (for G Suite organizations)
2. **Group Policy** (for Windows environments)
3. **Manual installation** instructions for users

## 🔧 Build Configuration

The extension is built with:
- **Vite** for fast bundling
- **React** for the popup interface
- **Tailwind CSS** for styling
- **Manifest V3** for modern Chrome extension API

### Build Output Structure

```
dist/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── contentScript.js       # Gmail integration
├── popup.js              # Settings interface
├── src/popup/index.html  # Popup HTML
├── assets/               # CSS and other assets
└── icons/               # Extension icons
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup opens and displays correctly
- [ ] API key validation works
- [ ] Connection test succeeds
- [ ] Gmail detection works
- [ ] Ghost text appears on typing
- [ ] Tab accepts suggestions
- [ ] Esc dismisses suggestions
- [ ] Ctrl+Space manually triggers
- [ ] Settings persist across sessions

### Automated Testing

Currently manual testing is required. Future versions will include:
- Unit tests with Jest
- E2E testing with Playwright
- Gmail integration tests

## 🚨 Troubleshooting

### Common Build Issues

1. **"terser not found" error:**
   ```bash
   npm install terser --save-dev
   ```

2. **Import/export errors:**
   - Check that all files use correct import syntax
   - Ensure Vite config includes all entry points

3. **React build issues:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Runtime Issues

1. **Extension not loading:**
   - Check manifest.json syntax
   - Verify all files are in dist folder
   - Check Chrome developer console for errors

2. **API calls failing:**
   - Verify API key is valid
   - Check network connectivity
   - Review API rate limits

3. **Gmail integration not working:**
   - Refresh Gmail page
   - Check if content script is injected
   - Verify Gmail selectors are current

## 📊 Performance Optimization

### Bundle Size Optimization

Current bundle sizes:
- `popup.js`: ~228KB (includes React)
- `contentScript.js`: ~12KB
- `background.js`: ~8.5KB

For production optimization:
1. Enable minification in `vite.config.js`
2. Use tree shaking for unused code
3. Consider lazy loading for popup components

### Memory Usage

The extension is designed to be lightweight:
- Content script: ~5MB memory usage
- Background script: ~2MB memory usage
- Popup (when open): ~10MB memory usage

## 🔐 Security Considerations

### API Key Storage
- API keys are stored in Chrome's secure storage
- Keys are synced across user's Chrome instances
- Keys are encrypted by Chrome's storage system

### Content Security Policy
The extension uses strict CSP:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

### Permissions
Minimal permissions requested:
- `activeTab`: For Gmail interaction
- `storage`: For settings persistence
- `scripting`: For content script injection

## 📈 Analytics & Monitoring

### Usage Tracking
The extension tracks (locally only):
- Suggestion acceptance rate
- Daily usage statistics
- Error rates and types

### Performance Monitoring
Monitor in Chrome DevTools:
- Content script execution time
- API response times
- Memory usage patterns

## 🔄 Updates & Maintenance

### Version Updates
1. Update version in `manifest.json`
2. Update version in `package.json`
3. Add changelog entry
4. Build and test
5. Submit to Chrome Web Store

### API Compatibility
- Gemini API: Currently using v1beta
- OpenAI API: Using v1 (stable)
- Chrome Extensions: Manifest V3 (latest)

---

**Need help?** Check the [main README](README.md) or open an issue on GitHub.