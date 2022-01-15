/* global tldjs */

const domains = {};

const blocked = {
  keywords: {
    list: [
      /ads(\d+)?[.-]/,
      /adv(\d+)?[.-]/,
      /ad(\d+)?[.-]/,
      /survey(\d+)?[.-]/,
      /track[.-]/,
      /analytics\./,
      /banner/,
      /adserve/,
      /advert/,
      /tracker/,
      /tracking/,
      /affiliate/
    ],
    count: 0
  },
  // domains that use many hostnames for advertising
  domains: {
    list: [
      'reporo.net', 'voluumtrk.com', 'dol.ru', '2cnt.net', 'ivwbox.de', 'adtech.fr', 'justclick.ru', 'appier.net',
      'vmsn.de', 'adk2.co', 'surf-town.net'
    ],
    count: 0
  },
  // domain is in the list of hostnames
  duplicates: 0,
  sdups: 0
};

fetch('hosts.json').then(r => r.json()).then(a => {
  // reduce by blocked words
  a = a.filter(host => {
    if (blocked.keywords.list.some(w => w.test(host))) {
      blocked.keywords.count += 1;
      return false;
    }
    return true;
  });
  console.log('"blocked keywords" -> reduced by', blocked.keywords.count);

  a.forEach(hostname => {
    const d = tldjs.getDomain(hostname);
    domains[d] = domains[d] || [];
    if (d) {
      domains[d].push(hostname);
    }
  });

  // reduce if domain is in the hostname list
  for (const [key, value] of Object.entries(domains)) {
    if (value.length > 1 && value.indexOf(key) !== -1) {
      blocked.duplicates += value.length - 1;
      domains[key] = [key];
    }
  }
  console.log('"blocked domains" -> reduced by', blocked.duplicates);

  // reduce by bad reputation domains
  for (const d of blocked.domains.list) {
    blocked.domains.count += domains[d].length - 1;
    domains[d] = [d];
  }
  console.log('"blocked bad reputation" -> reduced by', blocked.domains.count);

  for (const [key, value] of Object.entries(domains)) {
    if (value.length > 50) {
      console.log('do we need to block', key, value);
    }
  }

  // remove by duplicated hostnames
  for (const [key, value] of Object.entries(domains)) {
    const rm = [];

    for (const h of value) {
      value.forEach(hh => {
        if (hh.endsWith('.' + h)) {
          blocked.sdups += 1;
          rm.push(hh);
        }
      });
    }

    if (rm.length) {
      domains[key] = value.filter(v => rm.indexOf(v) === -1);
    }
  }
  console.log('"blocked duplicated sub-domains" -> reduced by', blocked.sdups);

  const rules = [];
  let id = 1;
  for (const value of Object.values(domains)) {
    for (const hostname of value) {
      rules.push({
        id,
        'action': {'type': 'block'},
        'condition': {
          'urlFilter': '||' + hostname
        }
      });
      id += 1;
    }
  }
  for (const d of blocked.domains.list) {
    rules.push({
      id,
      'action': {'type': 'block'},
      'condition': {
        'urlFilter': '||' + d
      }
    });
    id += 1;
  }
  for (const r of blocked.keywords.list) {
    rules.push({
      id,
      'action': {'type': 'block'},
      'condition': {
        'regexFilter': r.source
      }
    });
    id += 1;
  }

  // download
  const link = document.createElement('a');
  link.download = 'rules.json';
  link.href = 'data:application/json;base64,' + btoa(JSON.stringify(rules));
  link.click();
});
