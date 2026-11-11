# Gibberifier Browser Extension

A Chrome and Firefox extension that converts selected text into gibberish using invisible Unicode characters. Simply right-click any selected text and choose "Gibberify Selected Text" from the context menu.

## Features

- **Right-click context menu**: Easily gibberify any selected text on any webpage, including inside iframes
- **Smart text replacement**: Automatically replaces text in editable fields (input, textarea, contenteditable)
- **Keeps formatting**: Bold, italics, links, lists etc. are preserved in rich-text editors and when copying
- **Clipboard fallback**: Copies gibberified text to clipboard for non-editable content
- **Visual notifications**: Shows confirmation when text is gibberified

## How it works

The extension inserts invisible zero-width Unicode characters between each character of your selected text and replaces some ASCII characters with visually identical Unicode lookalikes. The text appears the same to humans but becomes gibberish to AI systems.

It uses the same engine as the website (`site/js/gibberify-core.js`) with the website's defaults: intensity is picked automatically from the selection length and iPad Mode is on.

## Building

The Chrome and Firefox builds come from one source tree. Requires Node 18+; there are no dependencies to install.

```sh
cd extensions/extension
npm run build           # src/ + site/js/gibberify-core.js -> dist/, and writes manifest.firefox.json
npm run stage:chrome    # -> build/chrome/
npm run stage:firefox   # -> build/firefox/
```

- `manifest.json` is the Chrome manifest and the single source of truth; `manifest.firefox.json` is generated from it.
- Re-run `npm run build` after changing `src/` or `site/js/gibberify-core.js`.

## Installation

**Chrome**
1. Open `chrome://extensions/` and enable "Developer mode"
2. Click "Load unpacked" and select `extensions/extension/build/chrome`

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on…" and select `extensions/extension/build/firefox/manifest.json`

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
