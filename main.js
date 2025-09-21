const { Plugin, Modal, Setting, Notice, MarkdownView, PluginSettingTab } = require('obsidian');

// Default settings
const DEFAULT_SETTINGS = {
	model: "gpt-3.5-turbo",
	apiKey: "",
	baseUrl: "https://api.openai.com/v1",
	language: "Chinese",
	hotkeyModifiers: ["Alt"],
	hotkeyKey: "d",
	noteDirectory: "Explanations"
};

// Main plugin class
class TextExplainerPlugin extends Plugin {
	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('message-circle', 'Text Explainer', () => {
			this.explainSelectedText();
		});

		// Add command (works in edit and reader mode)
		this.addCommand({
			id: 'explain-selected-text',
			name: 'Explain selected text',
			checkCallback: (checking) => {
				const selectionData = this.getSelectedText();
				if (selectionData && selectionData.selectedText) {
					if (!checking) this.explainSelectedText(selectionData.editor);
					return true;
				}
				return false;
			}
		});

		// Register hotkey (works in edit and reader mode)
		this.addCommand({
			id: 'explain-text-hotkey',
			name: 'Explain text (hotkey)',
			hotkeys: [{
				modifiers: this.settings.hotkeyModifiers,
				key: this.settings.hotkeyKey
			}],
			checkCallback: (checking) => {
				const selectionData = this.getSelectedText();
				if (selectionData && selectionData.selectedText) {
					if (!checking) this.explainSelectedText(selectionData.editor);
					return true;
				}
				return false;
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

	// Get selected text from the active editor or DOM selection
	getSelectedText(editor) {
		if (!editor) {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				editor = activeView.editor;
			}
		}

		// Try to get selection from editor (edit mode)
		if (editor) {
			const selection = editor.getSelection();
			if (selection) {
				// Get context around selection
				const cursor = editor.getCursor('from');
				const line = editor.getLine(cursor.line);
				const doc = editor.getValue();
				const selectionStart = editor.posToOffset(editor.getCursor('from'));
				const selectionEnd = editor.posToOffset(editor.getCursor('to'));

				// Get surrounding context
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
		}

		// Try to get selection from DOM (reader mode)
		const selection = window.getSelection();
		if (selection && selection.toString().trim()) {
			const selectedText = selection.toString().trim();
			
			// Get context from surrounding DOM elements
			const range = selection.getRangeAt(0);
			const container = range.commonAncestorContainer;
			
			// Find the paragraph or container element
			let parentElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
			while (parentElement && !['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(parentElement.tagName)) {
				parentElement = parentElement.parentElement;
			}
			
			const paragraphText = parentElement ? parentElement.textContent.trim() : selectedText;
			
			// Get surrounding context by looking at siblings
			let textBefore = '';
			let textAfter = '';
			
			if (parentElement) {
				const fullText = parentElement.textContent;
				const selectedIndex = fullText.indexOf(selectedText);
				if (selectedIndex !== -1) {
					const contextRange = 200;
					textBefore = fullText.substring(Math.max(0, selectedIndex - contextRange), selectedIndex).trim();
					textAfter = fullText.substring(selectedIndex + selectedText.length, Math.min(fullText.length, selectedIndex + selectedText.length + contextRange)).trim();
				}
			}

			return {
				selectedText,
				textBefore,
				textAfter,
				paragraphText,
				editor: null // No editor in reader mode
			};
		}

		return null;
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

		// Action buttons container
		const actionsDiv = contentEl.createDiv('explanation-actions');
		actionsDiv.style.display = 'none';
		
		// Create Note & Link button
		const createNoteBtn = actionsDiv.createEl('button', {
			text: 'Create Note & Link',
			cls: 'mod-cta'
		});
		createNoteBtn.addEventListener('click', () => this.createNoteAndLink());

		// Start explanation process
		this.generateExplanation(loadingDiv, contentDiv, errorDiv, actionsDiv);
	}

	async generateExplanation(loadingDiv, contentDiv, errorDiv, actionsDiv) {
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
			actionsDiv.style.display = 'block';
			this.updateContentDisplay(contentDiv, response);
			this.explanationResponse = response;

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

	sanitizeFilename(text) {
		if (!text || text.trim().length === 0) {
			return 'Untitled';
		}
		
		// Remove HTML tags
		let filename = text.replace(/<[^>]*>/g, '');
		
		// Replace invalid characters for filenames
		filename = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
		
		// Replace multiple spaces with single space and trim
		filename = filename.replace(/\s+/g, ' ').trim();
		
		// Limit length to 100 characters
		if (filename.length > 100) {
			filename = filename.substring(0, 100).trim();
		}
		
		// If empty after sanitization, use default name
		if (filename.length === 0) {
			return 'Untitled';
		}
		
		return filename;
	}

	async createNoteFromExplanation() {
		try {
			const fileName = this.sanitizeFilename(this.selectionData.selectedText);
			const noteDirectory = this.settings.noteDirectory || 'Explanations';
			
			// Create directory if it doesn't exist
			const adapter = this.app.vault.adapter;
			if (!(await adapter.exists(noteDirectory))) {
				await adapter.mkdir(noteDirectory);
			}
			
			// Generate unique filename
			let notePath = `${noteDirectory}/${fileName}.md`;
			let counter = 1;
			
			while (await this.app.vault.adapter.exists(notePath)) {
				notePath = `${noteDirectory}/${fileName}-${counter}.md`;
				counter++;
			}
			
			// Prepare note content
			const now = new Date().toISOString().split('T')[0];
			const cleanExplanation = this.explanationResponse.replace(/<[^>]*>/g, '').trim();
			
			const noteContent = `# ${this.selectionData.selectedText}

> Explanation generated on ${now}

## Original Context
${this.selectionData.selectedText}

## Explanation
${cleanExplanation}

---
*Generated by Text Explainer Plugin*`;

			// Create the note
			await this.app.vault.create(notePath, noteContent);
			
			return notePath;
		} catch (error) {
			console.error('Error creating note:', error);
			throw error;
		}
	}

	getLinkTextFromNotePath(notePath) {
		const fileName = notePath.split('/').pop().replace('.md', '');
		return `[[${fileName}]]`;
	}

	replaceSelectionWithLink(notePath) {
		const editor = this.selectionData.editor;
		if (!editor) {
			console.warn('Editor not available - skipping text replacement');
			return false;
		}

		const linkText = this.getLinkTextFromNotePath(notePath);
		
		try {
			const selection = editor.getSelection();
			if (selection && selection === this.selectionData.selectedText) {
				editor.replaceSelection(linkText);
				return true;
			}

			const cursor = editor.getCursor();
			const currentLine = editor.getLine(cursor.line);
			const textIndex = currentLine.indexOf(this.selectionData.selectedText);
			if (textIndex !== -1) {
				const lineNumber = cursor.line;
				const from = { line: lineNumber, ch: textIndex };
				const to = { line: lineNumber, ch: textIndex + this.selectionData.selectedText.length };
				editor.replaceRange(linkText, from, to);
				return true;
			}

			editor.replaceSelection(linkText);
			return true;
		} catch (error) {
			console.error('Error replacing selection with link:', error);
			editor.replaceSelection(linkText);
			return true;
		}
	}

	findSelectionIndexInContent(content, selectedText, textBefore, textAfter, paragraphText) {
		if (!selectedText) {
			return -1;
		}

		const matchesContext = (candidateIndex) => {
			const beforeSlice = content.substring(Math.max(0, candidateIndex - (textBefore ? textBefore.length : 0)), candidateIndex).trim();
			const afterSlice = content.substring(candidateIndex + selectedText.length, Math.min(content.length, candidateIndex + selectedText.length + (textAfter ? textAfter.length : 0))).trim();
			const beforeMatch = !textBefore || beforeSlice.endsWith(textBefore);
			const afterMatch = !textAfter || afterSlice.startsWith(textAfter);
			return beforeMatch && afterMatch;
		};

		let candidateIndex = content.indexOf(selectedText);
		if (candidateIndex === -1) {
			return -1;
		}

		let index = candidateIndex;
		while (index !== -1) {
			if (matchesContext(index)) {
				return index;
			}
			index = content.indexOf(selectedText, index + 1);
		}

		if (paragraphText) {
			const paragraphIndex = content.indexOf(paragraphText);
			if (paragraphIndex !== -1) {
				const innerIndex = paragraphText.indexOf(selectedText);
				if (innerIndex !== -1) {
					return paragraphIndex + innerIndex;
				}
			}
		}

		return candidateIndex;
	}

	async insertLinkIntoActiveFile(notePath) {
		try {
			const activeFile = this.plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				console.warn('Active file not found - skipping link insertion');
				return false;
			}

			const content = await this.plugin.app.vault.read(activeFile);
			const index = this.findSelectionIndexInContent(
				content,
				this.selectionData.selectedText,
				this.selectionData.textBefore,
				this.selectionData.textAfter,
				this.selectionData.paragraphText
			);

			if (index === -1) {
				console.warn('Selected text not found in active file - skipping link insertion');
				return false;
			}

			const linkText = this.getLinkTextFromNotePath(notePath);
			const updatedContent = `${content.slice(0, index)}${linkText}${content.slice(index + this.selectionData.selectedText.length)}`;
			await this.plugin.app.vault.modify(activeFile, updatedContent);
			return true;
		} catch (error) {
			console.error('Error inserting link into active file:', error);
			return false;
		}
	}

	async createNoteAndLink() {
		try {
			// Show loading state on button
			const button = this.contentEl.querySelector('button');
			button.textContent = 'Creating Note...';
			button.disabled = true;
			
			// Create the note
			const notePath = await this.createNoteFromExplanation();
			
			const linkInserted = this.selectionData.editor
				? this.replaceSelectionWithLink(notePath)
				: await this.insertLinkIntoActiveFile(notePath);

			const message = linkInserted
				? `Note created and linked: ${notePath}`
				: `Note created (link not inserted automatically): ${notePath}`;
			new Notice(message);
			
			// Close the modal
			this.close();
			
		} catch (error) {
			console.error('Error creating note:', error);
			new Notice(`Error: ${error.message}`);
			
			// Reset button state
			const button = this.contentEl.querySelector('button');
			if (button) {
				button.textContent = 'Create Note & Link';
				button.disabled = false;
			}
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

		// Note directory setting
		new Setting(containerEl)
			.setName('Note Directory')
			.setDesc('Directory where explanation notes will be created (relative to vault root)')
			.addText(text => text
				.setPlaceholder('Explanations')
				.setValue(this.plugin.settings.noteDirectory)
				.onChange(async (value) => {
					this.plugin.settings.noteDirectory = value;
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
						checkCallback: (checking) => {
							const selectionData = this.plugin.getSelectedText();
							if (selectionData && selectionData.selectedText) {
								if (!checking) this.plugin.explainSelectedText(selectionData.editor);
								return true;
							}
							return false;
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
							checkCallback: (checking) => {
								const selectionData = this.plugin.getSelectedText();
								if (selectionData && selectionData.selectedText) {
									if (!checking) this.plugin.explainSelectedText(selectionData.editor);
									return true;
								}
								return false;
							}
						});
					}
				}));
	}
}

module.exports = TextExplainerPlugin;
