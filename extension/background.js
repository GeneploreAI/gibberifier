// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'gibberify-text',
    title: 'Gibberify Selected Text',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'gibberify-text' && info.selectionText) {
    // Send message to content script to replace the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: 'gibberify',
      text: info.selectionText
    });
  }
});
