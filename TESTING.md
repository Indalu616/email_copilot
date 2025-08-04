# Email Copilot - Testing Guide

## 🔍 What to Look For

The updated extension now includes **visual indicators** to help you see when it's working. Here's what you should see:

### 1. Extension Loading Indicators

When you reload Gmail, you should see:

1. **Blue notification** (top-right): "✨ Email Copilot Active" for 3 seconds
2. **Console messages** in DevTools (F12): Look for messages starting with:
   - `🚀 Email Copilot: Initializing...`
   - `✅ Email Copilot: Successfully initialized`
   - `🔍 Searching for existing compose areas...`

### 2. Compose Area Detection

When you open a Gmail compose window:

1. **Green "AI" badge** should appear briefly (5 seconds) near the compose area
2. **Yellow "Connected!" indicator** should show when you click in the compose box
3. **Console message**: `🔗 Attaching to compose element:`

### 3. Typing Detection

When you start typing in the compose area:

1. **Yellow "Thinking..." indicator** should appear
2. **Console messages**: `⌨️ Input detected in compose area`
3. **Console message**: `📝 Getting suggestion for text: [your text]`

### 4. AI Suggestions

When suggestions appear:

1. **Ghost text** appears inline after your text (gray, italic)
2. **Blue instruction bar**: "AI suggestion - Press Tab to accept, Esc to dismiss"
3. **Console message**: `👻 Showing suggestion: [suggestion text]`

## 🧪 Step-by-Step Testing

### Test 1: Basic Setup

1. **Reload extension** in Chrome extensions page
2. **Open Gmail** in new tab
3. **Look for blue "Active" notification** (top-right)
4. **Open DevTools** (F12) → Console tab
5. **Check for initialization messages**

✅ **Expected**: Blue notification + console messages

### Test 2: Compose Detection

1. **Click "Compose"** in Gmail
2. **Look for green "AI" badge** near compose area
3. **Click inside message body**
4. **Look for yellow "Connected!" indicator**

✅ **Expected**: Visual indicators + console messages

### Test 3: Suggestion Generation

1. **Type a simple email start**: "Hello John, I hope this email finds you"
2. **Wait 1-2 seconds** after stopping typing
3. **Look for yellow "Thinking..." indicator**
4. **Check console** for API request messages

✅ **Expected**: Typing indicator + console activity

### Test 4: Ghost Text Appearance

1. **Continue typing** a longer sentence
2. **Pause at end of word** (after space)
3. **Wait for gray italic text** to appear
4. **Look for blue instruction bar**

✅ **Expected**: Ghost text + instruction bar

### Test 5: Keyboard Controls

1. **With suggestion visible**, press **Tab**
2. **Text should be accepted** and become regular text
3. **Try again**, press **Esc** to dismiss
4. **Try Ctrl+Space** for manual trigger

✅ **Expected**: Proper keyboard response

## 🐛 Troubleshooting

### No Blue "Active" Notification

**Problem**: Extension not loading
**Solutions**:
- Reload extension in chrome://extensions/
- Check extension is enabled
- Try hard refresh Gmail (Ctrl+Shift+R)

### No Green "AI" Badge

**Problem**: Not detecting compose area
**Solutions**:
- Try different compose types (new email, reply, forward)
- Check console for detection messages
- Try clicking directly in message body

### No "Thinking..." Indicator

**Problem**: Input not being detected
**Solutions**:
- Make sure you're typing in main message body (not subject)
- Avoid signatures and quoted text areas
- Try typing longer text (5+ characters)

### No Ghost Text

**Problem**: AI suggestions not appearing
**Solutions**:
- Check API key is working (test in popup)
- Verify internet connection
- Look for error messages in console
- Try manual trigger (Ctrl+Space)

### Console Error Messages

Common errors and solutions:

- `"API key not configured"` → Set API key in popup
- `"Extension is disabled"` → Enable in popup settings
- `"Connection failed"` → Check internet + API key
- `"Text too short"` → Type more text (5+ characters)

## 🔧 Developer Testing

### Enable Detailed Logging

1. Open DevTools (F12)
2. Go to Console tab
3. Filter by "Email Copilot" or use emoji filters: 🚀 📧 🎯 👻 ⌨️

### Test Different Gmail Layouts

- **New Gmail interface**
- **Old Gmail interface** 
- **Mobile view** (responsive)
- **Different languages**

### Test Edge Cases

- **Very long emails**
- **Emails with formatting**
- **Reply threads**
- **Multiple compose windows**

## 📊 Performance Monitoring

### Check Memory Usage

1. Go to Chrome → More tools → Task manager
2. Look for "Extension: Email Copilot"
3. Should use <25MB memory

### Check API Usage

1. Monitor console for API call frequency
2. Should debounce to ~1 call every 800ms
3. No rapid-fire requests

## 🎯 Success Criteria

The extension is working correctly if you see:

✅ **Visual indicators** at each step  
✅ **Console logging** showing progress  
✅ **Ghost text** appearing inline  
✅ **Keyboard shortcuts** working  
✅ **API calls** being made successfully  
✅ **Text insertion** working properly  

## 🚨 Common Issues & Quick Fixes

### "Extension loaded but nothing happens"
- Check DevTools console for errors
- Try refreshing Gmail page
- Verify API key is set correctly

### "Suggestions appear but can't accept them"
- Check keyboard focus is in compose area
- Try manual trigger (Ctrl+Space)
- Look for JavaScript errors in console

### "Ghost text appears in wrong place"
- Try clicking where you want to type
- Refresh Gmail page
- Check for conflicting extensions

### "API test works but no suggestions in Gmail"
- Check compose area detection (green badge)
- Verify you're typing in message body
- Try longer text before pausing

---

**Need more help?** Check the browser console for specific error messages and refer to the main troubleshooting guide in [INSTALL.md](INSTALL.md).