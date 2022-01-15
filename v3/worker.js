chrome.declarativeNetRequest.setExtensionActionOptions({
  displayActionCountAsBadgeText: true
});

chrome.action.onClicked.addListener(async () => {
  const s = await chrome.declarativeNetRequest.getEnabledRulesets();
  if (s.indexOf('default-set') === -1) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['default-set']
    });
  }
  else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['default-set']
    });
  }
  icon();
});

const icon = async () => {
  const s = await chrome.declarativeNetRequest.getEnabledRulesets();
  console.log(s);
  if (s.indexOf('default-set') === -1) {
    chrome.action.setIcon({
      path: {
        '16': 'data/icons/disabled/16.png',
        '32': 'data/icons/disabled/32.png',
        '48': 'data/icons/disabled/48.png'
      }
    });
  }
  else {
    chrome.action.setIcon({
      path: {
        '16': 'data/icons/16.png',
        '32': 'data/icons/32.png',
        '48': 'data/icons/48.png'
      }
    });
  }
};

const user = () => chrome.storage.local.get({
  whitelist: ['addons.mozilla.org', 'chrome.google.com', 'addons.opera.com', 'add0n.com', 'microsoftedge.microsoft.com'],
  blacklist: []
}, async prefs => {
  const rules = prefs.whitelist.map((d, n) => ({
    'id': n + 1,
    'action': {
      'type': 'allowAllRequests'
    },
    'condition': {
      'urlFilter': '||' + d,
      'resourceTypes': ['main_frame']
    }
  }));
  prefs.blacklist.forEach((d, n) => {
    rules.push({
      'id': prefs.whitelist.length + n + 1,
      'action': {'type': 'block'},
      'condition': {
        'urlFilter': '||' + d
      }
    });
  });

  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: (await chrome.declarativeNetRequest.getSessionRules()).map(o => o.id),
    addRules: rules
  });
});

chrome.runtime.onStartup.addListener(() => {
  icon();
  user();
});
chrome.runtime.onInstalled.addListener(() => {
  icon();
  user();
});

chrome.storage.onChanged.addListener(ps => {
  if (ps.whitelist || ps.blacklist) {
    user();
  }
});

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
