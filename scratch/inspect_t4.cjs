const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const content = fs.readFileSync('CGCN_MSTruc/docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();
const dom = new DOMParser().parseFromString(xml, 'text/xml');
const tbls = dom.getElementsByTagName('w:tbl');

console.log('Table 4:');
console.log(new XMLSerializer().serializeToString(tbls[4]));
