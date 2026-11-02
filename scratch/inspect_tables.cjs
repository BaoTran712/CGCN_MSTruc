const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');

const content = fs.readFileSync('docs/templates/mau_2a_chuan.docx');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();
const badSnippet = '<w:tbl><w:tblPr><w:tblStyle w:val="a4"/><w:tblW w:w="9064" w:type="dxa"/><w:tblInd w:w="-108" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr>';
const cleanXml = xml.replace(badSnippet, '');

const dom = new DOMParser().parseFromString(cleanXml, 'text/xml');
const tbls = dom.getElementsByTagName('w:tbl');

for (let i = 0; i < tbls.length; i++) {
  const rows = tbls[i].getElementsByTagName('w:tr');
  const text = (tbls[i].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  console.log(`=== Table ${i} (rows: ${rows.length}) ===`);
  console.log('  Content:', text);
  for (let r = 0; r < rows.length; r++) {
    const rText = (rows[r].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const cells = rows[r].getElementsByTagName('w:tc');
    const spans = [];
    for (let c = 0; c < cells.length; c++) {
      const gs = cells[c].getElementsByTagName('w:gridSpan')[0];
      spans.push(gs ? gs.getAttribute('w:val') : '1');
    }
    console.log(`    r[${r}] cells: ${cells.length} spans: [${spans.join(',')}] -> ${rText}`);
  }
}
