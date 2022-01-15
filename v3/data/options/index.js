'use strict';

const toast = document.getElementById('toast');

function restore() {
  chrome.storage.local.get({
    blacklist: [],
    whitelist: ['addons.mozilla.org', 'chrome.google.com', 'addons.opera.com', 'add0n.com', 'microsoftedge.microsoft.com']
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
    toast.textContent = chrome.i18n.getMessage('optionsMSG1');
    restore();
    setTimeout(() => toast.textContent = '', 750);
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  e.textContent = chrome.i18n.getMessage(e.dataset.i18n);
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
