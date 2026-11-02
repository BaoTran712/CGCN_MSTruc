const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');

const content = fs.readFileSync('docs/templates/Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();
const dom = new DOMParser().parseFromString(xml, 'text/xml');

const paragraphs = dom.getElementsByTagName('w:p');
console.log('Mẫu 1a paragraphs count:', paragraphs.length);
for (let i = 0; i < paragraphs.length; i++) {
  const t = (paragraphs[i].textContent || '').replace(/\s+/g, ' ').trim();
  if (t.includes('{') || t.includes('Số:') || t.includes('Kính gửi') || t.includes('TRƯỞNG') || t.includes('Mục đích')) {
    console.log(`P[${i}]: ${t}`);
  }
}
