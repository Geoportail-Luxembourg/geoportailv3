/**
 * @module app.slider.SliderController
 */
import appModule from '../module.js';
import {listen, listenOnce} from 'ol/events.js';
import {unByKey} from 'ol/Observable.js';
import { urlStorage } from "luxembourg-geoportail/bundle/lux.dist.js";

/**
 * @param {angular.JQLite} $element Element.
 * @param {Document} $document The document.
 * @param {angular.Scope} $scope Scope.
 * @constructor
 * @ngInject
 */
const exports = function($element, $document, $scope) {

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {Document}
   * @private
   */
  this.$document_ = $document;

  /**
   * @type {angular.JQLite}
   * @private
   */
  this.element_ = $element;

  /**
   * @type {boolean}
   * @private
   */
  this.isDragging_ = false;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mousemoveEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mapResizeEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.postcomposeEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.precomposeEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mousedownEvent_ = null;
  this.scope_.$watch(function() {
    return this['active'];
  }.bind(this), function(show, oldShow) {
    if (show === undefined) {
      return;
    }
    this.activate(show);
  }.bind(this));

  this.scope_.$watchCollection(function() {
    return this.layers;
  }.bind(this), function(newSelectedLayers, oldSelectedLayers) {
    if (this['active'] && newSelectedLayers.length > 0 &&
        newSelectedLayers.length != oldSelectedLayers.length) {
      this.activate(false);
      this.activate(true);
    } else if (newSelectedLayers.length === 0) {
      this.activate(false);
      this['active'] = false;
    }
  }.bind(this));
};

exports.prototype.$onInit = function() {
  this.map_ = this['map'];
}

/**
 * Activate the slider on the line.
 * @param {boolean} active Is active.
 */
exports.prototype.activate = function(active) {
  if (active) {
    if (urlStorage.getItem('sliderRatio') === null) {
      urlStorage.setItem('sliderRatio', '0.5');
    }
    this.moveLine_();

    this.mapResizeEvent_ = listen(this.map_, 'change:size', this.moveLine_, this);
    this.mousedownEvent_ = listen(this.element_[0], 'mousedown',
        function(event) {
          this.isDragging_ = true;
          if (this.mousemoveEvent_ === null) {
            this.mousemoveEvent_ = listen(this.map_,
                'pointermove', this.drag_, this);
          }
         listenOnce(this.$document_[0],
              'mouseup', function() {
                if (this.mousemoveEvent_) {
                  unByKey(this.mousemoveEvent_);
                }
                this.isDragging_ = false;
                this.mousemoveEvent_ = null;
              }, this);
        }, this);
    var layer = this['layers'][0];
    if (layer !== undefined) {
      this.precomposeEvent_ = listen(layer, 'prerender', function(event) {
        if (this['layers'][0] === layer) {
          var ratio = urlStorage.getItem('sliderRatio');
          if (ratio !== null) {
            var ctx = event.context;
            var width = ctx.canvas.width * (1 - parseFloat(ratio));
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, ctx.canvas.width - width, ctx.canvas.height);
            ctx.clip();
          }
        } else {
          this['active'] = false;
        }
      }, this);

      this.postcomposeEvent_ = listen(layer, 'postrender', function(event) {
        if (this['layers'][0] === layer) {
          var ctx = event.context;
          ctx.restore();
        } else {
          this['active'] = false;
        }
      }, this);
    }
  } else {
    if (this.mousedownEvent_) {
      unByKey(this.mousedownEvent_);
    }
    if (this.mapResizeEvent_) {
      unByKey(this.mapResizeEvent_);
    }
    if (this.precomposeEvent_ !== null) {
      unByKey(this.precomposeEvent_);
    }
    if (this.postcomposeEvent_ !== null) {
      unByKey(this.postcomposeEvent_);
    }
  }
  this.map_.render();
};


/**
 * @private
 */
exports.prototype.moveLine_ = function() {
  var curRatio = parseFloat(urlStorage.getItem('sliderRatio'));

  var offset = (curRatio * this.map_.getSize()[0]) -
               (this.element_.width() / 2) +
               angular.element(this.map_.getViewport()).offset().left;
  this.element_.css({'left': offset});
};

/**
 * Dragging the line compartor over the map.
 * @param {ol.MapBrowserEvent} event The event.
 * @private
 */
exports.prototype.drag_ = function(event) {
  if (this.isDragging_) {
    var mapOffset = angular.element(this.map_.getViewport()).offset().left;

    this.element_.css({'left': event.pixel[0] + mapOffset});
    var curRatio = ((this.element_.offset().left - mapOffset) +
                   (this.element_.width() / 2)) / this.map_.getSize()[0];

    if (curRatio < 0.10) {
      curRatio = 0.10;
    } else if (curRatio > 0.90) {
      curRatio = 0.90;
    }
    var offset = (curRatio * this.map_.getSize()[0]) -
                 (this.element_.width() / 2) +
                 angular.element(this.map_.getViewport()).offset().left;
    this.element_.css({'left': offset});

    urlStorage.setItem('sliderRatio', curRatio);
    this.map_.render()
  }
};

appModule.controller('AppSliderController', exports);


export default exports;
