const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');

const content = fs.readFileSync('CGCN_MSTruc/docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();
const dom = new DOMParser().parseFromString(xml, 'text/xml');
const tbls = dom.getElementsByTagName('w:tbl');

console.log('Original Table 10 XML:');
const t10 = tbls[10];
console.log('Table 10 rows:', t10.getElementsByTagName('w:tr').length);
for (let r = 0; r < t10.getElementsByTagName('w:tr').length; r++) {
  const row = t10.getElementsByTagName('w:tr')[r];
  console.log(`Row ${r}: text="${(row.textContent||'').trim()}"`);
}

console.log('Original Table 11 XML:');
const t11 = tbls[11];
console.log('Table 11 rows:', t11.getElementsByTagName('w:tr').length);
for (let r = 0; r < t11.getElementsByTagName('w:tr').length; r++) {
  const row = t11.getElementsByTagName('w:tr')[r];
  console.log(`Row ${r}: text="${(row.textContent||'').trim()}"`);
}
