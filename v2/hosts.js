'use strict';

const hosts = (() => {
  let blacklist = new Set([]);
  let whitelist = new Set();
  function update() {
    fetch('/data/assets/hosts.json').then(r => r.json()).then(r => {
      blacklist = new Set(r);
      whitelist = new Set();
    }).then(() => {
      chrome.storage.local.get({
        whitelist: ['addons.mozilla.org', 'chrome.google.com', 'addons.opera.com', 'add0n.com'],
        blacklist: []
      }, prefs => {
        prefs.whitelist.forEach(s => whitelist.add(s));
        prefs.blacklist.forEach(s => blacklist.add(s));
      });
    });
  }
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs.whitelist || prefs.blacklist) {
      update();
    }
  });
  update();

  function hostname(url) {
    const s = url.indexOf('//') + 2;
    if (s > 1) {
      let o = url.indexOf('/', s);
      if (o > 0) {
        return url.substring(s, o);
      }
      else {
        o = url.indexOf('?', s);
        if (o > 0) {
          return url.substring(s, o);
        }
        else {
          return url.substring(s);
        }
      }
    }
    else {
      return url;
    }
  }

  const tabs = {
    cache: {},
    add: tab => tabs.cache[tab.id] = hostname(tab.url)
  };

  return {
    hostname,
    match: (hostname, id) => blacklist.has(hostname) && !whitelist.has(tabs.cache[id]),
    update: {
      tab: tabs.add
    },
    remove: {
      tab: id => delete tabs.cache[id]
    }
  };
})();

// https://adaway.org/hosts.txt
// https://hosts-file.net/ad_servers.txt
// https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext
/*
var url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.body.textContent.split('\n')
  .map(s => s.trim())
  .filter(s => s && s[0] !== '#')
  .filter((s, i, l) => l.indexOf(s) === i)
  .map(s => s.split(/\s+/).pop())
  .filter(s => s !== 'localhost')
  .map(s => `'${s}'`).join(','));
fetch(url).then(res => res.blob())
  .then(blob => {
    const objectURL = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), {
      href: objectURL,
      type: 'application/json',
      download: 'a.txt',
    }).click();
});

---
JSON.stringify(a.filter((s, i, l) => l.indexOf(s) === i).sort())
 */
