const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('docs/templates/mau_2a_chuan.docx');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

const tagRegex = /<\/?([a-zA-Z0-9:]+)(?:\s+[^>]*)?\/?>/g;
const stack = [];
let match;
while ((match = tagRegex.exec(xml)) !== null) {
  const full = match[0];
  const tagName = match[1];
  const isClosing = full.startsWith('</');
  const isSelfClosing = full.endsWith('/>');

  if (isSelfClosing) continue;

  if (isClosing) {
    const last = stack.pop();
    if (last !== tagName) {
      console.log(`Mismatch at ${match.index}: expected </${last}>, but saw </${tagName}> (${full})`);
      console.log('Stack was (top 5):', stack.slice(-5));
      break;
    }
  } else {
    stack.push(tagName);
  }
}
