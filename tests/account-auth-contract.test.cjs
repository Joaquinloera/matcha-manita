const assert = require('node:assert/strict');
const fs = require('node:fs');
const page = fs.readFileSync('account.html','utf8');
const script = fs.readFileSync('app.js','utf8');
const home = fs.readFileSync('index.html','utf8');
for (const id of ['signupForm','signupEmail','signupPassword','signupConfirm','loginForm','loginEmail','loginPassword','recoveryForm','recoveryEmail','recoveryStatus']) {
  assert.ok(page.includes('id="'+id+'"'), 'Missing account control: '+id);
}
assert.ok(script.includes('/auth/v1/signup'), 'Supabase signup missing');
assert.ok(script.includes('/auth/v1/recover'), 'Supabase recovery missing');
assert.ok(script.includes('grant_type=password'), 'Supabase password login missing');
assert.ok(page.includes('href="#createAccountTitle"'), 'Login must link to account creation');
assert.ok(home.includes('href="account.html"'), 'Homepage account navigation missing');
assert.ok(!home.includes('id="technology-directory"'), 'Internal research must not be displayed');
assert.ok(script.includes('checkoutButton.disabled = true'), 'Preview checkout must remain disabled');
console.log('Account and storefront source contracts: PASS');
