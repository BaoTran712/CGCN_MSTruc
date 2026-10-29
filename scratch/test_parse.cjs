const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');

const content = fs.readFileSync('docs/templates/mau_2a_chuan.docx');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

const badTblRegex = /<w:tbl><w:tblPr><w:tblStyle w:val="a4"[^>]*>[\s\S]*?<\/w:tblPr>/;
console.log('Matches bad tbl:', badTblRegex.test(xml));
const fixedXml = xml.replace(badTblRegex, '');

try {
  const dom = new DOMParser().parseFromString(fixedXml, 'text/xml');
  const tbls = dom.getElementsByTagName('w:tbl');
  console.log('SUCCESS! Tables count after removing orphaned tbl:', tbls.length);
  for (let i = 0; i < tbls.length; i++) {
    const rows = tbls[i].getElementsByTagName('w:tr');
    const text = (tbls[i].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    console.log(`Table ${i} (rows: ${rows.length}): ${text}`);
    for (let r = 0; r < rows.length; r++) {
      const rText = (rows[r].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      console.log(`   r[${r}]: ${rText}`);
    }
  }
} catch (e) {
  console.error('Still error:', e.message);
}
