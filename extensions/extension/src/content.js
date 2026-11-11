// Injected on demand together with gibberify-core.js; the guard keeps repeat injections from stacking listeners
(() => {
  if (globalThis.__gibberifierListening) return;
  globalThis.__gibberifierListening = true;

  const { calculateAutoIntensity, gibberify, gibberifyNode, sanitizeHtml, isRichHtml, copyViaCopyEvent } = Gibberify;
  const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email']);

  // Matches the website defaults: auto intensity by length, iPad Mode on
  const optionsFor = (text) => ({ intensity: calculateAutoIntensity(text.length), safe: true });

  function deepActiveElement() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  function isTextField(el) {
    return el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(el.type));
  }

  function replaceInTextField(el) {
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = el.value.slice(start, end);
    if (!selected.trim()) return false;

    const { text } = gibberify(selected, optionsFor(selected));
    el.focus();
    // insertText keeps undo history and is seen by framework-controlled inputs (React etc.)
    if (!document.execCommand('insertText', false, text)) {
      el.setRangeText(text, start, end, 'end');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function editableHost(range) {
    const node = range.commonAncestorContainer;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return el?.isContentEditable ? el : null;
  }

  function replaceInEditable(selection, range, host) {
    const plain = selection.toString();
    if (!plain.trim()) return false;
    const options = optionsFor(plain);

    if (host.closest('[contenteditable="plaintext-only"]')) {
      return document.execCommand('insertText', false, gibberify(plain, options).text);
    }

    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    gibberifyNode(container, options);
    if (document.execCommand('insertHTML', false, container.innerHTML)) return true;

    const fragment = document.createDocumentFragment();
    fragment.append(...container.childNodes);
    range.deleteContents();
    range.insertNode(fragment);
    range.collapse(false);
    host.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function copySelection(selection, fallbackText) {
    const plain = selection.rangeCount ? selection.toString() : '';
    const source = plain.trim() ? plain : (fallbackText || '');
    if (!source.trim()) return;
    const options = optionsFor(source);

    let html = null;
    if (plain.trim()) {
      const container = document.createElement('div');
      container.appendChild(selection.getRangeAt(0).cloneContents());
      const body = sanitizeHtml(container.innerHTML);
      if (isRichHtml(body)) html = gibberifyNode(body, options).innerHTML;
    }

    try {
      copyViaCopyEvent(gibberify(source, options).text, html);
      showNotification('Gibberified text copied to clipboard!');
    } catch (err) {
      console.error('Gibberifier clipboard copy failed:', err);
      showNotification('Could not copy to clipboard', true);
    }
  }

  function handleGibberify(fallbackText) {
    const active = deepActiveElement();
    if (isTextField(active) && active.selectionStart !== active.selectionEnd) {
      if (replaceInTextField(active)) showNotification('Text gibberified!');
      return;
    }

    const selection = window.getSelection();
    if (selection.rangeCount && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const host = editableHost(range);
      if (host) {
        if (replaceInEditable(selection, range, host)) showNotification('Text gibberified!');
        return;
      }
    }

    copySelection(selection, fallbackText);
  }

  function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isError ? '#d9534f' : '#4CAF50'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 2147483647;
    `;
    document.body.appendChild(notification);

    const hidden = { transform: 'translateX(400px)', opacity: 0 };
    const shown = { transform: 'translateX(0)', opacity: 1 };
    notification.animate([hidden, shown], { duration: 300, easing: 'ease-out' });
    setTimeout(() => {
      notification.animate([shown, hidden], { duration: 300, easing: 'ease-in', fill: 'forwards' })
        .finished.then(() => notification.remove());
    }, 3000);
  }

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'gibberify') handleGibberify(request.text);
  });
})();
