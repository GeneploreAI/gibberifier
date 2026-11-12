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

  // --- Google Docs: whole-document button ---
  // Docs renders text on a canvas, so the page is gibberified by copying everything through
  // Docs' own (hidden) editing iframe and pasting the gibberified HTML back over the selection.
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function gibberifyClipboardData({ html, text }) {
    if (!text.trim()) return null;
    const options = optionsFor(text);
    if (!html) return { html: '', text: gibberify(text, options).text };

    const body = gibberifyNode(sanitizeHtml(html), options);
    return { html: body.innerHTML, text: body.textContent };
  }

  function pressSelectAll(frameWin, target) {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    const init = {
      key: 'a', code: 'KeyA', view: frameWin,
      ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true
    };
    for (const type of ['keydown', 'keypress', 'keyup']) {
      const event = new KeyboardEvent(type, init);
      // Docs reads the legacy keyCode, which the constructor leaves at 0
      Object.defineProperty(event, 'keyCode', { value: 65 });
      Object.defineProperty(event, 'which', { value: 65 });
      target.dispatchEvent(event);
    }
  }

  function fireMouse(el, types) {
    const rect = el.getBoundingClientRect();
    const init = { bubbles: true, cancelable: true, view: window, button: 0, clientX: rect.left + 2, clientY: rect.top + 2 };
    for (const type of types) el.dispatchEvent(new MouseEvent(type, init));
  }

  // Fallback for when Docs ignores synthetic key events: Edit > Select all (English UI)
  async function selectAllViaMenu() {
    const menu = document.getElementById('docs-edit-menu');
    if (!menu) return;
    fireMouse(menu, ['mousedown', 'mouseup', 'click']);
    await wait(250);
    const item = [...document.querySelectorAll('.goog-menuitem')]
      .find((el) => /^select all/i.test(el.textContent.trim()));
    if (item) fireMouse(item, ['mouseover', 'mousedown', 'mouseup', 'click']);
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(250);
  }

  // Runs Docs' own copy handler and swaps the clipboard contents for the gibberified version
  function copyAndGibberify(frameDoc) {
    let result = null;
    const onCopy = (e) => {
      console.log('Gibberifier: Docs copy flavors', [...e.clipboardData.types]);
      result = gibberifyClipboardData({
        html: e.clipboardData.getData('text/html'),
        text: e.clipboardData.getData('text/plain')
      });
      if (!result) return;
      // Docs pastes its own internal slice format in preference to HTML/text, so drop every original flavor
      e.clipboardData.clearData();
      e.clipboardData.setData('text/plain', result.text);
      e.clipboardData.setData('text/html', result.html);
      e.preventDefault();
    };
    // On the window so it runs after Docs' own copy handler has filled the clipboard data
    frameDoc.defaultView.addEventListener('copy', onCopy);
    try {
      frameDoc.execCommand('copy');
    } finally {
      frameDoc.defaultView.removeEventListener('copy', onCopy);
    }
    return result;
  }

  async function gibberifyDocsPage(button) {
    const frameDoc = document.querySelector('iframe.docs-texteventtarget-iframe')?.contentDocument;
    const frameWin = frameDoc?.defaultView;
    const editable = frameDoc?.querySelector('[contenteditable]') ?? frameDoc?.body;
    if (!editable) {
      showNotification('Could not find the Google Docs editor', true);
      return;
    }

    button.disabled = true;
    try {
      editable.focus();
      const target = frameDoc.activeElement ?? editable;

      pressSelectAll(frameWin, target);
      await wait(300);
      let result = copyAndGibberify(frameDoc);

      if (!result) {
        await selectAllViaMenu();
        editable.focus();
        result = copyAndGibberify(frameDoc);
      }
      if (!result) {
        showNotification('Could not select and copy the document text', true);
        return;
      }

      editable.focus();
      // Docs cancels a paste event it handled, so a cancelled event means the text went in
      const data = new DataTransfer();
      data.setData('text/plain', result.text);
      data.setData('text/html', result.html);
      const synthetic = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      const handled = !target.dispatchEvent(synthetic);
      if (!handled) frameDoc.execCommand('paste');
      showNotification('Document gibberified! Use Undo to revert.');
    } catch (err) {
      console.error('Gibberifier failed on Google Docs:', err);
      showNotification('Could not gibberify this document', true);
    } finally {
      button.disabled = false;
    }
  }

  const DOCS_BUTTON_ID = 'gibberifier-docs-button';
  // Only an open document (/document/d/<id>/...), not the /document/u/0/ document list
  const isOpenDoc = () => location.hostname === 'docs.google.com' && /^\/document\/(u\/\d+\/)?d\//.test(location.pathname);

  function createDocsButton() {
    const button = document.createElement('button');
    button.id = DOCS_BUTTON_ID;
    button.type = 'button';
    button.textContent = 'Gibberify page';
    button.title = 'Gibberify the entire document, keeping its formatting';
    button.style.cssText = `
      height: 36px;
      margin: 0 8px;
      padding: 0 20px;
      flex: none;
      align-self: center;
      background: #0b57d0;
      color: #fff;
      border: none;
      border-radius: 18px;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
    `;
    button.addEventListener('mouseenter', () => { button.style.background = '#0a4cb5'; });
    button.addEventListener('mouseleave', () => { button.style.background = '#0b57d0'; });
    button.addEventListener('click', () => gibberifyDocsPage(button));
    return button;
  }

  // Keeps the button directly before the Share button, and removes it when not in a document
  function syncDocsButton() {
    const existing = document.getElementById(DOCS_BUTTON_ID);
    const share = isOpenDoc() ? document.getElementById('docs-titlebar-share-client-button') : null;
    if (!share) {
      existing?.remove();
      return;
    }
    if (existing && existing.nextElementSibling === share) return;
    share.parentElement.insertBefore(existing ?? createDocsButton(), share);
  }

  if (location.hostname === 'docs.google.com') {
    let scheduled = false;
    // Docs builds its title bar after load and re-renders it, so keep checking
    new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; syncDocsButton(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
    syncDocsButton();
  }
})();
