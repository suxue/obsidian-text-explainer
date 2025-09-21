# Text Explainer for Obsidian

<div align="center">

![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

*Intelligent text explanation plugin for Obsidian using LLM APIs*

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Configuration](#configuration) • [Contributing](#contributing)

</div>

## Overview

Text Explainer is an Obsidian plugin that provides instant, context-aware explanations for selected text using OpenAI-compatible APIs. Whether you need translations, definitions, or summaries, this plugin intelligently determines the best response based on your selection.

### Key Highlights

- 🧠 **Smart Context Analysis** - Automatically chooses between translation, definition, or summarization
- ⚡ **Instant Access** - Configurable hotkey for quick explanations (default: `Alt+D`)
- 🌍 **Multi-language Support** - Supports 6+ languages with customizable response language
- 🔌 **Universal API Compatibility** - Works with OpenAI, Claude, local models, and other providers
- 📝 **Note Integration** - Create linked notes with configurable properties and templates
- 🎨 **Seamless UI** - Clean modal interface with proper Obsidian theming

## Features

### Intelligent Text Processing

The plugin automatically determines the best explanation type based on your selection:

| Text Type | Word Count | Action | Example |
|-----------|------------|--------|---------|
| **Words & Phrases** | 1-4 words | Definition + pronunciation + examples | `algorithm` → Definition with IPA |
| **Sentences** | 5-500 words | Translation to target language | Text → 中文/English/etc. |
| **Paragraphs** | 500+ words | Structured summary with key points | Long text → Bullet-point summary |

### Advanced Features

- **Context-Aware Processing** - Uses surrounding text for better accuracy
- **Note Creation** - Generate linked notes from explanations
- **Configurable Templates** - Adjust predefined properties and body layout before saving notes
- **Multiple Triggers** - Hotkey, ribbon icon, or command palette
- **Technical Term Recognition** - Special handling for technical vocabulary
- **Person/Organization Detection** - Identifies and explains names and entities

## Installation

### Method 1: Manual Installation (Recommended)

1. **Download Plugin Files**
   ```
   main.js
   manifest.json
   styles.css
   ```

2. **Create Plugin Directory**
   ```
   .obsidian/plugins/text-explainer/
   ```

3. **Copy Files and Enable**
   - Copy downloaded files to the plugin directory
   - Restart Obsidian
   - Go to Settings → Community Plugins → Enable "Text Explainer"

### Method 2: BRAT (Beta Reviewers Auto-update Tool)

*Coming soon - will be available when added to community plugins*

## Quick Start

### 1. Configure API Access

Choose your preferred LLM provider:

<details>
<summary><strong>OpenAI (Recommended)</strong></summary>

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. In Obsidian: Settings → Text Explainer → Enter API key

**Settings:**
- API Key: `sk-...`
- Model: `gpt-3.5-turbo` or `gpt-4`
- Base URL: `https://api.openai.com/v1`
</details>

<details>
<summary><strong>Local Models (Privacy-focused)</strong></summary>

**Ollama:**
```bash
# Install and run Ollama
ollama serve
ollama pull llama2  # or preferred model
```

**Settings:**
- Base URL: `http://localhost:11434/v1`
- Model: `llama2` (or your installed model)
- API Key: Leave empty

**LM Studio:**
- Start LM Studio with OpenAI-compatible server
- Base URL: `http://localhost:1234/v1`
- Model: Your loaded model name
</details>

<details>
<summary><strong>Other Providers</strong></summary>

**Azure OpenAI:**
- Base URL: `https://your-resource.openai.azure.com/openai/deployments/your-deployment/`
- API Key: Your Azure API key
- Model: Your deployment name

**Anthropic Claude (via compatibility layer):**
- Use services like `anthropic-openai-bridge`
- Configure according to service documentation
</details>

### 2. Basic Usage

1. **Select any text** in your Obsidian note
2. **Press `Alt+D`** (or your configured hotkey)
3. **View explanation** in the modal popup
4. **Customize the generated note** by editing predefined properties or the body template (placeholders like `{{content}}` are supported)
5. **Create a linked note** with the "Create Note & Link" button

## Configuration

### Plugin Settings

Access via Settings → Text Explainer:

#### API Configuration
- **API Key**: Your provider's API key
- **Model**: Model name (e.g., `gpt-3.5-turbo`, `gpt-4`, `llama2`)
- **Base URL**: API endpoint URL
- **Response Language**: Target language for explanations

#### Hotkey Settings
- **Modifiers**: Alt, Ctrl, Cmd/Win, Shift (combinable)
- **Key**: Any single letter or number

#### Note Settings
- **Note Directory**: Folder for created explanation notes (default: `Explanations`)

### Note Configuration Modal

Before saving a note you can tailor both the front matter and body directly from the explanation popup:

- **Predefined properties**: Use the table to add YAML-style key/value pairs. Values can be plain text or placeholders that are resolved when the note is created.
- **Body template editor**: Configure the Markdown that wraps the generated explanation. Include `{{content}}` where the plain-text explanation should appear or `{{contentHtml}}` to keep HTML formatting.
- **Available placeholders**: `{{selectedText}}`, `{{paragraphText}}`, `{{textBefore}}`, `{{textAfter}}`, `{{date}}`, `{{content}}`, `{{contentHtml}}`.

The plugin remembers your last-used configuration, making it easy to reuse templates across sessions.

### Supported Languages

| Language | Code | Example Use Case |
|----------|------|------------------|
| Chinese | `zh` | English → 中文 translation |
| English | `en` | 中文 → English translation |
| Spanish | `es` | Multi-language support |
| French | `fr` | European language support |
| German | `de` | Technical documentation |
| Japanese | `ja` | Academic text processing |

## Usage Examples

### Word Definitions

**Input:** Select "algorithm"
```
algorithm /ˈælɡərɪðəm/

算法是解决问题或执行任务的一系列明确步骤或规则。在计算机科学中，算法是程序的基础。

Example: "The sorting algorithm efficiently arranges data in ascending order."
```

### Text Translation

**Input:** Select "Machine learning is transforming industries worldwide"
```
机器学习正在全球范围内改变各个行业。
```

### Long Text Summarization

**Input:** Select a 500+ word paragraph
```
## Key Themes:
• Data analysis methodologies
• Statistical significance testing
• Research implementation challenges
• Future applications and trends

## Main Points:
1. Current approaches to data processing
2. Challenges in statistical validation
3. Emerging trends in methodology
```

### Technical Terms

**Input:** Select "REST API"
```
REST API (Representational State Transfer Application Programming Interface)

A REST API is an architectural style for designing networked applications, using standard HTTP methods.

## Best Practices:
• Use proper HTTP status codes
• Implement consistent URL patterns
• Provide comprehensive documentation
• Include proper error handling

## How it works:
REST APIs use HTTP requests to GET, PUT, POST, and DELETE data, making them language-agnostic and widely compatible.
```

## Advanced Features

### Note Creation and Linking

The plugin can automatically create notes from explanations and link them in your original text:

1. **Generate explanation** for selected text
2. **Click "Create Note & Link"** in the modal
3. **Automatic note creation** in your specified directory
4. **Text replacement** with wiki-link to the new note

**Note Structure:**
```markdown
# [Selected Text]

> Explanation generated on 2024-01-15

## Original Context
[Selected text with context]

## Explanation
[LLM-generated explanation]

---
*Generated by Text Explainer Plugin*
```

### Context-Aware Processing

The plugin considers surrounding text for better explanations:

- **Before/After Text**: 200 characters of context on each side
- **Paragraph Context**: Full paragraph containing the selection
- **Semantic Understanding**: Better handling of ambiguous terms

## Troubleshooting

### Common Issues

<details>
<summary><strong>"Please configure your API key in settings"</strong></summary>

**Solution:**
1. Go to Settings → Text Explainer
2. Enter your API key in the "API Key" field
3. Ensure the key format is correct (usually starts with `sk-` for OpenAI)
</details>

<details>
<summary><strong>"No text selected"</strong></summary>

**Solution:**
- Ensure you have text selected before triggering the hotkey
- Try selecting text again and ensure it's highlighted
- Works in both Edit and Reading modes
</details>

<details>
<summary><strong>"API request failed"</strong></summary>

**Solution:**
1. **Check API key**: Verify it's correctly entered and valid
2. **Check credits**: Ensure you have remaining API quota
3. **Check connection**: Test your internet connection
4. **Check Base URL**: Verify the endpoint URL is correct
5. **Check model**: Ensure the model name is available with your API key

**For local models:**
- Ensure the local server is running
- Check the port and URL configuration
- Verify the model is loaded and accessible
</details>

<details>
<summary><strong>Hotkey not working</strong></summary>

**Solution:**
1. Check for conflicts with other plugins or system shortcuts
2. Try different modifier combinations
3. Ensure the plugin is enabled
4. Restart Obsidian after changing hotkey settings
</details>

### Debug Information

Enable the Developer Console (`Ctrl/Cmd+Shift+I`) to see detailed error logs:

```javascript
// Example debug output
Text Explainer: API request started
Text Explainer: Response received (200 OK)
Text Explainer: Processing explanation content
```

## API Provider Compatibility

### Tested Providers

| Provider | Status | Base URL | Notes |
|----------|--------|----------|-------|
| OpenAI | ✅ Full Support | `https://api.openai.com/v1` | Recommended |
| Ollama | ✅ Full Support | `http://localhost:11434/v1` | Privacy-focused |
| LM Studio | ✅ Full Support | `http://localhost:1234/v1` | Local hosting |
| Azure OpenAI | ✅ Full Support | Custom URL | Enterprise |
| Anthropic Claude | ⚠️ Via Bridge | Requires compatibility layer | Advanced setup |

### API Requirements

Your API provider must support:
- OpenAI-compatible chat completions endpoint
- JSON request/response format
- Bearer token authentication

## Development

### Project Structure

```
text-explainer/
├── main.js          # Core plugin logic
├── manifest.json    # Plugin metadata
├── styles.css       # UI styling
└── README.md        # Documentation
```

### Building from Source

1. Clone the repository
2. No build process required - pure JavaScript
3. Copy `main.js`, `manifest.json`, and `styles.css` to your plugins folder

### Contributing

We welcome contributions! Please:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

#### Development Guidelines

- Follow existing code style and patterns
- Test with multiple API providers
- Ensure compatibility with both Edit and Reading modes
- Update documentation for new features

## Privacy & Security

### Data Handling

- **API Calls**: Selected text is sent to your configured API provider
- **Local Storage**: Only plugin settings are stored locally
- **No Data Retention**: Plugin doesn't store or cache explanations
- **Privacy-First**: Consider local models (Ollama, LM Studio) for sensitive content

### Security Best Practices

- **API Key Security**: Store keys securely; never share publicly
- **Provider Trust**: Review your API provider's privacy policy
- **Local Models**: Use local inference for maximum privacy
- **Network Security**: Ensure HTTPS connections for cloud providers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Original Inspiration**: Adapted from the [Text Explainer Tampermonkey script](https://greasyfork.org/en/scripts/528810-text-explainer)
- **Obsidian Community**: For the excellent plugin development resources
- **Contributors**: Thanks to all who help improve this plugin

## Support

### Getting Help

- 📖 **Documentation**: Check this README for comprehensive guides
- 🐛 **Bug Reports**: [Open an issue](https://github.com/rocry/text-explainer/issues) on GitHub
- 💡 **Feature Requests**: [Suggest new features](https://github.com/rocry/text-explainer/issues/new) via GitHub issues
- 💬 **Community**: Join the Obsidian community forums for general discussion

### Useful Resources

- [Obsidian Plugin Development Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Ollama Documentation](https://ollama.ai/docs)

---

<div align="center">

**Made with ❤️ for the Obsidian community**

If this plugin helps you, consider ⭐ starring the repository!

</div>