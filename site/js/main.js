// Gibberification logic lives in gibberify-core.js (shared with the browser extension)
const {
  ASCII_TO_UNICODE: asciiToUnicode,
  calculateAutoIntensity,
  sanitizeHtml,
  isRichHtml,
  copyViaCopyEvent,
} = Gibberify;

function updateSliderDisplay() {
  const slider = document.getElementById('intensitySlider');
  const valueDisplay = document.getElementById('sliderValue');
  const percentage = parseInt(slider.value);
  
  // Update display text
  valueDisplay.textContent = percentage + '%';
  
  // Update colors based on percentage
  valueDisplay.classList.remove('low', 'medium', 'high', 'extreme');
  
  if (percentage <= 100) {
    valueDisplay.classList.add('low');
  } else if (percentage <= 250) {
    valueDisplay.classList.add('medium');
  } else if (percentage <= 400) {
    valueDisplay.classList.add('high');
  } else {
    valueDisplay.classList.add('extreme');
  }
}

// Character count validation
function validateCharacterCount() {
  const inputText = getInputEl();
  const charWarning = document.getElementById('charWarning');
  const charCount = document.getElementById('charCount');
  const text = getInputText();
  const length = text.length;
  
  // Update character count display
  charCount.textContent = `${length} characters`;
  
  // Check if the length is outside the optimal range
  if (length > 25000) {
    // Add warning styling
    inputText.classList.add('warning');
    charCount.classList.add('warning');
    
    // Show appropriate warning message
    const warningMessage = `⚠️ Did you paste an already-Gibberified document in here?`;
    
    charWarning.textContent = warningMessage;
    charWarning.style.display = 'block';
  } else if (false) {
    // Add warning styling
    inputText.classList.add('warning');
    charCount.classList.add('warning');
    
    // Show appropriate warning message
    const warningMessage = `⚠️ Too long! Remove ${length - 500} characters to avoid diluting the invisible characters. Select the most important part of your text and input that instead.`;
    
    charWarning.textContent = warningMessage;
    charWarning.style.display = 'block';
  } else {
    // Remove warning styling
    inputText.classList.remove('warning');
    charCount.classList.remove('warning');
    charWarning.style.display = 'none';
  }
}

// iPad Mode state
let isIPadMode = true;

// Rich text mode: the textarea is swapped for a contenteditable div when formatted text is pasted
let richMode = false;

function getInputEl() {
  return document.getElementById(richMode ? 'richInput' : 'inputText');
}

function getInputText() {
  return richMode
    ? document.getElementById('richInput').innerText.replace(/\n$/, '')
    : document.getElementById('inputText').value;
}

function plainToHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

function placeCaretAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function enterRichMode(html) {
  const textarea = document.getElementById('inputText');
  const rich = document.getElementById('richInput');
  const focused = document.activeElement === textarea;
  const before = focused ? textarea.value.slice(0, textarea.selectionStart) : textarea.value;
  const after = focused ? textarea.value.slice(textarea.selectionEnd) : '';

  rich.innerHTML = plainToHtml(before) + html + plainToHtml(after);
  textarea.value = '';
  textarea.hidden = true;
  rich.hidden = false;
  richMode = true;
  document.getElementById('richNotice').classList.add('show');
  placeCaretAtEnd(rich);
  validateCharacterCount();
  updateAutoIntensity();
}

function exitRichMode(keepText = '') {
  const textarea = document.getElementById('inputText');
  const rich = document.getElementById('richInput');
  rich.innerHTML = '';
  rich.hidden = true;
  rich.classList.remove('warning');
  textarea.hidden = false;
  textarea.value = keepText;
  richMode = false;
  document.getElementById('richNotice').classList.remove('show');
  textarea.focus();
  validateCharacterCount();
  updateAutoIntensity();
}

function removeFormatting() {
  exitRichMode(getInputText());
}

function handlePaste(e) {
  const inputText = document.getElementById('inputText');
  const rich = document.getElementById('richInput');
  const target = e.target;
  const isOurs = target === inputText || rich.contains(target);
  if (!isOurs && target.closest && target.closest('input, textarea, [contenteditable]')) return;

  const html = e.clipboardData.getData('text/html');
  const text = e.clipboardData.getData('text/plain');
  const body = html ? sanitizeHtml(html) : null;
  const hasFormatting = body !== null && isRichHtml(body);
  if (!text && !hasFormatting) return;

  if (richMode) {
    e.preventDefault();
    if (!rich.contains(document.activeElement)) placeCaretAtEnd(rich);
    if (hasFormatting) {
      document.execCommand('insertHTML', false, body.innerHTML);
    } else {
      document.execCommand('insertText', false, text);
    }
  } else if (hasFormatting) {
    e.preventDefault();
    enterRichMode(body.innerHTML);
  } else if (target !== inputText) {
    e.preventDefault();
    inputText.focus();
    inputText.setRangeText(text, inputText.value.length, inputText.value.length, 'end');
    inputText.dispatchEvent(new Event('input'));
  }
}

// Clipboard copy function with fallback
async function copyToClipboard(text, html = null) {
  if (html) {
    if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem && window.isSecureContext) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        })]);
        return true;
      } catch (err) {
        console.error('Rich clipboard write failed:', err);
      }
    }
    return copyViaCopyEvent(text, html);
  }

  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Clipboard API failed:', err);
      throw err;
    }
  } else {
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        return true;
      } else {
        throw new Error('Copy command failed');
      }
    } catch (err) {
      document.body.removeChild(textArea);
      throw err;
    }
  }
}

function gibberifyText() {
  const inputText = getInputText();
  const outputElement = document.getElementById('outputText');
  const unicodeElement = document.getElementById('unicodeView');
  const statsElement = document.getElementById('stats');
  const button = document.getElementById('gibberifyButton');
  
  if (!inputText.trim()) {
    alert('Please enter some text to gibberify!');
    return;
  }
  
  // Set loading state
  const originalButtonText = button.innerHTML;
  button.innerHTML = '⏳ Processing...';
  button.disabled = true;
  
  // Use setTimeout to allow UI to update before processing
  setTimeout(() => {
    // Get intensity from slider
    const slider = document.getElementById('intensitySlider');
    const percentage = parseInt(slider.value);
    const options = { intensity: percentage, safe: isIPadMode };
    const { text: result, unicodeView: unicodeRepresentation, addedChars } = Gibberify.gibberify(inputText, options);
    
    const richResult = richMode
      ? Gibberify.gibberifyNode(document.getElementById('richInput').cloneNode(true), options).innerHTML
      : null;
    
    // Display the results
    outputElement.value = result;
    unicodeElement.value = unicodeRepresentation;
    
    // Show statistics
    const uniqueChars = [...new Set(addedChars)];
    const asciiReplacements = inputText.split('').filter(char => asciiToUnicode[char]).length;
    statsElement.innerHTML = `
      <strong>Statistics:</strong><br>
      Intensity level: ${percentage}%<br>
      Original length: ${inputText.length} characters<br>
      Gibberified length: ${result.length} characters<br>
      ASCII characters replaced with Unicode: ${asciiReplacements}<br>
      Invisible characters added: ${result.length - inputText.length}<br>
      Unique Unicode characters used: ${uniqueChars.length}
    `;
    statsElement.style.display = 'block';
    
    // Copy to clipboard
    copyToClipboard(result, richResult).then(() => {
      // Show success state
      button.innerHTML = '✅ Copied!';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        button.innerHTML = originalButtonText;
        button.disabled = false;
      }, 2000);
    }).catch(() => {
      // If clipboard fails, just reset button
      button.innerHTML = originalButtonText;
      button.disabled = false;
      
      // Auto-select the output text for manual copying
      outputElement.select();
      outputElement.setSelectionRange(0, 99999);
    });
    
  }, 100); // Small delay to show loading state
}

// Track whether user has manually adjusted the slider
let userHasTouchedSlider = false;

// Update slider based on text input (if user hasn't touched it)
function updateAutoIntensity() {
  if (!userHasTouchedSlider) {
    const slider = document.getElementById('intensitySlider');
    const charCount = getInputText().length;
    
    const autoIntensity = calculateAutoIntensity(charCount);
    slider.value = autoIntensity;
    updateSliderDisplay();
  }
}

// Toggle iPad Mode
function toggleIPadMode() {
  const toggle = document.getElementById('ipadModeToggle');
  const newState = toggle.checked;
  const warningBox = document.getElementById('ipadWarningBox');
  
  // Show warning when turning off iPad mode (only if not previously dismissed)
  if (!newState && isIPadMode) {
    const warningDismissed = localStorage.getItem('ipadWarningDismissed');
    if (warningDismissed !== 'true') {
      warningBox.classList.add('show');
    }
  } else {
    warningBox.classList.remove('show');
  }
  
  isIPadMode = newState;
  
  // Save preference to localStorage
  localStorage.setItem('ipadMode', isIPadMode ? 'true' : 'false');
  
  // Update label to show current mode
  const label = document.querySelector('label[for="ipadModeToggle"]');
  if (isIPadMode) {
    label.innerHTML = 'iPad Mode: <span style="color: #28a745; font-weight: bold;">ON</span>';
  } else {
    label.innerHTML = 'iPad Mode: <span style="color: #6c757d;">OFF</span>';
  }
}

// Close iPad warning box
function closeIPadWarning() {
  const warningBox = document.getElementById('ipadWarningBox');
  warningBox.classList.remove('show');
  localStorage.setItem('ipadWarningDismissed', 'true');
}

// Allow Enter key to trigger gibberification
document.addEventListener('DOMContentLoaded', function() {
  const inputText = document.getElementById('inputText');
  const slider = document.getElementById('intensitySlider');
  const ipadToggle = document.getElementById('ipadModeToggle');
  
  // Load saved iPad mode preference (default to true if not set)
  const savedIPadMode = localStorage.getItem('ipadMode');
  if (savedIPadMode === null || savedIPadMode === 'true') {
    ipadToggle.checked = true;
    isIPadMode = true;
  } else {
    ipadToggle.checked = false;
    isIPadMode = false;
  }
  
  // Set initial intensity to 500%
  slider.value = 500;
  updateSliderDisplay();
  
  inputText.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      gibberifyText();
    }
  });

  // Add input event listener for real-time character count validation and auto intensity
  inputText.addEventListener('input', function() {
    validateCharacterCount();
    updateAutoIntensity();
  });
  
  const richInput = document.getElementById('richInput');
  document.addEventListener('paste', handlePaste);
  
  // Keep typing in rich mode identical to the textarea: no formatting shortcuts, Enter = line break
  richInput.addEventListener('beforeinput', function(event) {
    if (event.inputType.startsWith('format')) {
      event.preventDefault();
    } else if (event.inputType === 'insertParagraph') {
      event.preventDefault();
      document.execCommand('insertLineBreak');
    }
  });
  
  richInput.addEventListener('input', function() {
    if (!richInput.innerText.trim()) {
      exitRichMode();
      return;
    }
    validateCharacterCount();
    updateAutoIntensity();
  });
  
  richInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      gibberifyText();
    }
  });
  
  // Drops would otherwise insert unsanitized HTML
  richInput.addEventListener('drop', function(event) {
    event.preventDefault();
  });
  
  // Add slider event listener and track user interaction
  slider.addEventListener('input', function() {
    userHasTouchedSlider = true;
    updateSliderDisplay();
  });
  
  // Add iPad mode toggle listener
  ipadToggle.addEventListener('change', toggleIPadMode);
  
  // Initialize iPad mode label
  toggleIPadMode();

  // Auto-focus on the input field when page loads
  inputText.focus();
  
  // Initial character count validation
  validateCharacterCount();
});
