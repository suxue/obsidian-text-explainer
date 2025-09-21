const { Plugin, Modal, Setting, Notice, MarkdownView, PluginSettingTab } = require('obsidian');

// Default settings
const DEFAULT_SETTINGS = {
	model: "gpt-3.5-turbo",
	apiKey: "",
	baseUrl: "https://api.openai.com/v1",
	language: "Chinese",
	hotkeyModifiers: ["Alt"],
	hotkeyKey: "d"
};

// Main plugin class
class TextExplainerPlugin extends Plugin {
	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('message-circle', 'Text Explainer', () => {
			this.explainSelectedText();
		});

		// Add command
		this.addCommand({
			id: 'explain-selected-text',
			name: 'Explain selected text',
			editorCallback: (editor) => {
				this.explainSelectedText(editor);
			}
		});

		// Register hotkey
		this.addCommand({
			id: 'explain-text-hotkey',
			name: 'Explain text (hotkey)',
			hotkeys: [{
				modifiers: this.settings.hotkeyModifiers,
				key: this.settings.hotkeyKey
			}],
			editorCallback: (editor) => {
				this.explainSelectedText(editor);
			}
		});

		// Add settings tab
		this.addSettingTab(new TextExplainerSettingTab(this.app, this));

		console.log('Text Explainer plugin loaded');
	}

	onunload() {
		console.log('Text Explainer plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Get selected text from the active editor
	getSelectedText(editor) {
		if (!editor) {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!activeView) return null;
			editor = activeView.editor;
		}

		const selection = editor.getSelection();
		if (!selection) return null;

		// Get context around selection
		const cursor = editor.getCursor('from');
		const line = editor.getLine(cursor.line);
		const doc = editor.getValue();
		const selectionStart = editor.posToOffset(editor.getCursor('from'));
		const selectionEnd = editor.posToOffset(editor.getCursor('to'));

		// Get surrounding context (similar to original script)
		const contextRange = 200;
		const textBefore = doc.substring(Math.max(0, selectionStart - contextRange), selectionStart).trim();
		const textAfter = doc.substring(selectionEnd, Math.min(doc.length, selectionEnd + contextRange)).trim();

		return {
			selectedText: selection,
			textBefore,
			textAfter,
			paragraphText: line,
			editor
		};
	}

	// Main function to explain selected text
	async explainSelectedText(editor) {
		const selectionData = this.getSelectedText(editor);
		
		if (!selectionData || !selectionData.selectedText) {
			new Notice('No text selected');
			return;
		}

		if (!this.settings.apiKey) {
			new Notice('Please configure your API key in settings');
			return;
		}

		// Create and show explanation modal
		const modal = new ExplanationModal(this.app, selectionData, this.settings, this);
		modal.open();
	}

	// Generate prompt based on text length and type
	getPrompt(selectedText, paragraphText, textBefore, textAfter) {
		const wordsCount = selectedText.split(' ').length;
		const systemPrompt = `Respond in ${this.settings.language} with HTML tags to improve readability.
- Prioritize clarity and conciseness
- Use bullet points when appropriate`;

		if (wordsCount >= 500) {
			return {
				prompt: `Create a structured summary in ${this.settings.language}:
- Identify key themes and concepts
- Extract 3-5 main points
- Use nested <ul> lists for hierarchy
- Keep bullets concise

for the following selected text:

${selectedText}
`,
				systemPrompt
			};
		}

		// For short text that looks like a sentence, offer translation
		if (wordsCount >= 5) {
			return {
				prompt: `Translate exactly to ${this.settings.language} without commentary:
- Preserve technical terms and names
- Maintain original punctuation
- Match formal/informal tone of source

for the following selected text:

${selectedText}
`,
				systemPrompt
			};
		}

		const pinYinExtraPrompt = this.settings.language === "Chinese" ? ' DO NOT add Pinyin for it.' : '';
		const ipaExtraPrompt = this.settings.language === "Chinese" ? '(with IPA if necessary)' : '';
		const asciiChars = selectedText.replace(/[\s\.,\-_'\"!?()]/g, '')
			.split('')
			.filter(char => char.charCodeAt(0) <= 127).length;
		const sampleSentenceLanguage = selectedText.length === asciiChars ? "English" : this.settings.language;

		// Context prompt
		const contextPrompt = textBefore || textAfter ?
			`# Context:
## Before selected text:
${textBefore || 'None'}
## Selected text:
${selectedText}
## After selected text:
${textAfter || 'None'}` : paragraphText;

		// Explain words prompt
		return {
			prompt: `Provide an explanation for the word: "${selectedText}${ipaExtraPrompt}" in ${this.settings.language} without commentary.${pinYinExtraPrompt}

Use the context from the surrounding paragraph to inform your explanation when relevant:

${contextPrompt}

# Consider these scenarios:

## Names
If "${selectedText}" is a person's name, company name, or organization name, provide a brief description (e.g., who they are or what they do).

## Technical Terms
If "${selectedText}" is a technical term or jargon
- give a concise definition and explain.
- Some best practice of using it
- Explain how it works. 
- No need example sentence for the technical term.

## Normal Words
- For any other word, explain its meaning and provide 1-2 example sentences with the word in ${sampleSentenceLanguage}.

# Format
- Output the words first, then the explanation, and then the example sentences if necessary.
- No extra explanation
- Remember to using proper html format like <p> <b> <i> <a> <li> <ol> <ul> to improve readability.
`,
			systemPrompt
		};
	}

	// Call LLM API
	async callLLM(prompt, systemPrompt, progressCallback) {
		if (!this.settings.apiKey) {
			throw new Error("Please set up your API key in the settings.");
		}

		const requestBody = {
			model: this.settings.model,
			messages: [
				{
					role: "system",
					content: systemPrompt
				},
				{
					role: "user",
					content: prompt
				}
			],
			temperature: 0.7,
			max_tokens: 2048
		};

		const response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.settings.apiKey}`
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorText}`);
		}

		const data = await response.json();
		
		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			throw new Error('No response received from the model');
		}

		const text = data.choices[0].message.content;
		
		// Call progress callback if provided
		if (progressCallback) {
			progressCallback(text, text);
		}

		return text;
	}
}

// Modal for displaying explanations
class ExplanationModal extends Modal {
	constructor(app, selectionData, settings, plugin) {
		super(app);
		this.selectionData = selectionData;
		this.settings = settings;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('text-explainer-modal');
		
		// Add title
		contentEl.createEl('h3', { text: 'Text Explanation' });

		// Show selected text
		const selectedDiv = contentEl.createDiv('selected-text');
		selectedDiv.createEl('strong', { text: 'Selected: ' });
		selectedDiv.createSpan({ text: this.selectionData.selectedText });

		// Loading indicator
		const loadingDiv = contentEl.createDiv('loading');
		loadingDiv.innerHTML = '<div class="loading-spinner"></div><span>Generating explanation...</span>';

		// Content area
		const contentDiv = contentEl.createDiv('explanation-content');
		contentDiv.style.display = 'none';

		// Error area
		const errorDiv = contentEl.createDiv('error-message');
		errorDiv.style.display = 'none';

		// Start explanation process
		this.generateExplanation(loadingDiv, contentDiv, errorDiv);
	}

	async generateExplanation(loadingDiv, contentDiv, errorDiv) {
		try {
			const { prompt, systemPrompt } = this.plugin.getPrompt(
				this.selectionData.selectedText,
				this.selectionData.paragraphText,
				this.selectionData.textBefore,
				this.selectionData.textAfter
			);

			const response = await this.plugin.callLLM(prompt, systemPrompt, (textChunk, currentFullText) => {
				// Hide loading and show content on first chunk
				if (loadingDiv.style.display !== 'none') {
					loadingDiv.style.display = 'none';
					contentDiv.style.display = 'block';
				}
				
				// Update content
				this.updateContentDisplay(contentDiv, currentFullText || textChunk);
			});

			// Final update
			loadingDiv.style.display = 'none';
			contentDiv.style.display = 'block';
			this.updateContentDisplay(contentDiv, response);

		} catch (error) {
			console.error('Error generating explanation:', error);
			loadingDiv.style.display = 'none';
			errorDiv.style.display = 'block';
			errorDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
		}
	}

	updateContentDisplay(contentDiv, text) {
		if (!text) return;

		text = text.trim();
		if (text.length === 0) return;

		try {
			// Remove code block markers if present
			if (text.startsWith('```')) {
				if (text.endsWith('```')) {
					text = text.split('\n').slice(1, -1).join('\n');
				} else {
					text = text.split('\n').slice(1).join('\n');
				}
			}
			
			// If not HTML, wrap in paragraph
			if (!text.startsWith('<')) {
				text = `<p>${text.replace(/\n/g, '<br>')}</p>`;
			}
			
			contentDiv.innerHTML = text;
		} catch (e) {
			console.error(`Error parsing content: ${e.message}`);
			contentDiv.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Settings tab
class TextExplainerSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Text Explainer Settings' });

		// API Key setting
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your OpenAI API key or OpenAI-compatible API key')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		// Model setting
		new Setting(containerEl)
			.setName('Model')
			.setDesc('LLM model to use')
			.addText(text => text
				.setPlaceholder('gpt-3.5-turbo')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		// Language setting
		new Setting(containerEl)
			.setName('Response Language')
			.setDesc('Language for explanations and translations')
			.addDropdown(dropdown => dropdown
				.addOption('Chinese', 'Chinese')
				.addOption('English', 'English')
				.addOption('Spanish', 'Spanish')
				.addOption('French', 'French')
				.addOption('German', 'German')
				.addOption('Japanese', 'Japanese')
				.setValue(this.plugin.settings.language)
				.onChange(async (value) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
				}));

		// Base URL setting
		new Setting(containerEl)
			.setName('Base URL')
			.setDesc('API base URL')
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.plugin.settings.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.baseUrl = value;
					await this.plugin.saveSettings();
				}));

		// Hotkey settings section
		containerEl.createEl('h3', { text: 'Hotkey Settings' });

		// Hotkey modifiers
		new Setting(containerEl)
			.setName('Hotkey Modifiers')
			.setDesc('Choose modifier keys (hold Ctrl/Cmd to select multiple)')
			.addDropdown(dropdown => {
				dropdown.addOption('Alt', 'Alt only');
				dropdown.addOption('Ctrl', 'Ctrl only');
				dropdown.addOption('Meta', 'Cmd/Win only');
				dropdown.addOption('Shift', 'Shift only');
				dropdown.addOption('Alt,Shift', 'Alt + Shift');
				dropdown.addOption('Ctrl,Shift', 'Ctrl + Shift');
				dropdown.addOption('Meta,Shift', 'Cmd/Win + Shift');
				const currentModifiers = this.plugin.settings.hotkeyModifiers.join(',');
				dropdown.setValue(currentModifiers);
				dropdown.onChange(async (value) => {
					this.plugin.settings.hotkeyModifiers = value.split(',');
					await this.plugin.saveSettings();
					// Re-register the hotkey command
					this.plugin.app.commands.removeCommand('text-explainer:explain-text-hotkey');
					this.plugin.addCommand({
						id: 'explain-text-hotkey',
						name: 'Explain text (hotkey)',
						hotkeys: [{
							modifiers: this.plugin.settings.hotkeyModifiers,
							key: this.plugin.settings.hotkeyKey
						}],
						editorCallback: (editor) => {
							this.plugin.explainSelectedText(editor);
						}
					});
				});
			});

		// Hotkey key
		new Setting(containerEl)
			.setName('Hotkey Key')
			.setDesc('The key to press with the modifiers')
			.addText(text => text
				.setPlaceholder('d')
				.setValue(this.plugin.settings.hotkeyKey)
				.onChange(async (value) => {
					if (value.length === 1) {
						this.plugin.settings.hotkeyKey = value.toLowerCase();
						await this.plugin.saveSettings();
						// Re-register the hotkey command
						this.plugin.app.commands.removeCommand('text-explainer:explain-text-hotkey');
						this.plugin.addCommand({
							id: 'explain-text-hotkey',
							name: 'Explain text (hotkey)',
							hotkeys: [{
								modifiers: this.plugin.settings.hotkeyModifiers,
								key: this.plugin.settings.hotkeyKey
							}],
							editorCallback: (editor) => {
								this.plugin.explainSelectedText(editor);
							}
						});
					}
				}));
	}
}

module.exports = TextExplainerPlugin;