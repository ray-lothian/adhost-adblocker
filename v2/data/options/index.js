'use strict';

function restore() {
  chrome.storage.local.get({
    blacklist: [],
    whitelist: ['addons.mozilla.org', 'chrome.google.com', 'addons.opera.com', 'add0n.com']
  }, prefs => {
    document.getElementById('blacklist').value = prefs.blacklist.join(', ');
    document.getElementById('whitelist').value = prefs.whitelist.join(', ');
  });
}

function toArray(value) {
  return value.split(/\s*,\s*/)
    .map(s => s.trim().toLowerCase())
    .filter((s, i, l) => s && l.indexOf(s) === i)
    .filter(s => s.indexOf('.') !== -1)
    .filter(s => s.length > 3);
}

function save() {
  const blacklist = toArray(document.getElementById('blacklist').value);
  const whitelist = toArray(document.getElementById('whitelist').value);
  console.log(blacklist, whitelist);
  chrome.storage.local.set({blacklist, whitelist}, () => {
    const status = document.getElementById('status');
    status.textContent = chrome.i18n.getMessage('optionsMSG1');
    restore();
    setTimeout(() => status.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

document.getElementById('check').addEventListener('click', e => {
  chrome.runtime.sendMessage({
    method: 'domain-check',
    hostname: e.target.parentNode.querySelector('[type=text]').value
  }, res => {
    const status = document.getElementById('status');
    status.textContent = chrome.i18n.getMessage(res ? 'optionsMSG2' : 'optionsMSG3');
    restore();
    setTimeout(() => status.textContent = '', 1500);
  });
});

[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e.textContent = chrome.i18n.getMessage(e.dataset.i18n);
});
