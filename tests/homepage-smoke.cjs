const fs=require('node:fs');const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('styles.css','utf8'),js=fs.readFileSync('app.js','utf8');
const checks=[
 ['homepage gateway',html.includes('class="mm-home-gateway"')],
 ['verified local artwork',html.includes('assets/matcha-manita-monogram.svg')&&fs.existsSync('assets/matcha-manita-monogram.svg')],
 ['homepage navigation',html.includes('class="mm-gateway-next"')],
 ['age gate',html.includes('id="ageGate"')],
 ['catalog preserved',html.includes('id="productGrid"')],
 ['research directory mounted',html.includes('id="technology-directory"')&&html.includes('src="research-directory.js"')],
 ['research directory script exists',fs.existsSync('research-directory.js')],
 ['checkout disabled',html.includes('id="checkoutBtn" type="button" disabled')],
 ['mobile responsive styles',css.includes('@media')],
 ['catalog JavaScript preserved',js.includes('loadCatalog()')]
];
for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);assert.ok(ok,name)}
console.log('All '+checks.length+' homepage checks passed.');
