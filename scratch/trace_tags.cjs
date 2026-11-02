const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('docs/templates/mau_2a_chuan.docx');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

const badTblRegex = /<w:tbl><w:tblPr><w:tblStyle w:val="a4"[^>]*>[\s\S]*?<\/w:tblPr>/;
xml = xml.replace(badTblRegex, '');

const tagRegex = /<\/?([a-zA-Z0-9:]+)(?:\s+[^>]*)?\/?>/g;
const stack = [];
let match;
let mismatchFound = false;
while ((match = tagRegex.exec(xml)) !== null) {
  const full = match[0];
  const tagName = match[1];
  const isClosing = full.startsWith('</');
  const isSelfClosing = full.endsWith('/>');

  if (isSelfClosing) continue;

  if (isClosing) {
    const last = stack.pop();
    if (last !== tagName) {
      console.log(`MISMATCH at index ${match.index}: expected </${last}>, but found </${tagName}>!`);
      console.log('Context:', xml.slice(Math.max(0, match.index - 100), Math.min(xml.length, match.index + 100)));
      mismatchFound = true;
      break;
    }
  } else {
    stack.push(tagName);
  }
}
if (!mismatchFound) {
  console.log('NO MISMATCH FOUND! All tags balanced!');
}
console.log('Remaining unclosed tags on stack:', stack);
