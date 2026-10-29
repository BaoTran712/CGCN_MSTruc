const fs = require('fs');
const PizZip = require('pizzip');
const { DOMParser } = require('@xmldom/xmldom');

const content = fs.readFileSync('docs/templates/mau_2a_chuan.docx');
const zip = new PizZip(content);
let xml = zip.file('word/document.xml').asText();

const badSnippet = '<w:tbl><w:tblPr><w:tblStyle w:val="a4"/><w:tblW w:w="9064" w:type="dxa"/><w:tblInd w:w="-108" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr>';

console.log('Contains badSnippet:', xml.includes(badSnippet));
const cleanXml = xml.replace(badSnippet, '');

const dom = new DOMParser().parseFromString(cleanXml, 'text/xml');
console.log('SUCCESS! Parsed XML without any error!');
console.log('Tables count:', dom.getElementsByTagName('w:tbl').length);
