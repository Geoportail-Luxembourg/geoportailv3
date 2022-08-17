/**
 * @module app.backgroundlayer.BackgroundselectorController
 */

import appModule from '../module.js';
import {listen} from 'ol/events.js';

/**
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer manager.
 * @param {import('../Themes').default} appThemes The app themes.
 * @ngInject
 */
class Controller {
    constructor(ngeoBackgroundLayerMgr, appThemes) {
        /**
         * @type {ngeo.map.BackgroundLayerMgr}
         * @private
         */
        this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

        /**
         * @type {import('../Themes').default}
         */
        this.appThemes_ = appThemes;

        /**
         * @type {import('ol/layer/Base').default[]}
         */
        this.bgLayers;

        /**
         * @type {import('ol/layer/Base').default}
         */
        this.bgLayer;

        /**
         * @type {boolean}
         */
        this.isOpened = false;

        /**
         * @type {string}
         */
        this.openerClass = 'bg-selector-layer-0';
    }

    $onInit() {
        this.appThemes_.getBgLayers(this.map).then(bgLayers => {
            this.bgLayers = bgLayers;
            this.bgLayer = this.backgroundLayerMgr_.get(this.map);
        });
    
        listen(this.backgroundLayerMgr_, 'change', evt => {
            /**
             * @type {BaseLayer}
             */
            const previous = evt.detail.previous;

            /**
             * @type {BaseLayer}
             */
            const current = evt.detail.current;

            if (previous) {
                previous.setVisible(false);
            } else {
              this.bgLayers.forEach(function(layer) {
                layer.setVisible(false);
              });
            }
            current.setVisible(true);
            this.bgLayer = current;

            // Set initial opener class with loaded theme
            const idx = this.bgLayers.findIndex(layer => layer === current);
            this.openerClass = `bg-selector-layer-${idx}`;
            const piwik = /** @type {Piwik} */ (window['_paq']);
            if (piwik != undefined) {
              piwik.push(['setDocumentTitle', 'BackgroundAdded/' + this.bgLayer.get('label')]);
              piwik.push(['trackPageView']);
            }
            this.map.updateSize();
            this.map.renderSync();
            if (current.getMapBoxMap) {
              const mbm = current.getMapBoxMap();
              mbm.resize();
            }
        });
      };

    /**
     * @param {BaseLayer} layer Layer.
     * @export
     */
    setBackgroundLayer(layer) {
        this.bgLayer = layer;
        this.backgroundLayerMgr_.set(this.map, layer);
        this.toggleSelector();
    };

    /**
     * @export
     */
    toggleSelector() {
        this.isOpened = !this.isOpened;
    };
};

appModule.controller('AppBackgroundselectorController', Controller);
export default Controller;
