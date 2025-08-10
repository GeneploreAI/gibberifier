// Character count validation
function validateCharacterCount() {
  const inputText = document.getElementById('inputText');
  const charWarning = document.getElementById('charWarning');
  const charCount = document.getElementById('charCount');
  const text = inputText.value;
  const length = text.length;
  
  // Update character count display
  charCount.textContent = `${length} characters`;
  
  // Check if the length is outside the optimal range
  if (length > 500) {
    // Add warning styling
    inputText.classList.add('warning');
    charCount.classList.add('warning');
    
    // Show appropriate warning message
    const warningMessage = `⚠️ Too long! Remove ${length - 500} characters for optimal gibberification.`;
    
    charWarning.textContent = warningMessage;
    charWarning.style.display = 'block';
  } else {
    // Remove warning styling
    inputText.classList.remove('warning');
    charCount.classList.remove('warning');
    charWarning.style.display = 'none';
  }
}

// Zero-width Unicode characters (same as in the Python script)
const emptyChars = [
  '\u200B',  // ZERO WIDTH SPACE
  '\u200C',  // ZERO WIDTH NON-JOINER
  '\u200D',  // ZERO WIDTH JOINER
  '\u2060',  // WORD JOINER
  '\u2061',  // FUNCTION APPLICATION
  '\u2062',  // INVISIBLE TIMES
  '\u2063',  // INVISIBLE SEPARATOR
  '\u2064',  // INVISIBLE PLUS
  '\uFEFF',  // ZERO WIDTH NO-BREAK SPACE (BOM)
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomEmptyChar() {
  return emptyChars[Math.floor(Math.random() * emptyChars.length)];
}

// Clipboard copy function with fallback
async function copyToClipboard(text) {
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
  const inputText = document.getElementById('inputText').value;
  const outputElement = document.getElementById('outputText');
  const unicodeElement = document.getElementById('unicodeView');
  const statsElement = document.getElementById('stats');
  const button = document.querySelector('button');
  
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
    let result = '';
    let unicodeRepresentation = '';
    let addedChars = [];
    
    // Process each character in the input
    for (let i = 0; i < inputText.length; i++) {
      const char = inputText[i];
      result += char;
      
      // Add the original character to Unicode representation
      const charUnicode = 'U+' + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
      unicodeRepresentation += `[${charUnicode}]`;
      
      // Don't add empty characters after the last character
      if (i < inputText.length - 1) {
        // Add 150-200 random empty characters (same range as Python script)
        const numEmptyChars = getRandomInt(150, 200);
        
        for (let j = 0; j < numEmptyChars; j++) {
          const emptyChar = getRandomEmptyChar();
          result += emptyChar;
          addedChars.push(emptyChar);
          
          // Add Unicode representation with space
          const unicode = 'U+' + emptyChar.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
          unicodeRepresentation += ` [${unicode}]`;
        }
        
        // Add a line break after each original character for readability
        unicodeRepresentation += '\n';
      }
    }
    
    // Display the results
    outputElement.value = result;
    unicodeElement.value = unicodeRepresentation;
    
    // Show statistics
    const uniqueChars = [...new Set(addedChars)];
    statsElement.innerHTML = `
      <strong>Statistics:</strong><br>
      Original length: ${inputText.length} characters<br>
      Gibberified length: ${result.length} characters<br>
      Invisible characters added: ${result.length - inputText.length}<br>
      Unique Unicode characters used: ${uniqueChars.length}
    `;
    statsElement.style.display = 'block';
    
    // Copy to clipboard
    copyToClipboard(result).then(() => {
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

// Allow Enter key to trigger gibberification
document.addEventListener('DOMContentLoaded', function() {
  const inputText = document.getElementById('inputText');
  
  inputText.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      gibberifyText();
    }
  });

  // Add input event listener for real-time character count validation
  inputText.addEventListener('input', validateCharacterCount);

  // Auto-focus on the input field when page loads
  inputText.focus();
  
  // Initial character count validation
  validateCharacterCount();
});
