# Email Copilot - Architecture Documentation

## 🏗️ Modular Architecture Overview

The Email Copilot extension has been completely refactored into a robust, modular architecture that separates concerns and provides excellent maintainability. The design follows GitHub Copilot patterns with professional-grade error handling.

## 📋 Core Requirements Implemented

### ✅ **Input Monitoring**
- Watch for input in Gmail's compose box using `MutationObserver`
- Debounced input handler (300ms) to prevent excessive API calls
- Smart text validation and cursor position detection

### ✅ **AI Integration** 
- Send partial input to Gemini API with optimized prompts
- Intelligent prompt building: "Complete this professional email naturally and concisely"
- Retry mechanism with exponential backoff (3 attempts)
- Response caching to reduce API calls

### ✅ **Ghost Text Display**
- Show responses inline as gray "ghost text" (like GitHub Copilot)
- Advanced positioning and cursor management
- Enhanced visual styling with subtle borders

### ✅ **Keyboard Controls**
- **Tab**: Accept and insert suggestion
- **ESC**: Dismiss suggestion  
- **Ctrl+Space**: Manual trigger
- **Arrow keys**: Dismiss suggestion

### ✅ **Robust Error Handling**
- Graceful handling of no suggestions
- Retry on API failures with exponential backoff
- Comprehensive error logging and user feedback

## 🧩 Module Structure

```
EmailCopilot (Main Orchestrator)
├── GmailObserver (DOM Monitoring)
├── InputManager (Input Events & Debouncing)  
├── SuggestionEngine (AI API & Retry Logic)
├── GhostRenderer (Text Display & Positioning)
├── KeyboardHandler (Hotkey Management)
└── Utility Functions (Helpers & Sanitization)
```

## 📦 Individual Modules

### 1. **GmailObserver** - DOM Monitoring
```javascript
class GmailObserver {
  // Responsibilities:
  // - Watch for Gmail compose areas using MutationObserver
  // - Detect when compose boxes are added/removed
  // - Validate compose elements (exclude signatures, quotes)
  // - Comprehensive selector coverage for different Gmail layouts
}
```

**Key Features:**
- 🔍 **Comprehensive Detection**: 9 different selectors for various Gmail layouts
- 🚫 **Smart Exclusions**: Filters out signatures, quotes, subject lines
- 📐 **Size Validation**: Ensures elements are properly sized (100x30 minimum)
- 🔄 **Dynamic Updates**: Responds to DOM changes in real-time

### 2. **InputManager** - Event Handling & Debouncing  
```javascript
class InputManager {
  // Responsibilities:
  // - Debounced input handling (300ms default)
  // - Backspace/delete detection to prevent suggestions
  // - Text extraction and validation
  // - Smart triggering conditions
}
```

**Key Features:**
- ⏱️ **300ms Debouncing**: Prevents excessive API calls while typing
- ⌫ **Backspace Detection**: Immediate detection to cancel suggestions
- 📝 **Text Validation**: Minimum 10 chars, 3+ words, no ending punctuation
- 🎯 **Smart Triggers**: Only triggers when appropriate for suggestions

### 3. **SuggestionEngine** - AI API & Retry Logic
```javascript
class SuggestionEngine {
  // Responsibilities:
  // - Make API calls to background script
  // - Implement retry logic with exponential backoff
  // - Cache successful responses (LRU cache, 50 items)
  // - Build optimized prompts for email completion
}
```

**Key Features:**
- 🔄 **3 Retry Attempts**: Exponential backoff (1s, 2s, 4s)
- 💾 **LRU Caching**: 50-item cache to reduce API calls
- 🎯 **Smart Prompts**: Context-aware email completion prompts
- ⚡ **Request Cancellation**: Cancel previous requests for new input

### 4. **GhostRenderer** - Text Display & Positioning
```javascript
class GhostRenderer {
  // Responsibilities:
  // - Create and style ghost text elements
  // - Position text at cursor location
  // - Handle text acceptance/rejection
  // - Manage DOM insertion and cleanup
}
```

**Key Features:**
- 👻 **GitHub Copilot Style**: Gray, italic text with subtle background
- 📍 **Precise Positioning**: Inserts at exact cursor position
- 🔄 **Fallback Handling**: Multiple insertion strategies for reliability
- ✨ **Clean Acceptance**: Seamless text replacement with cursor positioning

### 5. **KeyboardHandler** - Hotkey Management
```javascript
class KeyboardHandler {
  // Responsibilities:
  // - Listen for Tab, Esc, Ctrl+Space, Arrow keys
  // - Only respond when ghost text is active
  // - Prevent default behaviors appropriately
  // - Route events to correct handlers
}
```

**Key Features:**
- ⌨️ **Smart Key Detection**: Only active in compose areas with ghost text
- 🛡️ **Event Prevention**: Proper preventDefault() and stopPropagation()
- 🎯 **Targeted Listening**: Uses capture phase for reliable event handling
- 🔄 **State Management**: Tracks ghost text visibility

### 6. **Utility Functions** - Helpers & Sanitization
```javascript
// Core utilities:
// - debounce() - Function debouncing with immediate option
// - throttle() - Function throttling for performance
// - sanitizeText() - Clean and validate AI responses
// - isUserEditing() - Detect text selection/editing
// - getCursorPosition() - Get precise cursor information
```

**Key Features:**
- 🧼 **Text Sanitization**: Limits length, cleans whitespace, handles line breaks
- 👤 **User State Detection**: Knows when user is selecting or editing text
- 📍 **Cursor Utilities**: Precise cursor position and range management
- ⚡ **Performance Helpers**: Debouncing and throttling for smooth UX

## 🔄 Data Flow

```
1. User types in Gmail compose box
   ↓
2. GmailObserver detects compose area
   ↓  
3. InputManager attaches debounced event handlers
   ↓
4. User input triggers debounced handler (300ms delay)
   ↓
5. InputManager validates text and conditions
   ↓
6. SuggestionEngine makes API call (with retry logic)
   ↓
7. Response cached and sanitized
   ↓
8. GhostRenderer displays ghost text at cursor
   ↓
9. KeyboardHandler listens for Tab/Esc
   ↓
10. User accepts (Tab) → Text inserted, or rejects (Esc) → Text removed
```

## 🛡️ Error Handling Strategy

### **Multi-Level Error Handling:**

#### 1. **API Level**
- 3 retry attempts with exponential backoff
- Comprehensive error parsing and reporting
- Graceful degradation on permanent failures

#### 2. **DOM Level** 
- Fallback insertion strategies for ghost text
- Safe element access with existence checks
- Cleanup on DOM manipulation failures

#### 3. **User Level**
- Clear error indicators and messages
- No crashes or broken states
- Helpful suggestions for manual triggers

#### 4. **Performance Level**
- Request cancellation to prevent race conditions
- Debouncing to limit API calls
- Caching to reduce redundant requests

## 🎯 Smart Triggering Logic

### **When Suggestions ARE Triggered:**
- ✅ Text length ≥ 10 characters
- ✅ Word count ≥ 3 words  
- ✅ Cursor at end of word boundary
- ✅ No text selection active
- ✅ Not currently backspacing/deleting
- ✅ Text doesn't end with punctuation (., !, ?)

### **When Suggestions are SKIPPED:**
- ❌ Text too short (< 10 chars)
- ❌ Too few words (< 3 words)
- ❌ User is selecting text
- ❌ User is backspacing/deleting
- ❌ Text ends with sentence punctuation
- ❌ Already processing a suggestion

## 🔧 Configuration & Customization

### **Adjustable Parameters:**
```javascript
// InputManager
debounceMs: 300,          // Typing debounce delay

// SuggestionEngine  
retryAttempts: 3,         // API retry count
retryDelay: 1000,         // Initial retry delay (ms)
cacheSize: 50,            // Number of cached responses

// Text Validation
minTextLength: 10,        // Minimum characters to trigger
minWordCount: 3,          // Minimum words to trigger
maxSuggestionLength: 500, // Maximum suggestion length
```

### **Extensibility Points:**
- **Custom Prompts**: Modify `buildPrompt()` in SuggestionEngine
- **New Triggers**: Add conditions to `shouldTriggerSuggestion()`
- **Visual Styling**: Update CSS in `injectStyles()`
- **Additional Keyboards**: Extend KeyboardHandler event handling

## 🔍 Debugging & Monitoring

### **Console Logging:**
All modules use emoji-prefixed logging for easy filtering:
- 📧 EmailCopilot general messages
- 🔍 GmailObserver DOM detection  
- ⌨️ InputManager typing events
- 🤖 SuggestionEngine API calls
- 👻 GhostRenderer text display
- ⌨️ KeyboardHandler key events

### **Debug Tools:**
```javascript
// Available in console for debugging:
window.emailCopilot           // Main instance
window.emailCopilot.destroy() // Clean shutdown
```

## 🚀 Performance Optimizations

### **API Efficiency:**
- LRU caching reduces redundant calls
- Request cancellation prevents race conditions  
- Debounced input limits API frequency
- Smart triggering reduces unnecessary calls

### **DOM Efficiency:**
- Single MutationObserver for all detection
- Event delegation for keyboard handling
- Minimal DOM manipulation and cleanup
- Efficient selector strategies

### **Memory Management:**
- Automatic cleanup on element removal
- Cache size limits prevent memory leaks
- Proper event listener cleanup
- Garbage collection friendly patterns

## 📋 Code Quality Features

### **Maintainability:**
- Clear separation of concerns
- Comprehensive documentation
- Consistent error handling patterns
- Modular, testable architecture

### **Reliability:**
- Multiple fallback strategies
- Comprehensive error recovery
- Defensive programming practices
- Extensive validation and sanitization

### **User Experience:**
- Responsive, non-blocking operations
- Clear visual feedback at every step
- Consistent keyboard interaction patterns
- Professional GitHub Copilot-style behavior

---

This architecture provides a solid foundation for a production-quality email autocomplete extension that can be easily maintained, extended, and debugged.