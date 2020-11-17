import { _ } from 'core-js';
import appModule from '../module.js';

function hasLocalStorage() {
    return 'localStorage' in window && localStorage;
}

const url_get = '/get_userconfig';
const url_save = '/save_userconfig';
const url_delete = '/delete_userconfig';
const url_config_mvt = '/apply_mvt_config'
const DEFAULT_KEY = 'basemap_2015_global';

function getDefaultMapBoxStyleUrl(label) {
    const searchParams = new URLSearchParams(document.location.search);
    const server = searchParams.get('embeddedserver');
    const proto = searchParams.get('embeddedserverprotocol') || 'http';
    const url = (server ? `${proto}://${server}` : 'https://vectortiles.geoportail.lu') + `/styles/${label}/style.json`;
    return url;
}

function getDefaultMapBoxStyleXYZ(label) {
    return `https://vectortiles.geoportail.lu/styles/${label}/{z}/{x}/{y}.png`;
}

function getKeywordForLayer(label) {
    let keyword = undefined;
    switch (label) {
        case 'basemap_2015_global':
            keyword = 'roadmap';
            break;
        case 'topogr_global':
            keyword = 'topomap';
            break;
        case 'topo_bw_jpeg':
            keyword = 'topomap_gray';
            break;
    }
    return keyword;
}

class MvtStylingService {
    /**
     * @param {angular.$http} $http Angular http service.
     * @param {app.UserManager} appUserManager User manager service.
     * @param {String} uploadvtstyleUrl URL to provision a style
     * @param {String} deletevtstyleUrl URL to delete a provisionned style
     * @param {String} getvtstyleUrl URL to get a provisionned style
     * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
     * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
     * @ngInject
     */
    constructor($http, appUserManager, uploadvtstyleUrl, deletevtstyleUrl, getvtstyleUrl, ngeoBackgroundLayerMgr, ngeoLocation) {
        this.http_ = $http;
        this.appUserManager_ = appUserManager;
        this.isCustomStyle = false;
        this.uploadvtstyleUrl_ = uploadvtstyleUrl;
        this.deletevtstyleUrl_ = deletevtstyleUrl;
        this.getvtstyleUrl_ = getvtstyleUrl;
        this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;
        this.ngeoLocation_ = ngeoLocation;
    }

    getBgStyle() {
        const layerLabelList = ['basemap_2015_global', 'topogr_global', 'topo_bw_jpeg'];
        const configs = [];
        layerLabelList.forEach(label => {
            let lsData = JSON.parse(window.localStorage.getItem(label));
            let xyz_custom = undefined;
            if (!!lsData) {
                if (lsData.serial) {
                    xyz_custom = this.createXYZCustom_(lsData.serial);
                }
            }

            const keyword = getKeywordForLayer(label);
            const defaultMapBoxStyle = getDefaultMapBoxStyleUrl(keyword);
            const defaultMapBoxStyleXYZ = getDefaultMapBoxStyleXYZ(keyword);

            const config = {
                label,
                defaultMapBoxStyle,
                defaultMapBoxStyleXYZ,
                xyz: xyz_custom || defaultMapBoxStyleXYZ,
                xyz_custom,
                style: defaultMapBoxStyle
            };

            const serial = new URLSearchParams(window.location.search).get('serial');
            if (serial) {
                // if serial is number id, retrieve style form it
                const isValidUUIDv4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi;
                if (serial.match(isValidUUIDv4Regex) !== null) {
                    console.log('Load mvt style from serial uuid');
                    this.isCustomStyle = true;
                    const style_url = `${this.getvtstyleUrl_}?id=${serial}`
                    config.style = style_url;
                    return configs.push(config);
                } else {
                    console.log('Load mvt style from serialized config');
                    this.isCustomStyle = true;
                    config.style = this.apply_mvt_config(serial, label);
                    return configs.push(config);
                }
            } else if (this.appUserManager_.isAuthenticated()) {
                const options = {
                    method: 'get',
                    headers: { 'Content-Type': 'application/json' }
                }
                return configs.push(fetch(url_get + "?key=" + label, options).then(resultFromDB => {
                    if (resultFromDB.data.length > 0) {
                        console.log('Load mvt expert style from database and save it to local storage');
                        this.isCustomStyle = true;
                        window.localStorage.setItem(label, resultFromDB.data[0].value);
                        config.style = JSON.parse(resultFromDB.data[0].value)
                        return config;
                    } else {
                        // Default style if no existing in LS or DB
                        console.log('Default mvt style loaded');
                        this.isCustomStyle = false;
                        return config;
                    }
                }));
            } else if (hasLocalStorage() && !!window.localStorage.getItem(label)) {
                if (lsData.serial) {
                    // If there is a mvt expert style in the local storage, force parameter in the url
                    this.ngeoLocation_.updateParams({
                        'serial': JSON.stringify(lsData.serial)
                    });
                    console.log('Load mvt expert style from local storage');
                    this.isCustomStyle = true;
                    config.customStyle = this.isCustomStyle;

                    // Should work offline as well
                    config.style = lsData.background;
                    return configs.push(config);
                }

                if (lsData.medium) {
                    // If there is a mvt medium config in the local storage, force parameter in the url
                    this.ngeoLocation_.updateParams({
                        'serial': JSON.stringify(lsData.medium)
                    });
                    console.log('Load mvt medium style from local storage');
                    this.isCustomStyle = true;
                    config.customStyle = this.isCustomStyle;

                    // Should work offline as well
                    config.style = lsData.background;
                    return configs.push(config);
                }
            } else {
                // Default style if no existing in LS or DB
                console.log('Default mvt style loaded');
                this.isCustomStyle = false;
                return configs.push(config);
            }

        });
        return Promise.resolve(configs);
    }

    createXYZCustom_(id) {
        return `https://vectortiles.geoportail.lu/styles/${id}/{z}/{x}/{y}.png`;
    }

    createRemoteItemKey_(label) {
        return 'remoteIdForStyle_' + label;
    }

    publishIfSerial(map) {
        const serial = new URLSearchParams(window.location.search).get('serial');
        const isValidUUIDv4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi;
        if (serial) {
            // check if simple/medium styling
            if (serial.match(isValidUUIDv4Regex) === null) {
                const bgLayer = this.backgroundLayerMgr_.get(map);
                //const mbMap =  bgLayer.getMapBoxMap();
                const interval = setInterval(() => {
                    try {
                        //const data = JSON.stringify(mbMap.getStyle());
                        clearInterval(interval);
                        this.publishStyle(bgLayer).then(() => {
                            // for OL-Cesium to refresh the background layer counterpart
                            // and thus request tiles with custom style
                            this.backgroundLayerMgr_.set(map, bgLayer);
                        });
                    } catch (error) {
                        console.log(error);
                        return;
                    }
                }, 50);
            }
        }
    }

    unpublishIfSerial(map) {
        const serial = new URLSearchParams(window.location.search).get('serial');
        const isValidUUIDv4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi;
        if (serial) {
            // check if simple/medium styling
            if (serial.match(isValidUUIDv4Regex) === null) {
                const bgLayer = this.backgroundLayerMgr_.get(map);
                if (!bgLayer) { // 3D enable watch is run before bgLayer is initialized...
                    return;
                }
                return this.unpublishStyle(bgLayer);
            }
        }
    }

    publishStyle(layer) {
        const label = layer.get('label');
        const data = JSON.stringify(layer.getMapBoxMap().getStyle());

        return this.unpublishStyle(layer).then(() => {
            const formData = new FormData();
            const blob = new Blob([data], { type: "application/json" });
            formData.append('style', blob, 'style.json');
            const options = {
                method: 'POST',
                body: formData,
            };
            return fetch(this.uploadvtstyleUrl_, options)
                .then(response => response.json())
                .then(result => {
                    // modify existing key item
                    let lsData = JSON.parse(window.localStorage.getItem(label));
                    lsData.serial = result.id;
                    window.localStorage.setItem(label, JSON.stringify(lsData));
                    layer.set('xyz_custom', this.createXYZCustom_(result.id));
                    return result.id;
                });
        });
    }

    unpublishStyle(layer) {
        const label = layer.get('label');
        let lsData = JSON.parse(window.localStorage.getItem(label));

        if (lsData.serial) {
            let id = lsData.serial;
            // modify existing key item
            lsData.serial = undefined;
            window.localStorage.setItem(label, JSON.stringify(lsData));
            const url = `${this.deletevtstyleUrl_}?id=${id}`;
            layer.unset('xyz_custom');
            return fetch(url).catch(() => '');
        }
        return Promise.resolve();
    }

    saveStyle(configObject, isPublished) {
        const mbMap = configObject.background.getMapBoxMap();
        const key = configObject.background.get('label');
        const value = JSON.stringify({
            medium: configObject.medium,
            background: mbMap.getStyle(),
            serial: configObject.serial
        });
        const promises = [];
        if (this.appUserManager_.isAuthenticated()) {
            const body = {
                key,
                value
            }
            const options = {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
            promises.push(fetch(url_save, options));
            console.log('Data saved in database');
        }

        this.isCustomStyle = true;
        window.localStorage.setItem(key, value);
        console.log('Data saved in local storage');

        if (isPublished) {
            promises.push(this.publishStyle(configObject.background));
        } else {
            // Remove unused serial in ls
            promises.push(this.unpublishStyle(configObject.background));
        }

        return Promise.all(promises);
    }

    getStyle(key = undefined) {
        if (key === undefined) {
            key = DEFAULT_KEY;
        }
        if (this.appUserManager_.isAuthenticated()) {
            const options = {
                method: 'get',
                headers: { 'Content-Type': 'application/json' }
            }
            return fetch(url_get + "?key=" + key, options).then(resultFromDB => {
                const styleFromDB = resultFromDB.data;
                if (styleFromDB.length > 0) {
                    console.log('Load data from database and save it to local storage');
                    this.isCustomStyle = true;
                    window.localStorage.setItem(key, styleFromDB[0].value);
                    return styleFromDB[0].value;
                }
            });
        } else if (hasLocalStorage() && !!window.localStorage.getItem(key)) {
            console.log('Load data from local storage');
            return Promise.resolve(window.localStorage.getItem(key));
        }
    }

    getUrlVtStyle(layer) {
        const label = layer.get('label');
        const keyword = getKeywordForLayer(label);
        let id = window.localStorage.getItem(label);

        if (id == null) return getDefaultMapBoxStyleUrl(keyword);
        return this.getvtstyleUrl_ + '?id=' + id;
    }

    removeStyles(bgLayer) {
        const promises = [];
        promises.push(this.unpublishStyle(bgLayer));
        promises.push(window.localStorage.removeItem(bgLayer.get('label')));
        console.log('Removed mvt styles from local storage');
        if (this.appUserManager_.isAuthenticated()) {
            const options = {
                method: 'delete',
                headers: { 'Content-Type': 'application/json' }
            }
            promises.push(fetch(url_delete + "?key=" + bgLayer.get('label'), options));
            console.log('Removed mvt styles from database');
        }
        this.isCustomStyle = false;
        return Promise.all(promises);
    }

    apply_mvt_config(mvt_config, label) {
        const keyword = getKeywordForLayer(label);
        const url = new URL(window.location);
        let params = new URLSearchParams();
        params.set('config', JSON.stringify(mvt_config));
        params.set('style_url', getDefaultMapBoxStyleUrl(keyword));
        return `${url.origin}${url_config_mvt}?${params.toString()}`;
    }
}

appModule.service('appMvtStylingService', MvtStylingService);

export default MvtStylingService;
