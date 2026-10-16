const assert = require('node:assert/strict');
const fs = require('node:fs');
const netlify = fs.readFileSync('netlify.toml','utf8');
const home = fs.readFileSync('index.html','utf8');
const account = fs.readFileSync('account.html','utf8');
for (const path of ['/research/*','/tests/*','/.github/*']) {
  assert.ok(netlify.includes('from = "'+path+'"'), 'Missing public route block: '+path);
}
assert.ok(netlify.includes('X-Frame-Options = "DENY"'), 'Frame protection missing');
assert.ok(home.includes('href="account.html"'), 'Homepage must link to member page');
assert.ok(account.includes('href="index.html"'), 'Member page must link home');
assert.ok(account.includes('id="signupForm"'), 'Registration missing');
assert.ok(account.includes('id="loginForm"'), 'Login missing');
assert.ok(account.includes('id="recoveryForm"'), 'Recovery missing');
console.log('Public website route boundary and two-page contracts PASS');
