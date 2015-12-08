/**
 * @fileoverview This file defines the mymaps webservice. this service
 * interacts with the Geoportail MyMaps webservice and exposes functions that
 * return objects representing maps and features.
 */

goog.provide('app.Mymaps');

goog.require('app');
goog.require('app.Notify');
goog.require('app.UserManager');


/**
 * @typedef {Array.<Object>}
 */
app.MapsResponse;



/**
 * @constructor
 * @param {angular.$http} $http
 * @param {string} mymapsMapsUrl URL to "mymaps" Maps service.
 * @param {string} mymapsUrl URL to "mymaps" Features service.
 * @param {app.StateManager} appStateManager
 * @param {app.UserManager} appUserManager
 * @param {app.Notify} appNotify Notify service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode Function to
 *     create layers from catalog nodes.
 * @param {gettext} gettext Gettext service.
 * @param {app.Themes} appThemes
 * @param {app.Theme} appTheme
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr
 * @ngInject
 */
app.Mymaps = function($http, mymapsMapsUrl, mymapsUrl, appStateManager,
    appUserManager, appNotify, appGetLayerForCatalogNode, gettext, appThemes,
    appTheme, ngeoBackgroundLayerMgr) {

  /**
   * @type {app.GetLayerForCatalogNode}
   * @private
   */
  this.getLayerFunc_ = appGetLayerForCatalogNode;

  /**
   * @type {ol.Map}
   */
  this.map;

  /**
   * @type {boolean}
   */
  this.layersChanged;

  /**
   * @type {ngeo.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {app.Themes}
   * @private
   */
  this.appThemes_ = appThemes;

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {gettext}
   * @private
   */
  this.gettext_ = gettext;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {app.StateManager}
   * @private
   */
  this.stateManager_ = appStateManager;

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {string}
   * @private
   */
  this.mymapsMapsUrl_ = mymapsMapsUrl;

  /**
   * @type {string}
   * @private
   */
  this.mymapsCategoriesUrl_ = mymapsUrl + '/categories';

  /**
   * @type {string}
   * @private
   */
  this.mymapsFeaturesUrl_ = mymapsUrl + '/features/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsMapInfoUrl_ = mymapsUrl + '/map/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsDeleteFeatureUrl_ = mymapsUrl + '/delete_feature/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsDeleteMapUrl_ = mymapsUrl + '/delete/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsCreateMapUrl_ = mymapsUrl + '/create';

  /**
   * @type {string}
   * @private
   */
  this.mymapsUpdateMapUrl_ = mymapsUrl + '/update/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsSaveFeatureUrl_ = mymapsUrl + '/save_feature/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsSaveFeaturesUrl_ = mymapsUrl + '/save_features/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsCopyMapUrl_ = mymapsUrl + '/copy/';

  /**
   * @type {string}
   * @private
   */
  this.mymapsSymbolUrl_ = mymapsUrl + '/symbol/';

  /**
   * @type {string}
   * @private
   */
  this.mapId_ = '';

  /**
   * The currently displayed map title.
   * @type {string}
   */
  this.mapTitle = '';

  /**
   * The currently displayed map category id.
   * @type {?number}
   * @export
   */
  this.mapCategoryId = null;

  /**
   * Whether the map is public or not.
   * @type {boolean}
   */
  this.mapIsPublic = false;

  /**
   * The currently displayed map title.
   * @type {string}
   */
  this.mapOwner = '';

  /**
   * The currently displayed map description.
   * @type {string}
   */
  this.mapDescription = '';

  /**
   * The BG Layer of the mymap.
   * @type {string}
   */
  this.mapBgLayer = 'voidLayer';

  /**
   * The theme of the mymap.
   * @type {string}
   */
  this.mapTheme;

  /**
   * The BG Opacity of the mymap.
   * @type {number}
   */
  this.mapBgOpacity = 1;

  /**
   * The layers.
   * @type {Array<string>}
   */
  this.mapLayers = [];

  /**
   * The opacity of layers.
   * @type {Array<string>}
   */
  this.mapLayersOpacities = [];

  /**
   * The visibility of layers.
   * @type {Array<string>}
   */
  this.mapLayersVisibilities = [];

  /**
   * The indice of layers.
   * @type {Array<string>}
   */
  this.mapLayersIndicies = [];

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = this.createStyleFunction();

  /**
   * @type {ol.proj.Projection}
   */
  this.mapProjection;

  /**
   * The list of categories objects, depending on user role.
   * @type {?Array.<Object>}
   * @export
   */
  this.categories = null;


  /**
   * @const
   * @private
   */
  this.V2_BGLAYER_TO_V3_ = {
    'webbasemap' : 'basemap_2015_global',
    'topogr': 'topogr_global',
    'pixelmaps-gray': 'topo_bw_jpeg',
    'streets': 'streets_jpeg',
    'voidlayer': 'blank',
    'voidLayer': 'blank'
  };

};


/**
 * @param {?number} categoryId the category id to get a category for
 * @return {?Object}
 */
app.Mymaps.prototype.getCategory = function(categoryId) {
  if (goog.isDefAndNotNull(categoryId)) {
    return goog.array.find(this.categories, function(category) {
      return category.id === categoryId;
    });
  } else {
    return null;
  }
};


/**
 * Set the mapId.
 * @param {string} mapId The map id.
 */
app.Mymaps.prototype.setMapId = function(mapId) {
  this.mapId_ = mapId;
  this.stateManager_.updateState({
    'map_id': this.mapId_
  });
};


/**
 * Get the mapId.
 * @return {string} The map id.
 */
app.Mymaps.prototype.getMapId = function() {
  return this.mapId_;
};


/**
 * Set the mapId and load map information.
 * @param {string} mapId The map id.
 * @param {ol.Collection} collection
 */
app.Mymaps.prototype.setCurrentMapId = function(mapId, collection) {
  this.setMapId(mapId);

  this.loadMapInformation().then(goog.bind(function() {
    this.loadFeatures_().then(goog.bind(function(features) {
      var encOpt = /** @type {olx.format.ReadOptions} */ ({
        dataProjection: 'EPSG:2169',
        featureProjection: this.mapProjection
      });
      var jsonFeatures = (new ol.format.GeoJSON()).
          readFeatures(features, encOpt);
      goog.array.forEach(jsonFeatures, function(feature) {
        feature.set('__map_id__', this.getMapId());
        feature.set('__editable__', this.isEditable());
        feature.setStyle(this.featureStyleFunction_);
      }, this);

      collection.extend(
          /** @type {!Array<(null|ol.Feature)>} */ (jsonFeatures));
    }, this));
  },this));

};


/**
 * clear the mymaps service
 */
app.Mymaps.prototype.clear = function() {
  this.stateManager_.deleteParam('map_id');
  this.mapId_ = '';
  this.mapTitle = '';
  this.mapDescription = '';
  this.mapOwner = '';
  this.mapCategoryId = null;
  this.mapIsPublic = false;
  this.mapBgLayer = 'voidLayer';
  this.mapBgOpacity = 1;
  this.mapLayers = [];
  this.mapLayersOpacities = [];
  this.mapLayersVisibilities = [];
  this.mapLayersIndicies = [];
};


/**
 * @return {boolean} return true if is editable by the user
 */
app.Mymaps.prototype.isEditable = function() {
  if (this.isMymapsSelected() && this.appUserManager_.isAuthenticated() &&
      (this.appUserManager_.isAdmin == 'TRUE' ||
       this.appUserManager_.getUsername() == this.mapOwner)) {
    return true;
  }
  return false;
};


/**
 * Get an array of map objects.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.getMaps = function() {
  return this.$http_.get(this.mymapsMapsUrl_).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
           'Erreur inattendue lors du chargement de vos cartes.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Load the permissible categories from the webservice.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadCategories = function() {
  return this.$http_.get(this.mymapsCategoriesUrl_).then(goog.bind(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {app.MapsResponse} The "mymaps" web service response.
         */
      function(resp) {
        this.categories = resp.data;
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          return null;
        }
        return [];
      }, this)
  );
};


/**
 * Load map features
 * @return {angular.$q.Promise} Promise.
 * @private
 */
app.Mymaps.prototype.loadFeatures_ = function() {
  return this.$http_.get(this.mymapsFeaturesUrl_ + this.mapId_).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors du chargement de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * update the map with layers
 * @private
 */
app.Mymaps.prototype.updateLayers_ = function() {
  var curBgLayer = this.mapBgLayer;
  this.appThemes_.getBgLayers().then(goog.bind(
      /**
       * @param {Array.<ol.layer.Base>} bgLayers
       */
      function(bgLayers) {
        var layer = /** @type {ol.layer.Base} */
            (goog.array.find(bgLayers, function(layer) {
          return layer.get('label') === curBgLayer;
        }));
        if (layer) {
          this.backgroundLayerMgr_.set(this.map, layer);
        }
      }, this));

  var curMapLayers = this.mapLayers;
  var curMapOpacities = this.mapLayersOpacities;
  var curMapVisibilities = this.mapLayersVisibilities;
  if (this.mapTheme) {
    this.appTheme_.setCurrentTheme(this.mapTheme);
  }
  this.appThemes_.getFlatCatalog()
  .then(goog.bind(function(flatCatalogue) {
        goog.array.forEach(curMapLayers, goog.bind(function(item, layerIndex) {
          var node = goog.array.find(flatCatalogue,
              function(catalogueLayer) {
                return catalogueLayer['name'] === item;
              });
          if (node) {
            var layer = this.getLayerFunc_(node);
            if (layer && this.map.getLayers().getArray().indexOf(layer) <= 0) {
              this.map.addLayer(layer);
            }
            if (curMapOpacities) {
              layer.setOpacity(parseFloat(curMapOpacities[layerIndex]));
            }
            if (curMapVisibilities) {
              if (curMapVisibilities[layerIndex] === 'false') {
                layer.setOpacity(0);
              }
            }
          }
        }, this));},this));
};


/**
 * Load the map information.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadMapInformation = function() {
  return this.getMapInformation().then(
      goog.bind(function(mapinformation) {
        this.mapDescription = mapinformation['description'];
        this.mapTitle = mapinformation['title'];
        this.mapOwner = mapinformation['user_login'];
        this.mapIsPublic = mapinformation['public'];
        this.mapBgLayer = mapinformation['bg_layer'];
        this.mapTheme = mapinformation['theme'];

        if (!this.mapBgLayer) {
          this.mapBgLayer = 'blank';
        }
        if (this.mapBgLayer in this.V2_BGLAYER_TO_V3_) {
          this.mapBgLayer = this.V2_BGLAYER_TO_V3_[this.mapBgLayer];
        }

        this.mapBgOpacity = mapinformation['bg_opacity'];
        if ('layers' in mapinformation && mapinformation['layers']) {
          this.mapLayers = mapinformation['layers'].split(',');
          this.mapLayers.reverse();
          if ('layers_opacity' in mapinformation &&
              mapinformation['layers_opacity']) {
            this.mapLayersOpacities =
                mapinformation['layers_opacity'].split(',');
          } else {
            this.mapLayersOpacities = [];
          }
          this.mapLayersOpacities.reverse();
          if ('layers_visibility' in mapinformation &&
              mapinformation['layers_visibility']) {
            this.mapLayersVisibilities =
                mapinformation['layers_visibility'].split(',');
          } else {
            this.mapLayersVisibilities = [];
          }
          this.mapLayersVisibilities.reverse();
          if ('layers_indices' in mapinformation &&
              mapinformation['layers_indices']) {
            this.mapLayersIndicies =
                mapinformation['layers_indices'].split(',');
          } else {
            this.mapLayersIndicies = [];
          }
          this.mapLayersIndicies.reverse();
        } else {
          this.mapLayers = [];
          this.mapOpacities = [];
          this.mapVisibilities = [];
          this.mapLayersIndicies = [];
        }
        return mapinformation;
      }, this))
      .then(goog.bind(function(mapinformation) {
        this.updateLayers_();
        this.layersChanged = false;
        return mapinformation;},this));
};


/**
 * Get the map information.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.getMapInformation = function() {
  return this.$http_.get(this.mymapsMapInfoUrl_ + this.mapId_).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors du chargement de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Delete a map
 * @param {ol.Feature} feature the feature to delete.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteFeature = function(feature) {
  return this.$http_.delete(this.mymapsDeleteFeatureUrl_ +
      feature.get('id')).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }

        var msg = this.gettext_(
            'Erreur inattendue lors de la suppression d\'un élement.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * create a new map
 * @param {string} title the title of the map.
 * @param {string} description a description about the map.
 * @param {?number} categoryId the category id of the map.
 * @param {boolean} isPublic if the map is public or not.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.createMap =
    function(title, description, categoryId, isPublic) {
  var req = $.param({
    'title': title,
    'description': description,
    'category_id': categoryId,
    'public': isPublic
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsCreateMapUrl_, req, config).then(
      goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la création de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Copy the current map inside a new map.
 * @param {string} title The title of the map.
 * @param {string} description The description about the map.
 * @param {?number} categoryId the category id of the map.
 * @param {boolean} isPublic if the map is public or not.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.copyMap =
    function(title, description, categoryId, isPublic) {
  var req = $.param({
    'title': title,
    'description': description,
    'category_id': categoryId,
    'public': isPublic
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsCopyMapUrl_ + this.mapId_, req, config).
      then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la copie de votre carte.');
        this.notify_(msg);
        return [];
      }, this));
};


/**
 * Delete a map.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteMap = function() {
  return this.$http_.delete(this.mymapsDeleteMapUrl_ + this.mapId_).then(
      goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la suppression de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Save the map
 * @param {string} title the title of the map.
 * @param {string} description a description about the map.
 * @param {?number} categoryId the category of the map.
 * @param {boolean} isPublic is the map public.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.updateMap =
    function(title, description, categoryId, isPublic) {

  this.mapTitle = title;
  this.mapDescription = description;
  this.mapCategoryId = categoryId;
  this.mapIsPublic = isPublic;

  var req = $.param({
    'title': title,
    'description': description,
    'category_id': categoryId,
    'public': isPublic
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.put(this.mymapsUpdateMapUrl_ + this.mapId_,
      req, config).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la mise à jour de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Save the map environment.
 * @param {string} bgLayer
 * @param {string} bgOpacity
 * @param {string} layers
 * @param {string} layers_opacity
 * @param {string} layers_visibility
 * @param {string} layers_indices
 * @param {string} theme
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.updateMapEnv =
    function(bgLayer, bgOpacity, layers, layers_opacity,
        layers_visibility, layers_indices, theme) {

  var req = $.param({
    'bgLayer': bgLayer,
    'bgOpacity': bgOpacity,
    'layers': layers,
    'layers_opacity': layers_opacity,
    'layers_visibility': layers_visibility,
    'layers_indices': layers_indices,
    'theme': theme
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.put(this.mymapsUpdateMapUrl_ + this.mapId_,
      req, config).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la mise à jour de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Save a feature into a map.
 * @param {ol.Feature} feature The feature to save
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.saveFeature = function(feature) {
  var encOpt = /** @type {olx.format.ReadOptions} */ ({
    dataProjection: 'EPSG:2169',
    featureProjection: this.mapProjection
  });
  var req = $.param({
    'feature': (new ol.format.GeoJSON()).writeFeature(feature, encOpt)
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsSaveFeatureUrl_ + this.mapId_,
      req, config).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la sauvegarde de votre modification.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Save an array of features into the current map.
 * @param {Array.<ol.Feature>} features The features to save
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.saveFeatures = function(features) {
  var encOpt = /** @type {olx.format.ReadOptions} */ ({
    dataProjection: 'EPSG:2169',
    featureProjection: this.mapProjection
  });
  var req = $.param({
    'features': (new ol.format.GeoJSON()).writeFeatures(features, encOpt)
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsSaveFeaturesUrl_ + this.mapId_,
      req, config).then(goog.bind(
      /**
       * @param {angular.$http.Response} resp Ajax response.
       * @return {app.MapsResponse} The "mymaps" web service response.
       */
      function(resp) {
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettext_(
            'Erreur inattendue lors de la sauvegarde de votre modification.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Notify the user he has to connect.
 * @export
 */
app.Mymaps.prototype.notifyUnauthorized = function() {
  var msg = this.gettext_(
      'Votre utilisateur n\'a pas les autorisations suffisantes.');
  this.notify_(msg);
};


/**
 * @return {boolean} Return true if a map is selected.
 */
app.Mymaps.prototype.isMymapsSelected = function() {
  return !goog.string.isEmpty(this.mapId_);
};


/**
 * @return {ol.FeatureStyleFunction}
 * @export
 */
app.Mymaps.prototype.createStyleFunction = function() {

  var styles = [];

  var vertexStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: 6,
      points: 4,
      angle: Math.PI / 4,
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.5)'
      }),
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 1)'
      })
    }),
    geometry: function(feature) {
      var geom = feature.getGeometry();

      if (geom.getType() == ol.geom.GeometryType.POINT) {
        return;
      }

      var coordinates;
      if (geom instanceof ol.geom.LineString) {
        coordinates = feature.getGeometry().getCoordinates();
        return new ol.geom.MultiPoint(coordinates);
      } else if (geom instanceof ol.geom.Polygon) {
        coordinates = feature.getGeometry().getCoordinates()[0];
        return new ol.geom.MultiPoint(coordinates);
      } else {
        return feature.getGeometry();
      }
    }
  });

  var fillStyle = new ol.style.Fill();
  var symbolUrl = this.mymapsSymbolUrl_;
  return function(resolution) {

    // clear the styles
    styles.length = 0;

    if (this.get('__editable__') && this.get('__selected__')) {
      styles.push(vertexStyle);
    }

    // goog.asserts.assert(goog.isDef(this.get('__style__'));
    var color = this.get('color') || '#FF0000';
    var rgb = goog.color.hexToRgb(color);
    var opacity = this.get('opacity');
    if (!goog.isDef(opacity)) {
      opacity = 1;
    }
    var fillColor = goog.color.alpha.rgbaToRgbaStyle(rgb[0], rgb[1], rgb[2],
        opacity);
    fillStyle.setColor(fillColor);

    var lineDash;
    if (this.get('linestyle')) {
      switch (this.get('linestyle')) {
        case 'dashed':
          lineDash = [10, 10];
          break;
        case 'dotted':
          lineDash = [1, 6];
          break;
      }
    }

    var stroke;

    if (this.get('stroke') > 0) {
      stroke = new ol.style.Stroke({
        color: color,
        width: this.get('stroke'),
        lineDash: lineDash
      });
    }
    var imageOptions = {
      fill: fillStyle,
      stroke: new ol.style.Stroke({
        color: color,
        width: this.get('size') / 7
      }),
      radius: this.get('size')
    };
    var image = null;
    if (this.get('symbolId')) {
      goog.object.extend(imageOptions, {
        src: symbolUrl + this.get('symbolId'),
        scale: this.get('size') / 100,
        rotation: this.get('angle')
      });
      image = new ol.style.Icon(imageOptions);
    } else {
      var shape = this.get('shape');
      if (!shape) {
        this.set('shape', 'circle');
        shape = 'circle';
      }
      if (shape === 'circle') {
        image = new ol.style.Circle(imageOptions);
      } else if (shape === 'square') {
        goog.object.extend(imageOptions, ({
          points: 4,
          angle: Math.PI / 4,
          rotation: this.get('angle')
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (shape === 'triangle') {
        goog.object.extend(imageOptions, ({
          points: 3,
          angle: Math.PI / 4,
          rotation: this.get('angle')
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (shape === 'star') {
        goog.object.extend(imageOptions, ({
          points: 5,
          angle: Math.PI / 4,
          rotation: this.get('angle'),
          radius2: this.get('size')
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      } else if (this.get('shape') == 'cross') {
        goog.object.extend(imageOptions, ({
          points: 4,
          angle: Math.PI / 4,
          rotation: this.get('angle'),
          radius2: 0
        }));
        image = new ol.style.RegularShape(
            /** @type {olx.style.RegularShapeOptions} */ (imageOptions));
      }
    }

    if (this.get('isLabel')) {
      return [new ol.style.Style({
        text: new ol.style.Text(/** @type {olx.style.TextOptions} */ ({
          text: this.get('name'),
          font: this.get('size') + 'px Sans-serif',
          rotation: this.get('angle'),
          fill: new ol.style.Fill({
            color: color
          }),
          stroke: new ol.style.Stroke({
            color: 'white',
            width: 2
          })
        }))
      })];
    } else {
      styles.push(new ol.style.Style({
        image: image,
        fill: fillStyle,
        stroke: stroke
      }));
    }

    return styles;
  };
};

app.module.service('appMymaps', app.Mymaps);
