chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'gibberify-text',
    title: 'Gibberify Selected Text',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'gibberify-text' || !tab?.id) return;

  // Target the frame the selection is in so text inside iframes works too
  const frameId = info.frameId ?? 0;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frameId] },
      files: ['dist/gibberify-core.js', 'dist/content.js']
    });
    await chrome.tabs.sendMessage(tab.id, { action: 'gibberify', text: info.selectionText }, { frameId });
  } catch (error) {
    console.error('Gibberifier failed to run on this page:', error);
  }
});
