// Dependency-free behavior test for the public research directory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element(tag = 'div') {
  return {
    tag, value: '', textContent: '', className: '', href: '', children: [],
    handlers: {}, focused: false,
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; },
    addEventListener(type, fn) { this.handlers[type] = fn; },
    focus() { this.focused = true; },
    fire(type) { assert.ok(this.handlers[type], 'Missing handler: ' + type); this.handlers[type](); }
  };
}
async function run() {
  const ids = ['directorySearch', 'directoryCategory', 'directoryGrid',
    'directoryStatus', 'directoryRegion', 'directorySort', 'directoryReset'];
  const controls = Object.fromEntries(ids.map(id => [id, element()]));
  const sources = [
    {name:'Zulu',category:'Cannabis POS',country:'Canada',url:'https://example.org/z',auth:'Bearer',software:'Inventory',blockchain:'None',status:'Research'},
    {name:'Alpha',category:'AI software',country:'United States',url:'https://example.org/a',auth:'IAM',software:'Models',blockchain:'None',status:'Research'},
    {name:'Bravo',category:'Cannabis POS',country:'United States',url:'https://example.org/b',auth:'OAuth',software:'Inventory',blockchain:'None',status:'Research'},
    {name:'Unsafe',category:'AI software',country:'Canada',url:'http://example.org/u',auth:'None',software:'Test',blockchain:'None',status:'Invalid'}
  ];
  const context = {
    document: {getElementById: id => controls[id], createElement: element},
    fetch: async () => ({ok: true, json: async () => ({sources})})
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../research-directory.js'), 'utf8'), context);
  await new Promise(resolve => setTimeout(resolve, 0));
  const grid = controls.directoryGrid;
  const names = () => grid.children.map(card => card.children[1].textContent);
  assert.deepEqual(names(), ['Alpha', 'Bravo', 'Zulu'], 'Default alphabetical order and HTTPS validation');
  assert.equal(controls.directoryCategory.children.length, 2, 'Categories populated');
  assert.equal(controls.directoryRegion.children.length, 2, 'Regions populated');
  controls.directoryRegion.value = 'Canada';
  controls.directoryRegion.fire('change');
  assert.deepEqual(names(), ['Zulu'], 'Region filtering');
  controls.directoryRegion.value = '';
  controls.directoryCategory.value = 'Cannabis POS';
  controls.directoryCategory.fire('change');
  assert.deepEqual(names(), ['Bravo', 'Zulu'], 'Category filtering');
  controls.directoryCategory.value = '';
  controls.directorySearch.value = 'oauth';
  controls.directorySearch.fire('input');
  assert.deepEqual(names(), ['Bravo'], 'Authentication search');
  controls.directorySearch.value = '';
  controls.directorySort.value = 'category';
  controls.directorySort.fire('change');
  assert.deepEqual(names(), ['Alpha', 'Bravo', 'Zulu'], 'Category sorting');
  controls.directoryReset.fire('click');
  assert.deepEqual(names(), ['Alpha', 'Bravo', 'Zulu'], 'Reset results');
  assert.equal(controls.directorySort.value, 'name', 'Reset sorting');
  assert.equal(controls.directorySearch.focused, true, 'Reset returns focus');
  assert.match(controls.directoryStatus.textContent, /3 of 3/, 'Accurate count');
  console.log('PASS: Directory behavior (load, safe sources, filters, search, sort, reset)');
}
run().catch(err => { console.error(err); process.exitCode = 1; });
