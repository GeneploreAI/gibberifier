// \p{Cf} covers zero-width spaces/joiners, invisible operators, BOM, soft hyphen, bidi controls and TAG characters.
const INVISIBLE_CHARS = /[\p{Cf}\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;

function ungibberify(text) {
  return text.replace(INVISIBLE_CHARS, '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ungibberify };
}

// CLI: node ungibberifier.js "text"   or   pbpaste | node ungibberifier.js
if (typeof require !== 'undefined' && require.main === module) {
  const args = process.argv.slice(2);
  if (args.length) {
    process.stdout.write(ungibberify(args.join(' ')) + '\n');
  } else {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { input += chunk; });
    process.stdin.on('end', () => process.stdout.write(ungibberify(input)));
  }
}
