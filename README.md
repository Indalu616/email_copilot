# Email Copilot - AI-Powered Email Autocomplete

![Email Copilot Logo](public/icons/icon128.svg)

**Email Copilot** is a production-quality Chrome extension that brings AI-powered autocomplete to Gmail, similar to GitHub Copilot for code. Get intelligent email suggestions as you type, powered by Google Gemini or OpenAI GPT.

## ✨ Features

- **🤖 AI-Powered Suggestions**: Get intelligent email completions powered by Google Gemini 1.5 or OpenAI GPT-4
- **👻 Ghost Text Interface**: See suggestions as subtle ghost text inline, just like GitHub Copilot
- **⌨️ Keyboard Shortcuts**: 
  - `Tab` to accept suggestions
  - `Esc` to dismiss
  - `Ctrl + Space` to manually trigger
- **🎯 Gmail Integration**: Seamlessly works with Gmail compose areas
- **⚙️ Customizable Settings**: Choose your AI provider, model, and trigger preferences
- **📊 Usage Analytics**: Track your productivity improvements
- **🎨 Modern UI**: Beautiful, responsive popup interface with dark mode support

## 🏗️ Architecture

Built with modern web technologies for performance and scalability:

- **React 18** - Modern UI framework
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Manifest V3** - Latest Chrome extension standard
- **Modular Design** - Scalable component architecture

## 📁 Project Structure

```
email-copilot-extension/
├── public/
│   └── icons/                 # Extension icons (16, 48, 128px)
├── src/
│   ├── content/               # Content scripts for Gmail
│   │   ├── contentScript.js   # Main Gmail integration
│   │   ├── ghostTextRenderer.js # Ghost text rendering
│   │   └── observer.js        # DOM mutation observer
│   ├── popup/                 # React settings popup
│   │   ├── App.jsx           # Main popup component
│   │   ├── index.jsx         # React entry point
│   │   ├── index.html        # Popup HTML
│   │   └── styles.css        # Popup styles
│   ├── api/                   # AI API integration
│   │   └── aiClient.js       # Gemini/OpenAI client
│   ├── background/
│   │   └── background.js     # Service worker
│   ├── utils/
│   │   └── keybinds.js       # Keyboard handling
│   ├── styles/
│   │   ├── tailwind.css      # Main styles
│   │   └── content.css       # Content script styles
│   └── manifest.json         # Extension manifest
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Chrome browser
- Google Gemini API key OR OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd email-copilot-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build:extension
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Getting API Keys

#### Google Gemini (Recommended)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key for use in extension settings

#### OpenAI GPT
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key for use in extension settings

### Configuration

1. Click the Email Copilot extension icon
2. Choose your AI provider (Gemini or OpenAI)
3. Enter your API key
4. Test the connection
5. Adjust settings as needed
6. Save settings

## 🎯 Usage

1. **Open Gmail** and start composing an email
2. **Start typing** - suggestions will appear automatically as ghost text
3. **Accept suggestions** with `Tab` key
4. **Dismiss suggestions** with `Esc` key
5. **Manual trigger** with `Ctrl + Space`

### Example Workflow

```
You type: "Hello John, I hope this email finds you"
AI suggests: " well. I wanted to follow up on our meeting yesterday."
Press Tab to accept or Esc to dismiss.
```

## ⚡ Development

### Development Mode

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build extension specifically
npm run build:extension
```

### Architecture Details

#### Content Script (`contentScript.js`)
- Detects Gmail compose areas using MutationObserver
- Handles user input events and keyboard shortcuts
- Manages ghost text rendering and positioning
- Communicates with background script for AI calls

#### Ghost Text Renderer (`ghostTextRenderer.js`)
- Creates and positions ghost text elements
- Handles font matching and styling
- Manages animations and transitions
- Responsive to layout changes

#### AI Client (`aiClient.js`)
- Unified interface for Gemini and OpenAI APIs
- Handles rate limiting and error recovery
- Optimized prompts for email completion
- Configurable model and parameter settings

#### Background Service Worker (`background.js`)
- Manages API calls and storage
- Handles extension lifecycle events
- Tracks usage analytics
- Coordinates between content scripts and popup

## 🔧 Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| AI Provider | Choose between Gemini or OpenAI | Gemini |
| Model | Select specific model variant | gemini-1.5-flash |
| Auto-trigger | Enable automatic suggestions | true |
| Trigger Delay | Delay before showing suggestions | 500ms |
| Max Tokens | Maximum response length | 100 |
| Temperature | AI creativity level | 0.7 |

## 📊 AI Prompt Engineering

The extension uses carefully crafted prompts for optimal email completions:

```javascript
const prompt = `You are an intelligent email writing assistant. Complete the following email text naturally and professionally.

Context: ${context}
Partial text: "${partialText}"

Rules:
- Provide ONLY the completion text, not the full email
- Keep it concise and contextually appropriate
- Match the writing tone and style
- Don't repeat the partial text
- Limit to 1-2 sentences maximum

Completion:`;
```

## 🔒 Privacy & Security

- **Local Processing**: All text processing happens locally
- **Secure API Calls**: Direct API communication with encryption
- **No Data Storage**: No email content is stored permanently
- **User Control**: Full control over when and how AI is used
- **Transparent**: Open source for full transparency

## 🛠️ Troubleshooting

### Common Issues

1. **Suggestions not appearing**
   - Check if extension is enabled
   - Verify API key is configured correctly
   - Test API connection in settings

2. **Ghost text positioning issues**
   - Try refreshing the Gmail page
   - Check for browser zoom settings
   - Disable conflicting extensions

3. **API errors**
   - Verify API key validity
   - Check network connectivity
   - Review API usage limits

### Debug Mode

Enable debug logging by opening Chrome DevTools and checking the console for "Email Copilot" messages.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Add JSDoc comments for functions
- Test with multiple Gmail layouts
- Ensure accessibility compliance
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for powerful language models
- OpenAI for GPT models
- Gmail for providing a robust email platform
- The Chrome Extensions community for best practices

## 🚧 Roadmap

- [ ] Support for additional email providers (Outlook, Yahoo)
- [ ] Custom AI model fine-tuning
- [ ] Team/organization settings
- [ ] Email template suggestions
- [ ] Multi-language support
- [ ] Voice-to-text integration
- [ ] Smart compose for different email types

---

**Built with ❤️ for productivity and powered by AI**
