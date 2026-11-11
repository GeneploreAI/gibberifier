// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'gibberify-text',
    title: 'Gibberify Selected Text',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'gibberify-text' && info.selectionText) {
    try {
      // Inject content script if not already present
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Send message to content script to replace the selected text
      chrome.tabs.sendMessage(tab.id, {
        action: 'gibberify',
        text: info.selectionText
      });
    } catch (error) {
      console.error('Error injecting content script:', error);
    }
  }
});
