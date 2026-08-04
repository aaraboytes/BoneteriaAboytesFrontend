const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'ConsentimientoInformado.docx');
const content = fs.readFileSync(filePath, 'binary');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

// Check for placeholders in curly braces
const placeholders = [...xml.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
console.log('PLACEHOLDERS_FOUND: ' + JSON.stringify(placeholderSet = [...new Set(placeholders)]));
