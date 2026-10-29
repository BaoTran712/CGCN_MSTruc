const fs = require('fs');
const PizZip = require('pizzip');

const content = fs.readFileSync('docs/templates/mau_2a_chuan.docx');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

const htIdx = xml.indexOf('has_hoi_thao');
console.log('has_hoi_thao index:', htIdx);
console.log(xml.slice(htIdx - 300, htIdx + 1200));
