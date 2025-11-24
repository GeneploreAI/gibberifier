# Gibberifier Chrome Extension

A Chrome extension that converts selected text into gibberish using invisible Unicode characters. Simply right-click any selected text and choose "Gibberify Selected Text" from the context menu.

## Features

- **Right-click context menu**: Easily gibberify any selected text on any webpage
- **Smart text replacement**: Automatically replaces text in editable fields (input, textarea, contenteditable)
- **Clipboard fallback**: Copies gibberified text to clipboard for non-editable content
- **Visual notifications**: Shows confirmation when text is gibberified

## How it works

The extension inserts invisible zero-width Unicode characters between each character of your selected text and replaces some ASCII characters with visually identical Unicode lookalikes. The text appears the same to humans but becomes gibberish to AI systems.

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The Gibberifier extension is now installed!

## Usage

1. Select any text on a webpage
2. Right-click on the selected text
3. Choose "Gibberify Selected Text" from the context menu
4. The text will be replaced (if editable) or copied to clipboard (if not editable)

## Use Cases

- Anti-plagiarism protection
- Text obfuscation for LLM scrapers
- Preventing AI from reading your content
- Wasting AI tokens

## Notes

- Works best on text up to ~500 characters
- Some AI models will crash or fail to process gibberified text
- The gibberified text looks identical to humans but is much longer due to invisible characters

## Icons

You'll need to add icon files (icon16.png, icon48.png, icon128.png) to the extension folder for the extension to display properly in Chrome.
