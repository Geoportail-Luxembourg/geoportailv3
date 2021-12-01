const fetch = require('node-fetch-with-proxy');
const jsdom = require('jsdom');
const {JSDOM} = jsdom;

const base = 'http://openlayers.org/en/v3.20.1/apidoc/'

fetch(base + 'index.html').then(res => res.text()).then(page => {
  const dom = new JSDOM(page);
  console.log('exports.registerOpenLayersLink = function(helper) {');
  dom.window.document.querySelectorAll('[data-name]').forEach(element => {
    if (element.querySelector('a')) {
        const name = element.getAttribute('data-name');
        const target = element.querySelector("a").getAttribute("href");
        console.log(`  helper.registerLink('${name}', '${base + target}');`);
    }
  });
  console.log('}');
});
