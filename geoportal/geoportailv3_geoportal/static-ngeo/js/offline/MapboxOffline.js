import {XYZ} from 'ol/source';
import {fromLonLat, transformExtent} from 'ol/proj';


// Copied from worker!
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open("swdb", 1);
  request.onsuccess = evt => resolve(evt.target.result);
  request.onerror = reject;
  request.onupgradeneeded = function(event) {
    const db = event.target.result;
    db.createObjectStore("responses", { keyPath: "url" });
  };
});


/**
 * @param {!Blob} blob A blob
 * @return {Promise<string>} data URL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function() {
      resolve(/** @type {String} */(reader.result));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


function storeData(dbPromise, url, dataUrl) {
  return dbPromise.then(db => new Promise((resolve, reject) => {
    const objectStore = db.transaction(["responses"], "readwrite").objectStore("responses");
    const request = objectStore.get(url);
    request.onerror = reject;
    request.onsuccess = function(event) {
      let data = event.target.result;
      if (data) {
        data.content = dataUrl;
        const requestUpdate = objectStore.put(data);
        requestUpdate.onsuccess = resolve;
        requestUpdate.onerror = reject;
      } else {
        data = {
          content: dataUrl,
          url
        };
        const requestInsert = objectStore.add(data);
        requestInsert.onsuccess = resolve;
        requestInsert.onerror = reject;
      }
    };
  }));
}

function fetchAndStoreResponseHelper(url, clone) {
  let response;
  return fetch(url)
    .then(r => (response = (clone ? r.clone() : null), r.blob()))
    .then(blob => blobToDataUrl(blob))
    .then(dataUrl => storeData(dbPromise, url, dataUrl))
    .then(() => response);
}

function fetchBlobsAndStore(urls, progressCallback) {
  let count = 0;
  return Promise.all(urls.map(url => {
    return fetchAndStoreResponseHelper(url)
    .finally(() => {
        ++count;
        progressCallback(count / urls.length);
    })
  }));
}


export default class MapBoxOffline {
  getGlyphUrls(style) {
    const glyphs = style.glyphs;

    // Get glyphs config
    const fontstacks = new Set();
    for (const layer of style.layers) {
      const layout = layer.layout;
      if (layout && layout['text-font']) {
        fontstacks.add(...layout['text-font']);
      }
    }
    const ranges = ['0-255', '256-511'];
    const fontUrls = [];
    for (const fontstack of fontstacks) {
      for (const range of ranges) {
        fontUrls.push(glyphs.replace('{fontstack}', fontstack).replace('{range}', range));
      }
    }

    return fontUrls;
  }

  getTileUrls(sources, extentByZoom) {
    const projection = 'EPSG:3857';
    const devicePixelRatio = navigator.devicePixelRatio;
    const urls = [];
    for (const name in sources) {
      const source = sources[name];
      const {type, tileSize, url} = source;
      const xyz = new XYZ({
        url,
        tileSize
      });
      const tileGrid = xyz.getTileGrid();
      const tileUrlFunction = xyz.getTileUrlFunction();
      const doneZooms = {};
      for (const zoomExtent of extentByZoom) {
        const {zoom, extent} = zoomExtent;
        if (zoom < source.minzoom || zoom > source.maxzoom) {
          continue;
        }
        tileGrid.forEachTileCoord(extent, zoom, coord => {
          const url = tileUrlFunction(coord, devicePixelRatio, projection);
          urls.push(url);
        });
      }
    }
    return urls;
  }


  getSourcesPromise(style) {
    const sourceUrls = [];
    for (const name in style.sources) {
      const url = style.sources[name].url;
      sourceUrls.push(url);
    }

    const promises = sourceUrls.map(url =>
      fetch(url).then(r => r.json())
      .then(source => this.saveJsonContent_(url, source))
      .then(source => {
      const {bounds, format, maxzoom, minzoom, pixel_scale, tiles} = source;
      return {
        extent: transformExtent(bounds, 'EPSG:4326', 'EPSG:3857'),
        format,
        maxzoom,
        minzoom,
        url: tiles[0],
        tileSize: pixel_scale || 256
      }
    }));
    return Promise.all(promises);
  }

  getUrlsPromise(style, extentByZoom) {
    const glyphUrls = this.getGlyphUrls(style);
    
    return this.getSourcesPromise(style).then(sources => this.getTileUrls(sources, extentByZoom)).then(sourceUrls => [
      ...glyphUrls, ...sourceUrls
    ]);
  }

  saveJsonContent_(url, json) {
    return storeData(dbPromise, url, JSON.stringify(json, null, 2)).then(() => json);
  }

  save(styleUrl, style, extentByZoom, progressCallback) {
    console.log('Saving MapBox data');
    return this.saveJsonContent_(styleUrl, style).then(() =>
    this.getUrlsPromise(style, extentByZoom).then(urls => fetchBlobsAndStore(urls, progressCallback)));
  }

  restore(layer) {
    console.log('Activate MapBox offline data');
    const map = layer.getMapBoxMap();
    if (!navigator.serviceWorker.controller) {
      alert('You must reload the page before entering offline mode');
    }
    fetch('/switch-lux-offline').then(() => {
      let style;
      try {
        style = map.getStyle();
      } catch (e) {
        console.log('No defined style, using default one');
        style = layer.get('defaultMapBoxStyle');
      }
      map.setStyle(null);
      map.setStyle(style);
    }, 0);
  }
}
