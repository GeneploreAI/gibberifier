import unicodedata
import random
import copy

def get_empty_unicode_characters():
    """
    Get a list of zero-width Unicode characters.
    These are characters that have zero width and are truly invisible.
    """
    empty_chars = []
    
    # Zero-width Unicode characters only (no line breaks)
    known_empty_chars = [
        '\u200B',  # ZERO WIDTH SPACE
        '\u200C',  # ZERO WIDTH NON-JOINER
        '\u200D',  # ZERO WIDTH JOINER
        '\u2060',  # WORD JOINER
        '\u2061',  # FUNCTION APPLICATION
        '\u2062',  # INVISIBLE TIMES
        '\u2063',  # INVISIBLE SEPARATOR
        '\u2064',  # INVISIBLE PLUS
        '\uFEFF',  # ZERO WIDTH NO-BREAK SPACE (BOM)
    ]
    
    for char in known_empty_chars:
        try:
            name = unicodedata.name(char, "UNKNOWN")
            category = unicodedata.category(char)
            empty_chars.append({
                'char': char,
                'unicode': f'U+{ord(char):04X}',
                'name': name,
                'category': category,
                'repr': repr(char)
            })
        except Exception as e:
            print(f"Error processing character {repr(char)}: {e}")
    
    return empty_chars

def find_more_empty_characters(start=0x0000, end=0x10000):
    """
    Search for additional zero-width characters in a Unicode range.
    This function looks for characters that are truly zero-width/invisible.
    """
    additional_empty = []
    
    for code_point in range(start, end):
        try:
            char = chr(code_point)
            category = unicodedata.category(char)
            name = unicodedata.name(char, "")
            
            # Look for characters that are zero-width or truly invisible (no line breaks)
            if (category == 'Cf' and
                ('ZERO WIDTH' in name or
                 'INVISIBLE' in name or
                 'JOINER' in name or
                 'FUNCTION APPLICATION' in name or
                 'WORD JOINER' in name) and
                'LINE' not in name and 'PARAGRAPH' not in name):
                
                additional_empty.append({
                    'char': char,
                    'unicode': f'U+{code_point:04X}',
                    'name': name if name else "UNKNOWN",
                    'category': category,
                    'repr': repr(char)
                })
        except Exception:
            continue
    
    return additional_empty

def get_all_empty_chars_list():
    """Return a simple list of all empty character strings."""
    empty_chars = get_empty_unicode_characters()
    return [char_info['char'] for char_info in empty_chars]

chars = get_all_empty_chars_list()

s = input("Enter a string to gibberify: ")

# Build the modified string with random empty characters between each character
result = ""

for i, char in enumerate(s):
    result += char
    # Don't add empty characters after the last character
    if i < len(s) - 1:
        # Add 10 random empty characters
        for j in range(random.randint(150, 200)):
            random_empty_char = random.choice(chars)
            result += random_empty_char

fs = result

print(f"Original: {s}")
print(f"Gibberified: {fs}")
print(f"Length - Original: {len(s)}, Gibberified: {len(fs)}")

# Save the gibberified string to a file
with open("gibberified_output.txt", "w", encoding="utf-8") as f:
    f.write(fs)