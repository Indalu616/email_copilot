# Email Copilot - Installation Guide

## 🚀 Quick Installation

### Step 1: Get the Extension Files

The extension is already built and ready to install! The `dist/` folder contains all the necessary files.

### Step 2: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Go to `chrome://extensions/`
   - Or click the three dots menu → More tools → Extensions

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner
   - This allows you to load unpacked extensions

3. **Load the Extension**
   - Click "Load unpacked" button
   - Navigate to and select the `dist/` folder in your file browser
   - Click "Select Folder" or "Open"

4. **Verify Installation**
   - You should see "Email Copilot" in your extensions list
   - The extension icon should appear in your Chrome toolbar
   - Status should show "On" (enabled)

### Step 3: Get an API Key

Choose one of these AI providers:

#### Option A: Google Gemini (Recommended - Free tier available)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

#### Option B: OpenAI GPT
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the generated API key
5. Note: OpenAI requires payment after free trial

### Step 4: Configure the Extension

1. **Open Extension Settings**
   - Click the Email Copilot icon in Chrome toolbar
   - Or right-click the icon → Options

2. **Enter API Key**
   - Select your AI provider (Gemini or OpenAI)
   - Paste your API key in the API Key field
   - Click "Test" to verify the connection
   - You should see "✓ Connection successful"

3. **Adjust Settings (Optional)**
   - Choose your preferred AI model
   - Set trigger delay (default 500ms works well)
   - Enable/disable auto-trigger
   - Save settings

### Step 5: Test in Gmail

1. **Open Gmail**
   - Go to [gmail.com](https://gmail.com)
   - Sign in to your account

2. **Start Composing**
   - Click "Compose" to create a new email
   - Start typing in the message body
   - For example, type: "Hello John, I hope this email finds you"

3. **See AI Suggestions**
   - After typing a few words, wait 500ms (or your set delay)
   - Ghost text should appear suggesting completions
   - Press `Tab` to accept or `Esc` to dismiss

4. **Use Keyboard Shortcuts**
   - `Tab` - Accept suggestion
   - `Esc` - Dismiss suggestion
   - `Ctrl + Space` - Manually trigger suggestion

## 🛠️ Troubleshooting

### Extension Not Loading
- **Check folder selection**: Make sure you selected the `dist/` folder, not the project root
- **Check file permissions**: Ensure Chrome can read the files
- **Clear cache**: Disable and re-enable the extension

### No Suggestions Appearing
1. **Check extension status**: Ensure it's enabled in chrome://extensions/
2. **Verify API key**: Open extension popup and test connection
3. **Check Gmail compose area**: Make sure you're typing in the main message body
4. **Check console**: Open DevTools (F12) and look for "Email Copilot" messages

### API Connection Issues
- **Gemini API**: Verify key is from Google AI Studio, not Google Cloud
- **OpenAI API**: Check you have sufficient credits/quota
- **Network**: Ensure your firewall allows API calls
- **Key format**: Remove any extra spaces or characters

### Ghost Text Not Appearing
- **Try manual trigger**: Press `Ctrl + Space` while typing
- **Check text length**: Need at least 3 characters before suggestions
- **Word boundaries**: Suggestions appear at end of words
- **Refresh page**: Try refreshing Gmail and composing again

### Keyboard Shortcuts Not Working
- **Check focus**: Ensure cursor is in the compose area
- **Other extensions**: Disable other extensions that might conflict
- **Browser shortcuts**: Make sure Chrome isn't intercepting the keys

## 🔧 Advanced Configuration

### Custom Models
- **Gemini**: Try `gemini-1.5-pro` for higher quality
- **OpenAI**: Use `gpt-4-turbo` for faster responses

### Performance Tuning
- **Trigger delay**: Reduce to 300ms for faster suggestions
- **Auto-trigger**: Disable if you prefer manual control only
- **Model settings**: Lower temperature for more predictable suggestions

### Multiple Gmail Accounts
- The extension works across all Gmail accounts in the same browser
- Settings are synced across all accounts
- Each compose window works independently

## 📋 System Requirements

- **Browser**: Google Chrome 88+ (Manifest V3 support)
- **Internet**: Required for AI API calls
- **Storage**: ~5MB for extension files
- **Memory**: ~15MB additional RAM usage

## 🔒 Privacy & Security

- **Local processing**: All text analysis happens locally
- **API calls**: Only send minimal context to AI providers
- **No storage**: Email content is never permanently stored
- **Encryption**: API keys stored securely in Chrome sync storage

## 📞 Support

If you encounter issues:

1. **Check browser console** for error messages
2. **Verify API quotas** haven't been exceeded
3. **Test with simple text** like "Hello, how are"
4. **Try different Gmail compose types** (new email, reply, forward)

### Common Error Messages

- `"API key not configured"` → Enter API key in settings
- `"Extension is disabled"` → Enable in settings popup
- `"Connection failed"` → Check API key and internet
- `"Invalid response"` → API provider issue, try again

---

**Enjoy your AI-powered email writing! ✨**

For more details, see the main [README.md](README.md) file.