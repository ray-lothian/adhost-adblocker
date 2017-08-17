/* globals hosts */
'use strict';

var _ = chrome.i18n.getMessage;

// icon
var button = {
  icon: enable => chrome.browserAction.setIcon({
    path: {
      '16': '/data/icons' + (enable ? '' : '/disabled') + '/16.png',
      '32': '/data/icons' + (enable ? '' : '/disabled') + '/32.png',
      '48': '/data/icons' + (enable ? '' : '/disabled') + '/48.png',
      '64': '/data/icons' + (enable ? '' : '/disabled') + '/64.png'
    }
  }),
  mode: ({id, url}) => {
    const enabled = url.startsWith('http');
    chrome.browserAction[enabled ? 'enable' : 'disable'](id);
    return enabled;
  }
};
chrome.tabs.query({}, tabs => {
  tabs.forEach(tab => button.mode(tab) && hosts.update.tab(tab));
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => changeInfo.url && button.mode(tab));

// Badge
var badge = {
  cache: {},
  add: (id, hostname) => {
    badge.cache[id] = badge.cache[id] || {};
    badge.cache[id][hostname] = badge.cache[id][hostname] || 0;
    badge.cache[id][hostname] += 1;
    chrome.browserAction.setBadgeText({
      tabId: id,
      text: String(Object.values(badge.cache[id]).reduce((p, c) => p + c, 0))
    });
    chrome.browserAction.setTitle({
      tabId: id,
      title: _('appTitle') + '\n\n' +
        Object.entries(badge.cache[id]).map(([key, value]) => `${key}: ${value}`).join('\n')
    });
  },
  remove: id => delete badge.cache[id],
  clear: id => {
    badge.cache[id] = {};
    chrome.browserAction.setBadgeText({
      tabId: id,
      text: ''
    });
    chrome.browserAction.setTitle({
      tabId: id,
      title: _('appTitle')
    });
  },
  color: color => chrome.browserAction.setBadgeBackgroundColor({color})
};
chrome.tabs.onRemoved.addListener(id => {
  delete badge.cache[id];
  delete hosts.remove.tab(id);
});
badge.color('#1c2b36');

// Observe
var observe = {
  installed: false,
  callback: ({url, tabId}) => {
    const hostname = hosts.hostname(url);

    if (hosts.match(hostname, tabId)) {
      badge.add(tabId, hostname);
      return {cancel: true};
    }
  },
  onCommand: bool => {
    if (bool && observe.installed === false) {
      chrome.webRequest.onBeforeRequest.addListener(observe.callback, {
        urls: ['*://*/*'],
        types: ['sub_frame', 'script', 'xmlhttprequest']
      }, ['blocking']);
      button.icon(bool);
      observe.installed = true;
    }
    if (!bool && observe.installed === true) {
      chrome.webRequest.onBeforeRequest.removeListener(observe.callback);
      button.icon(bool);
      observe.installed = false;
    }
  }
};
chrome.storage.local.get({
  active: true
}, prefs => observe.onCommand(prefs.active));
chrome.storage.onChanged.addListener(prefs => prefs.active && observe.onCommand(prefs.active.newValue));

// user click
chrome.browserAction.onClicked.addListener(() => {
  chrome.storage.local.get({
    active: true
  }, prefs => chrome.storage.local.set({
    active: !prefs.active
  }));
});

// options
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'domain-check') {
    response(hosts.match(request.hostname));
  }
});

// updates
chrome.webRequest.onBeforeRequest.addListener(({tabId, url}) => {
  badge.clear(tabId);
  hosts.update.tab({
    id: tabId,
    url
  });
}, {
  urls: ['*://*/*'],
  types: ['main_frame']
}, []);

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': false
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/adhost.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});
{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
