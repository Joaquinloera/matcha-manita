const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('styles.css','utf8');
const js = fs.readFileSync('app.js','utf8');
const cases = [
 ['royal homepage',html.includes('class="mm-royal-entry"')],
 ['official local logo reference',html.includes('assets/matcha-manita-logo.png')],
 ['login email input',html.includes('id="royalEmail"') && html.includes('autocomplete="username"')],
 ['password input',html.includes('id="royalPassword"') && html.includes('autocomplete="current-password"')],
 ['no simulated login success',html.includes('No password was sent or stored.')],
 ['passkey not falsely enabled',html.includes('not activated yet')],
 ['age acknowledgement preserved',html.includes('id="ageGate"')],
 ['existing catalog preserved',html.includes('id="productGrid"')],
 ['royal mobile styles',css.includes('@media(max-width:600px)') && css.includes('.mm-royal-entry')],
 ['catalog script preserved',js.includes('loadCatalog()')]
];
for(const [name,passed] of cases){console.log((passed?'PASS':'FAIL')+' '+name);assert.ok(passed,name);}
console.log('All '+cases.length+' source smoke tests passed.');
