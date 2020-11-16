import { _ } from 'core-js';
import appModule from '../module.js';

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
        const configs = [];
        layerLabelList.forEach(label => {
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
                const isValidUUIDv4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi;
                if (serial.match(isValidUUIDv4Regex) !== null) {
                    // if label and serialLayer are equal, or fallback to roadmap layer if serialLayer is null
                    if (label === serialLayer || (label === 'basemap_2015_global' && serialLayer === null)) {
                        console.log(`Load mvt style for ${label} from serial uuid`);
                        this.isCustomStyle = this.isCustomStyleSetter(label, true);
                        const style_url = `${this.getvtstyleUrl_}?id=${serial}`
                        config.style = style_url;
                    } else {
                        console.log(`Default mvt style for ${label}`);
                    }
                } else {
                    // if label and serialLayer are equal, or fallback to roadmap layer if serialLayer is null
                    if (label === serialLayer || (label === 'basemap_2015_global' && serialLayer === null)) {
                        console.log(`Load mvt style for ${label} from serialized config`);
                        this.isCustomStyle = this.isCustomStyleSetter(label, true);
                        config.style = this.apply_mvt_config(serial, label);
                    } else {
                        console.log(`Default mvt style for ${label}`);
                    }
                }
            } else if (this.appUserManager_.isAuthenticated()) {
                const options = {
                    method: 'get',
                    headers: { 'Content-Type': 'application/json' }
                }
                fetch(url_get + "?key=" + label, options).then(resultFromDB => {
                    if (!!resultFromDB.data) {
                        console.log(`Load mvt style for ${label} from database and save it to local storage`);
                        this.isCustomStyle = this.isCustomStyleSetter(label, true);
                        window.localStorage.setItem(label, resultFromDB.data[0].value);
                        config.style = JSON.parse(resultFromDB.data[0].value)
                    } else {
                        // Default style if no existing in LS or DB
                        console.log(`Default mvt style for ${label}`);
                        this.isCustomStyle = this.isCustomStyleSetter(label, false);
                    }
                });
            } else if (hasLocalStorage() && !!window.localStorage.getItem(label)) {
                if (lsData.serial) {
                    // If there is a mvt expert style in the local storage, force parameter in the url
                    this.ngeoLocation_.updateParams({
                        'serial': JSON.stringify(lsData.serial),
                        'serialLayer': JSON.stringify(label)
                    });
                    console.log(`Load mvt style for ${label} from local storage`);
                    this.isCustomStyle = this.isCustomStyleSetter(label, true);

                    // Should work offline as well
                    config.style = lsData.background;
                }

                if (lsData.medium) {
                    // If there is a mvt medium config in the local storage, force parameter in the url
                    this.ngeoLocation_.updateParams({
                        'serial': JSON.stringify(lsData.medium),
                        'serialLayer': JSON.stringify(label)
                    });
                    console.log(`Load mvt style for ${label} from local storage`);
                    this.isCustomStyle = this.isCustomStyleSetter(label, true);

                    // Should work offline as well
                    config.style = lsData.background;
                }
            } else {
                // Default style if no existing in LS or DB
                console.log(`Default mvt style for ${label}`);
                this.isCustomStyle = this.isCustomStyleSetter(label, false);
            }
            return configs.push(config);
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
                const interval = setInterval(() => {
                    try {
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
                    // modify existing key item
                    const label = layer.get('label');
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
            console.log(`Save data for ${key} in database`);
        }

        this.isCustomStyle = this.isCustomStyleSetter(key, true);
        window.localStorage.setItem(key, value);
        console.log(`Save data for ${key} in local storage`);

        if (isPublished) {
            promises.push(this.publishStyle(configObject.background));
        } else {
            // Remove unused serial in ls
            promises.push(this.unpublishStyle(configObject.background));
        }

        return Promise.all(promises);
    }

    getStyle(key) {
        if (!key) {
            return;
        }
        if (this.appUserManager_.isAuthenticated()) {
            const options = {
                method: 'get',
                headers: { 'Content-Type': 'application/json' }
            }
            return fetch(url_get + "?key=" + key, options).then(resultFromDB => {
                const styleFromDB = resultFromDB.data;
                if (!!styleFromDB) {
                    console.log(`Load data for ${key} from database and save it to local storage`);
                    this.isCustomStyle = this.isCustomStyleSetter(key, true);
                    window.localStorage.setItem(key, styleFromDB[0].value);
                    return Promise.resolve(styleFromDB[0].value);
                } else {
                    return Promise.reject(`No data for ${key} from database`);
                }
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
