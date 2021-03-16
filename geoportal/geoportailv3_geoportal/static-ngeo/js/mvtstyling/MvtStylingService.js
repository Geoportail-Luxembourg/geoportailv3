import { _ } from 'core-js';
import appModule from '../module.js';
import {isValidSerial} from '../utils.js';

function hasLocalStorage() {
    return 'localStorage' in window && localStorage;
}

const url_get = '/get_userconfig';
const url_save = '/save_userconfig';
const url_delete = '/delete_userconfig';
const url_config_mvt = '/apply_mvt_config'

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
    return {
    'basemap_2015_global': 'roadmap',
    'topogr_global': 'topomap',
    'topo_bw_jpeg': 'topomap_gray'
    }[label];
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
        this.isCustomStyleObject = {
            basemap_2015_global: false,
            topogr_global: false,
            topo_bw_jpeg: false
        };
        this.uploadvtstyleUrl_ = uploadvtstyleUrl;
        this.deletevtstyleUrl_ = deletevtstyleUrl;
        this.getvtstyleUrl_ = getvtstyleUrl;
        this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;
        this.ngeoLocation_ = ngeoLocation;
    }

    getBgStyle() {
        const layerLabelList = ['basemap_2015_global', 'topogr_global', 'topo_bw_jpeg'];
        const promises = [];
        layerLabelList.forEach(label => promises.push( this.setConfigForLayer_(label)));
        return Promise.all(promises);
    }

    setConfigForLayer_(label) {
        let lsData = JSON.parse(window.localStorage.getItem(label));
        let xyz_custom = undefined;
        if (!!lsData && lsData.serial) {
            xyz_custom = this.createXYZCustom_(lsData.serial);
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
        const serialLayer = new URLSearchParams(window.location.search).get('serialLayer');
        if (serial) {
            // if serial is number id, retrieve style form it
            if (isValidSerial(serial)) {
                // if label and serialLayer are equal, or fallback to roadmap layer if serialLayer is null
                if (label === serialLayer || (label === 'basemap_2015_global' && serialLayer === null)) {
                    console.log(`Load mvt style for ${label} from serial uuid`);
                    this.isCustomStyle = this.isCustomStyleSetter(label, true);
                    const style_url = `${this.getvtstyleUrl_}?id=${serial}`
                    config.style = style_url;
                    return Promise.resolve(config);
                } else {
                    console.log(`Default mvt style for ${label}`);
                    return Promise.resolve(config);
                }
            } else {
                // if label and serialLayer are equal, or fallback to roadmap layer if serialLayer is null
                if (label === serialLayer || (label === 'basemap_2015_global' && serialLayer === null)) {
                    console.log(`Load mvt style for ${label} from serialized config`);
                    this.isCustomStyle = this.isCustomStyleSetter(label, true);
                    config.style = this.apply_mvt_config(serial, label);
                    return Promise.resolve(config);
                } else {
                    console.log(`Default mvt style for ${label}`);
                    return Promise.resolve(config);
                }
            }
        } else if (this.appUserManager_.isAuthenticated()) {
            const options = {
                method: 'get',
                headers: { 'Content-Type': 'application/json' }
            }
            return fetch(url_get + "?key=" + label, options).then(resultsFromDB => {
                return resultsFromDB.json().then(result => {
                    if (result.length > 0) {
                        const data = JSON.parse(result[0]['value']);
                        console.log(`Load mvt style for ${label} from database and save it to local storage`);
                        this.isCustomStyle = this.isCustomStyleSetter(label, true);
                        window.localStorage.setItem(label, JSON.stringify(data));
                        config.style = data['background'];
                        return config;
                    } else {
                        // Default style if no existing in LS or DB
                        console.log(`Default mvt style for ${label}`);
                        this.isCustomStyle = this.isCustomStyleSetter(label, false);
                        return config;
                    }
                });
            });
        } else if (hasLocalStorage() && !!window.localStorage.getItem(label)) {
            if (lsData.serial) {
                // If there is a mvt expert style in the local storage, force parameter in the url
                this.ngeoLocation_.updateParams({
                    'serial': JSON.stringify(lsData.serial),
                    'serialLayer': JSON.stringify(label)
                });
            }
            if (lsData.medium) {
                // If there is a mvt medium config in the local storage, force parameter in the url
                this.ngeoLocation_.updateParams({
                    'serial': JSON.stringify(lsData.medium),
                    'serialLayer': JSON.stringify(label)
                });
            }
            console.log(`Load mvt style for ${label} from local storage`);
            this.isCustomStyle = this.isCustomStyleSetter(label, true);
            config.style = lsData.background; // Should work offline as well
            return Promise.resolve(config);
        } else {
            // Default style if no existing in LS or DB
            console.log(`Default mvt style for ${label}`);
            this.isCustomStyle = this.isCustomStyleSetter(label, false);
            return Promise.resolve(config);
        }
    }

    createXYZCustom_(id) {
        return `https://vectortiles.geoportail.lu/styles/${id}/{z}/{x}/{y}.png`;
    }

    createRemoteItemKey_(label) {
        return 'remoteIdForStyle_' + label;
    }

    publishIfSerial(map) {
        const serial = new URLSearchParams(window.location.search).get('serial');
        // check if simple/medium styling
        if (serial && !isValidSerial(serial)) {
            const bgLayer = this.backgroundLayerMgr_.get(map);
            const interval = setInterval(() => {
                try {
                    clearInterval(interval);
                    this.publishStyle(bgLayer).then((result) => {
                        // for OL-Cesium to refresh the background layer counterpart
                        // and thus request tiles with custom style
                        this.backgroundLayerMgr_.set(map, bgLayer);

                        // For deprovisionning, keep the id stored
                        let lsData = JSON.parse(window.localStorage.getItem(bgLayer.get('label')));
                        lsData.serial = result;
                        window.localStorage.setItem(bgLayer.get('label'), JSON.stringify(lsData));
                    });
                } catch (error) {
                    console.log(error);
                    return;
                }
            }, 50);
        }
    }

    unpublishIfSerial(map) {
        const serial = new URLSearchParams(window.location.search).get('serial');
        // check if simple/medium styling
        if (serial && !isValidSerial(serial)) {
            const bgLayer = this.backgroundLayerMgr_.get(map);
            if (!bgLayer) { // 3D enable watch is run before bgLayer is initialized...
                return;
            }
            return this.unpublishStyle(bgLayer);
        }
    }

    publishStyle(layer) {
        return this.unpublishStyle(layer).then(() => {
            const formData = new FormData();
            const data = JSON.stringify(layer.getMapBoxMap().getStyle());
            const blob = new Blob([data], { type: "application/json" });
            formData.append('style', blob, 'style.json');
            const options = {
                method: 'POST',
                body: formData,
            };
            return fetch(this.uploadvtstyleUrl_, options)
                .then(response => response.json())
                .then(result => {
                    layer.set('xyz_custom', this.createXYZCustom_(result.id));
                    return result.id;
                });
        });
    }

    unpublishStyle(layer) {
        const label = layer.get('label');
        let lsData = JSON.parse(window.localStorage.getItem(label));

        if (!!lsData && lsData.serial) {
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

    saveStyle(configObject, provisionned) {
        const mbMap = configObject.background.getMapBoxMap();
        const key = configObject.background.get('label');

        this.isCustomStyle = this.isCustomStyleSetter(key, true);

        return this.provisioning(configObject, provisionned).then(() => {
            const value = JSON.stringify({
                medium: configObject.medium,
                background: mbMap.getStyle(),
                serial: configObject.serial
            });

            this.localstorageSaving(key, value);
            if (this.appUserManager_.isAuthenticated()) {
                this.databaseSaving(key, value);
            }
            return configObject.serial;
        });
    }

    // Step 1 of saveStyle()
    provisioning(configObject, provisionned) {
        if (provisionned) {
            return this.publishStyle(configObject.background).then(id => {
                configObject.serial = id;
            });
        } else {
            // Remove unused serial in ls
            return this.unpublishStyle(configObject.background);
        }
    }

    // Step 2 of saveStyle()
    localstorageSaving(key, value) {
        console.log(`Save data for ${key} in local storage`);
        window.localStorage.setItem(key, value);
    }

    // Step 3 of saveStyle()
    databaseSaving(key, value) {
        const body = {
            key,
            value
        }
        const options = {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
        console.log(`Save data for ${key} in database`);
        return fetch(url_save, options);
    }

    getStyle(key) {
        if (!key) {
            return Promise.reject();
        }
        if (this.appUserManager_.isAuthenticated()) {
            const options = {
                method: 'get',
                headers: { 'Content-Type': 'application/json' }
            }
            return fetch(url_get + "?key=" + key, options).then(resultsFromDB => {
                return resultsFromDB.json().then(result => {
                    if (result.length > 0) {
                        const data = result[0];
                        console.log(`Load data for ${key} from database and save it to local storage`);
                        window.localStorage.setItem(key, data['value']);
                        return data['value'];
                    } else {
                        return Promise.reject(`No data for ${key} from database`);
                    }
                });
            });

        } else if (hasLocalStorage()) {
            const lsData = window.localStorage.getItem(key);
            if (lsData) {
                console.log(`Load data for ${key} from local storage`);
                return Promise.resolve(window.localStorage.getItem(key));
            } else {
                return Promise.reject(`No data for ${key} from local storage`);
            }
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
        const key = bgLayer.get('label');
        promises.push(this.unpublishStyle(bgLayer));
        promises.push(window.localStorage.removeItem(key));
        console.log(`Removed mvt styles for ${key} from local storage`);
        if (this.appUserManager_.isAuthenticated()) {
            const options = {
                method: 'delete',
                headers: { 'Content-Type': 'application/json' }
            }
            promises.push(fetch(url_delete + "?key=" + key, options));
            console.log(`Removed mvt styles for ${key} from database`);
        }
        this.isCustomStyle = this.isCustomStyleSetter(key, false);
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

    isCustomStyleGetter(keyword) {
        return this.isCustomStyleObject[keyword];
    }

    isCustomStyleSetter(keyword, bool) {
        for (let [key, value] of Object.entries(this.isCustomStyleObject)) {
            if (key === keyword) {
                return this.isCustomStyleObject[key] = bool;
            }
        }
    }
}

appModule.service('appMvtStylingService', MvtStylingService);

export default MvtStylingService;
