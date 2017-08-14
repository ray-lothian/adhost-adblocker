/* globals hosts */
'use strict';

var _ = chrome.i18n.getMessage;

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

chrome.webRequest.onBeforeRequest.addListener(({url, tabId}) => {
  const hostname = hosts.hostname(url);

  if (hosts.match(hostname, tabId)) {
    badge.add(tabId, hostname);
    return {cancel: true};
  }
}, {
  urls: ['*://*/*'],
  types: ['sub_frame', 'script', 'xmlhttprequest']
}, ['blocking']);

function icon({id, url}) {
  const enabled = url.startsWith('http');
  chrome.browserAction[enabled ? 'enable' : 'disable'](id);
  return enabled;
}
chrome.tabs.query({}, tabs => {
  tabs.forEach(tab => icon(tab) && hosts.update.tab(tab));
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => changeInfo.url && icon(tab));

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'domain-check') {
    response(hosts.match(request.hostname));
  }
});
