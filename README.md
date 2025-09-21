# Text Explainer - Obsidian Plugin

An Obsidian plugin that provides instant explanations for selected text using OpenAI-compatible APIs. Select any text and use your configured hotkey (default `Alt+D`) to get translations, definitions, or summaries based on context.

## Features

- **Smart Context Analysis**: Automatically determines whether to translate, define, or summarize based on text length and content
- **Configurable Hotkey**: Default `Alt+D` with full customization in plugin settings
- **Multi-language Support**: Choose your preferred explanation language
- **OpenAI-Compatible API**: Works with OpenAI, Claude, local models, and other OpenAI-compatible providers
- **Intelligent Explanations**: 
  - **Short phrases (1-4 words)**: Word definitions with pronunciation and examples
  - **Sentences (5-500 words)**: Translation to your target language
  - **Long text (500+ words)**: Structured summaries with key points

## Installation

### Manual Installation

1. Download the plugin files:
   - `main.js`
   - `manifest.json` 
   - `styles.css`

2. Create a new folder in your Obsidian vault's plugins directory:
   ```
   .obsidian/plugins/text-explainer/
   ```

3. Copy the downloaded files into this folder

4. Restart Obsidian

5. Go to Settings → Community Plugins and enable "Text Explainer"

## Setup

### 1. Get API Key

Supports OpenAI and OpenAI-compatible APIs:

**For OpenAI:**
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create a new API key
3. Copy the key for use in plugin settings

**For other providers:**
- Claude (via OpenAI-compatible services)
- Local models (Ollama, LM Studio, etc.)
- Other OpenAI-compatible endpoints

### 2. Configure Plugin

1. Go to Settings → Text Explainer
2. Enter your API key
3. Choose your preferred language for explanations
4. Adjust model settings if needed

### Default Settings:
- **Model**: `gpt-3.5-turbo`
- **Language**: Chinese (configurable)
- **Hotkey**: `Alt+D` (fully configurable in settings)
- **Base URL**: `https://api.openai.com/v1`

## Usage

### Basic Usage

1. Select any text in your note
2. Press your configured hotkey (default: `Alt+D`)
3. A modal will appear with the explanation

### Alternative Methods

- **Ribbon icon**: Click the message circle icon in the ribbon
- **Command palette**: Search for "Explain selected text"

### Configuring Hotkeys

Go to Settings → Text Explainer → Hotkey Settings to customize:
- **Modifiers**: Alt, Ctrl, Cmd/Win, Shift (can combine multiple)
- **Key**: Any single letter or number

### What gets explained?

- **Technical terms**: Definitions and best practices
- **Names**: Person, company, or organization descriptions  
- **Foreign text**: Translation to your preferred language
- **Long passages**: Structured summaries with key points
- **Words**: Meanings with pronunciation and example sentences

### Example Outputs

**Word explanation:**
```
algorithm /ˈælɡərɪðəm/ → 算法
算法是解决问题或执行任务的一系列明确步骤或规则...
Example: "The sorting algorithm efficiently arranges data in ascending order."
```

**Translation:**
```
"Machine learning is transforming industries" 
→ "机器学习正在改变各个行业"
```

**Summary:**
```
Key themes:
• Data analysis methods
• Statistical significance  
• Research methodology
• Implementation challenges
```

## Troubleshooting

### Common Issues

1. **"Please configure your API key in settings"**
   - Go to Settings → Text Explainer and add your API key

2. **"No text selected"**
   - Make sure you have text selected before using the hotkey

3. **API request failed**
   - Check your API key is correct
   - Verify you have API credits/quota remaining
   - Check your internet connection

### Debug Information

Enable Developer Console (Ctrl/Cmd+Shift+I) to see detailed error logs.

## Configuration

### API Settings

- **API Key**: Your OpenAI API key or compatible API key
- **Model**: Model name (default: `gpt-3.5-turbo`)
- **Base URL**: API endpoint URL (default: `https://api.openai.com/v1`)
- **Language**: Target language for explanations

### Hotkey Settings

- **Hotkey Modifiers**: Choose modifier keys (Alt, Ctrl, Cmd/Win, Shift)
- **Hotkey Key**: Single letter or number to trigger explanation

### Supported API Providers

**OpenAI:**
- Base URL: `https://api.openai.com/v1`
- Models: `gpt-4`, `gpt-3.5-turbo`, etc.

**Anthropic Claude (via OpenAI compatibility):**
- Use services like `anthropic-openai-bridge`

**Local Models:**
- **Ollama**: `http://localhost:11434/v1`
- **LM Studio**: `http://localhost:1234/v1`
- **Text Generation WebUI**: `http://localhost:5000/v1`

**Other Services:**
- Azure OpenAI
- Various cloud providers with OpenAI-compatible APIs

### Supported Languages

- Chinese (中文)
- English
- Spanish (Español)  
- French (Français)
- German (Deutsch)
- Japanese (日本語)

## Privacy & Security

- API calls are made directly to your configured provider
- Selected text is sent to the API for processing  
- No data is stored locally by the plugin
- For privacy, consider using local models (Ollama, LM Studio)
- Always review your API provider's privacy policy

## Contributing

This plugin was adapted from the original [Text Explainer Tampermonkey script](https://greasyfork.org/en/scripts/528810-text-explainer). 

To contribute:
1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review Obsidian plugin development documentation

## Changelog

### v1.0.0
- Initial release
- OpenAI-compatible API integration
- Configurable hotkey settings in plugin UI
- Smart context-aware explanations
- Multi-language support
- Support for local and cloud LLM providers