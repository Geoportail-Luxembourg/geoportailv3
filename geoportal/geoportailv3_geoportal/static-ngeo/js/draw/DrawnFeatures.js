/**
 * @module app.draw.DrawnFeatures
 */
/**
 * @fileoverview Provides a drawn features service useful to share
 * information about the drawn features throughout the application.
 */

import appModule from '../module.js';
import appDrawFeatureHash from '../draw/FeatureHash.js';
import olLayerVector from 'ol/layer/Vector.js';
import olSourceVector from 'ol/source/Vector.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import {createEmpty, extend} from 'ol/extent.js';
import olCollection from 'ol/Collection.js';

/**
 * @constructor
 * @param {ngeo.statemanager.Location} ngeoLocation Location service.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager
 * @ngInject
 */
const exports = function(ngeoLocation, appMymaps, ngeoFeatureOverlayMgr) {

  /**
   * @type {ngeo.map.FeatureOverlayMgr}
   * @private
   */
  this.ngeoFeatureOverlayMgr_ = ngeoFeatureOverlayMgr;

  /**
  * @type {ngeo.map.FeatureOverlay}
  * @export
  */
  this.drawOverlay = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.interaction.Select}
   */
  this.selectInteraction;

  /**
   * @type {app.interaction.DrawRoute}
   */
  this.drawLineInteraction;

  /**
   * @type {ol.interaction.Modify}
   */
  this.modifyInteraction;

  /**
   * @type {app.interaction.ModifyCircle}
   */
  this.modifyCircleInteraction;

  /**
   * @type {app.interaction.ClipLine}
   */
  this.clipLineInteraction;

  /**
   * @type {ngeo.interaction.Translate}
   */
  this.translateInteraction;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

  /**
   * @type {ol.Collection}
   */
  this.features = new olCollection();

  /**
   * @type {ol.layer.Vector}
   * @export
   */
  this.drawLayer = new olLayerVector({
    source: new olSourceVector({
      features: this.features
    }),
    zIndex: 1000,
    altitudeMode: 'clampToGround',
    metadata: {}
  });

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @const
   * @private
   */
  this.SHORT_PARAM_ = {
    'angle': 'a',
    'color': 'c',
    'description': 'd',
    'stroke': 'e',
    'isLabel': 'i',
    'linestyle': 'l',
    'name': 'n',
    'opacity': 'o',
    'showOrientation': 'r',
    'shape': 's',
    'size': 't',
    'isCircle': 'u'
  };

  /**
   * @type {app.draw.FeatureHash}
   * @private
   */
  this.fhFormat_ = new appDrawFeatureHash({
    encodeStyles: false,
    properties: (
        /**
         * @param {ol.Feature} feature Feature.
         * @return {Object.<string, (string|number)>} Properties to encode.
         */
        (function(feature) {
          // Do not encode the __editable__ and __selected__ properties.
          var properties = feature.getProperties();
          delete properties['__editable__'];
          delete properties['__selected__'];
          delete properties['__map_id__'];
          delete properties['__saving__']; // ugly hack?
          for (var key in properties) {
            if (properties[key] === null || properties[key] === undefined) {
              delete properties[key];
            } else {
              if (this.SHORT_PARAM_[key]) {
                var value = properties[key];
                delete properties[key];
                properties[this.SHORT_PARAM_[key]] = value;
              }
            }
          }
          return properties;
        }).bind(this))
  });
};


/**
 * Remove the feature from the drawn list.
 * If the feature is a mymaps feature then delete it from mymaps and
 * then rewrite the url.
 * @param {ol.Feature} feature The feature to remove.
 */
exports.prototype.remove = function(feature) {
  this.features.remove(feature);
  var isMymaps = !!feature.get('__map_id__');
  if (isMymaps) {
    if (this.appMymaps_.isEditable()) {
      this.appMymaps_.deleteFeature(feature);
    }
  }
  this.encodeFeaturesInUrl_(this.features.getArray());
};

/**
 * Recompute the feature order.
 * @export
 */
exports.prototype.computeOrder = function() {
  this.features.getArray().forEach(function(feature) {
    feature.set('display_order', this.features.getArray().indexOf(feature));
  }, this);
  this.saveFeaturesOrder();
};

/**
 * Deactivate the editmode for each drawn features.
 */
exports.prototype.clearEditMode = function() {
  this.features.getArray().forEach(function(feature) {
    feature.set('__editable__', false);
  }, this);
};


/**
 * Add a feature in the drawn feature list.
 * Save it into mymaps and rewrite the url.
 * @param {ol.Feature} feature The feature to add.
 */
exports.prototype.add = function(feature) {
  var features = this.features.getArray().slice();
  features.push(feature);
  this.saveFeature(feature);
  this.encodeFeaturesInUrl_(features);
};


/**
 * @param {Array.<ol.Feature>} features Features to encode in the URL.
 * @private
 */
exports.prototype.encodeFeaturesInUrl_ = function(features) {
  var featuresToEncode = features.filter(function(feature) {
    return !feature.get('__map_id__');
  });
  if (featuresToEncode.length > 0) {
    this.ngeoLocation_.updateParams({
      'features': this.fhFormat_.writeFeatures(featuresToEncode)
    });
  } else {
    this.ngeoLocation_.deleteParam('features');
  }
};


/**
 * Save the feature either in url or in mymaps if the current user
 * has the permissions.
 * @param {ol.Feature} feature The feature to save.
 */
exports.prototype.saveFeature = function(feature) {
  if (this.appMymaps_.isEditable() &&
      !!feature.get('__map_id__')) {
    this.saveFeatureInMymaps_(feature);
  }
  this.encodeFeaturesInUrl_(this.features.getArray());
};

/**
 * Save the current feature order
 * has the permissions.
 */
exports.prototype.saveFeaturesOrder = function() {
  if (this.appMymaps_.isEditable()) {
    var mymapsFeatures = this.features.getArray().filter(function(feature) {
      return !!feature.get('__map_id__');
    });
    this.appMymaps_.saveFeaturesOrder(mymapsFeatures);
  }
  this.encodeFeaturesInUrl_(this.features.getArray());
};

/**
 * Move anonymous features to mymaps
 * @return {angular.$q.Promise|Promise} Promise.
 */
exports.prototype.moveAnonymousFeaturesToMymaps = function() {
  var newMymapsFeatures = [];
  this.features.getArray().map(function(feature) {
    if (!feature.get('__map_id__')) {
      feature.set('__map_id__', this.appMymaps_.getMapId());
      newMymapsFeatures.push(feature);
    }
  }.bind(this));

  return this.saveFeaturesInMymaps_(newMymapsFeatures);
};


/**
 * Decode the features encoded in the URL and add them to the collection
 * of drawn features.
 * @param {ol.FeatureStyleFunction} featureStyleFunction The function to style
 * a feature.
 */
exports.prototype.drawFeaturesInUrl = function(featureStyleFunction) {
  var encodedFeatures = this.ngeoLocation_.getParam('features');
  if (encodedFeatures !== undefined) {
    var remoteFeatures = null;
    try {
      remoteFeatures = this.fhFormat_.readFeatures(encodedFeatures);
    } catch (e) {
      // Sometimes we get url with a unencoded character # corresponding on a color into the feature.
      // It means that the querryData is not properly fullfiled and the feature is not properly decoded.
      // That's why in case of errror we try to pick up the parameter directly from the url.
      if (location.href.indexOf('#') >= 0) {
        let pairs = location.href.replaceAll('#','%23').substring(1).split('&');
        for (const pair of pairs) {
          const indexOfEquals = pair.indexOf('=');
          if (indexOfEquals >= 0) {
            const name = pair.substring(0, indexOfEquals);
            const value = pair.substring(indexOfEquals + 1);
            if (name === 'features') {
              remoteFeatures = this.fhFormat_.readFeatures(decodeURIComponent(value));
            }
          }
        }
      }
    }
    console.assert(remoteFeatures !== null);
    remoteFeatures.forEach(function(feature) {
      var properties = feature.getProperties();
      for (var key in this.SHORT_PARAM_) {
        if (properties[this.SHORT_PARAM_[key]]) {
          feature.set(key, properties[this.SHORT_PARAM_[key]]);
          feature.unset(this.SHORT_PARAM_[key]);
        }
      }
      var order = /** @type {string} */ (feature.get('display_order'));
      if (order === undefined) {
        order = remoteFeatures.indexOf(feature);
      }

      var opacity = /** @type {string} */ (feature.get('opacity'));
      if (opacity === undefined) {
        opacity = 0;
      }

      feature.set('opacity', +opacity);
      var stroke = /** @type {string} */ (feature.get('stroke'));
      if (isNaN(stroke)) {
        stroke = 2;
      }
      feature.set('stroke', +stroke);
      var size = /** @type {string} */ (feature.get('size'));
      if (isNaN(size)) {
        size = 10;
      }
      feature.set('size', +size);

      var angle = /** @type {string} */ (feature.get('angle'));
      if (isNaN(angle)) {
        angle = 0;
      }
      feature.set('angle', +angle);
      var isLabel = /** @type {string} */ (feature.get('isLabel'));
      feature.set('isLabel', isLabel === 'true');
      var isCircle = /** @type {string} */ (feature.get('isCircle'));
      feature.set('isCircle', isCircle === 'true');
      var showOrientation = /** @type {string} */
          (feature.get('showOrientation'));
      feature.set('showOrientation', showOrientation === 'true');

      feature.set('__map_id__', undefined);
      feature.setStyle(featureStyleFunction);
    }.bind(this));

    this.features.extend(remoteFeatures);
  }
};


/**
 * @param {ol.Feature} feature Feature to save in mymaps.
 * @private
 */
exports.prototype.saveFeatureInMymaps_ = function(feature) {
  var currentFeature = feature;
  if (this.appMymaps_.isEditable() && !feature.get('__saving__')) {
    feature.set('__saving__', true);
    this.appMymaps_.saveFeature(feature)
      .then(resp => {
        if (resp != undefined) {
          var featureId = resp['id'];
          currentFeature.set('fid', featureId);
          feature.set('__saving__', false);
        }
      }, () => {
        feature.set('__saving__', false);
      });
  }
};


/**
 * @param {Array.<ol.Feature>} features An array of features to save in mymaps.
 * @return {angular.$q.Promise|Promise} Promise.
 * @private
 */
exports.prototype.saveFeaturesInMymaps_ = function(features) {
  return this.appMymaps_.saveFeatures(features);
};

/**
 * Clear the drawn features.
 */
exports.prototype.clear = function() {
  this.features.clear();
  this.appMymaps_.clear();
};


/**
 * Clear the features belonging to mymaps.
 */
exports.prototype.clearMymapsFeatures = function() {
  var mymapsFeatures = this.features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });

  mymapsFeatures.forEach(function(feature) {
    this.features.remove(feature);
  }.bind(this));
  this.appMymaps_.clear();
  this.encodeFeaturesInUrl_(this.features.getArray());
};


/**
 * Remove the features belonging to mymaps.
 */
exports.prototype.removeMymapsFeatures = function() {
  var mymapsFeatures = this.features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });

  mymapsFeatures.forEach(function(feature) {
    this.features.remove(feature);
  }.bind(this));
};


/**
 * Clear the anonymous features.
 */
exports.prototype.clearAnonymousFeatures = function() {
  var anonymousFeatures = this.features.getArray().filter(function(feature) {
    return !feature.get('__map_id__');
  });

  anonymousFeatures.forEach(function(feature) {
    this.features.remove(feature);
  }.bind(this));
  this.encodeFeaturesInUrl_(this.features.getArray());
};


/**
 * Get the current drawn features as an array.
 * @return {Array.<ol.Feature | ol.render.Feature>?} The features array.
 */
exports.prototype.getArray = function() {
  return this.features.getArray();
};


/**
 * Get the current drawn features as a Collection.
 * @return {ol.Collection} The collection of drawn features.
 */
exports.prototype.getCollection = function() {
  return this.features;
};


/**
 * @param {ol.Feature} feature The feature.
 */
exports.prototype.activateModifyIfNeeded = function(feature) {
  var isTranlationActive = false;
  var isModifyInteractionActive = true;
  var isModifyCircleActive = false;
  var isCircle = !!feature.get('isCircle');
  var isMymaps = !!feature.get('__map_id__');
  if (isCircle) {
    isModifyInteractionActive = false;
    isTranlationActive = false;
    if (isMymaps) {
      isModifyCircleActive = this.appMymaps_.isEditable();
    } else {
      isModifyCircleActive = true;
    }
  } else {
    var isPoint = feature.getGeometry().getType() ===
        olGeomGeometryType.POINT;
    if (isMymaps) {
      isModifyInteractionActive = this.appMymaps_.isEditable();
      isTranlationActive = this.appMymaps_.isEditable() && isPoint;
    } else {
      isTranlationActive = isPoint;
    }
  }
  this.modifyInteraction.setActive(isModifyInteractionActive);
  this.modifyCircleInteraction.setActive(isModifyCircleActive);
  this.translateInteraction.setActive(isTranlationActive);

  feature.set('__editable__',
    isModifyInteractionActive | isModifyCircleActive | isTranlationActive);
};


/**
 * @return {ol.Extent} The extent of all features
 */
exports.prototype.getExtent = function() {
  var extent = createEmpty();
  this.features.forEach(function(feature) {
    if (feature.getGeometry()) {
      extent = extend(extent, feature.getGeometry().getExtent());
    }
  }, this);

  return extent;
};

/**
 * @return {ol.layer.Vector} The drawn features layer.
 */
exports.prototype.getLayer = function() {
  return this.drawLayer;
};

appModule.service('appDrawnFeatures', exports);


export default exports;
