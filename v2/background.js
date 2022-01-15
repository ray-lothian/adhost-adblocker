/* globals hosts */
'use strict';

const _ = chrome.i18n.getMessage;

// icon
const button = {
  icon: enable => chrome.browserAction.setIcon({
    path: {
      '16': '/data/icons' + (enable ? '' : '/disabled') + '/16.png',
      '32': '/data/icons' + (enable ? '' : '/disabled') + '/32.png',
      '48': '/data/icons' + (enable ? '' : '/disabled') + '/48.png',
      '64': '/data/icons' + (enable ? '' : '/disabled') + '/64.png'
    }
  }),
  mode: ({id, url = ''}) => {
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
const badge = {
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

const roots = {};
chrome.tabs.onRemoved.addListener(id => {
  delete badge.cache[id];
  delete hosts.remove.tab(id);
  delete roots[id];
});
badge.color('#1c2b36');

// Observe
const observe = {
  installed: false,
  callback: ({url, tabId}) => {
    if (tabId === -1) {
      return;
    }
    const hostname = hosts.hostname(url);

    // always allow first party requests
    if (roots[tabId] === hostname) {
      return;
    }

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
  roots[tabId] = hosts.hostname(url);

  hosts.update.tab({
    id: tabId,
    url
  });
}, {
  urls: ['*://*/*'],
  types: ['main_frame']
}, []);

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
