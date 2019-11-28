let offlineEnabled = false;

/**
 * Normalise URL so that it can be used as key in the cache.
 * Remove:
 * - the domain name
 * - port;
 * - search and hash;
 * - "/theme/main"
 * @param {string} url
 */
function normalizeUrl(url) {
  if (url.startsWith('http')) {
    const idx = url.substr(9).indexOf('/');
    url = url.substr(9 + idx);
  }
  let i = url.indexOf('?');
  if (i !== -1) {
    url = url.substr(0, i);
  }
  j = url.indexOf('#');
  if (i !== -1) {
    url = url.substr(0, i);
  }
  const horrorSuffix = '/theme/main';
  if (url.endsWith(horrorSuffix)) {
    url = url.substr(0, url.length - horrorSuffix.length);
  }

  if (!url) {
    url = '/';
  }
  return url;
}


/**
 * Fetch the resource and store it in the cache using a normalized key.
 * @param {Cache} cache The cache object to use.
 * @param {string} url A plain string URL
 */
async function getAndCacheUrl(cache, url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new TypeError('Bad response status ' + url + ' ' + response.status);
  }

  url = normalizeUrl(url);
  return cache.put(url, response);
}

/**
 * Download website file for offline usage.
 * The files are stored in a cache and will be served from there.
 */
async function downloadAndCacheWebsiteFiles() {
  console.log("Start downloading website files for offline");
  const cache = await caches.open('offlinewebsite');
  const promise = Promise.all(
    urls.map(url => getAndCacheUrl(cache, url))
  )
  promise.then(
    () => console.log('all files fetched and cached successfuly'),
    () => console.error('some file could not be fetched or cached')
  );
  return promise;
}


/**
 * Normalize the passed URL and look for a response inside the cache
 * Return `undefined` if no response was found.
 * @param {string} url
 * @return {Promise<Response|undefined>}
 */
function getCachedFile(url) {
  url = normalizeUrl(url);
  return caches.open('offlinewebsite').then(
    cache => cache.match(url, {
      ignoreSearch: true,
  }));
}


if (typeof self === 'object') {
  console.log('In the sw');
  self.addEventListener('install', e => {
    console.log('SW installation');
    e.waitUntil(downloadAndCacheWebsiteFiles());
  });

  // Intercept the network queries from the main thread and the workers
  // This is necessary:
  // - to serve the website without network connectivity;
  // - to inject offline MVT data into MapBox without modifying MapBox.
  self.addEventListener('fetch', function(event) {
    // console.log('sw intercept fetch', event.request.url)
    // TODO:
    // should normalize the url
    // if in the website files => fetch in the cache (and forward fetch if not found?)
    // if offline enabled
    // -> get from the indexedDb (no fallback)
    event.respondWith(
        getCachedFile(event.request.url).then(response => response || fetch(event.request))
    );
  });

  // Listen for messages from the applications
  // This is used to toggle the "offline mode".
  self.addEventListener('message', function(event) {
    if ('offline' in event.data) {
      offlineEnabled = !!event.data.offline;
      console.log('Offline is now', offlineEnabled);
    }
  });
}
