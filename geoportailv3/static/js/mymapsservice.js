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
 * @param {angular.$http} $http The angular http service.
 * @param {string} mymapsMapsUrl URL to "mymaps" Maps service.
 * @param {string} mymapsUrl URL to "mymaps" Features service.
 * @param {app.StateManager} appStateManager The state manager service.
 * @param {app.UserManager} appUserManager The user manager service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.GetLayerForCatalogNode} appGetLayerForCatalogNode Function to
 *     create layers from catalog nodes.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {app.Themes} appThemes The themes service.
 * @param {app.Theme} appTheme The theme service.
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr The background layer
 * manager.
 * @ngInject
 */
app.Mymaps = function($http, mymapsMapsUrl, mymapsUrl, appStateManager,
    appUserManager, appNotify, appGetLayerForCatalogNode, gettextCatalog,
    appThemes, appTheme, ngeoBackgroundLayerMgr) {

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
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

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
  this.mapBgLayer = 'blank';

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
    'pixelmaps-color': 'topogr_global',
    'pixelmaps-gray': 'topo_bw_jpeg',
    'streets': 'streets_jpeg',
    'voidlayer': 'blank',
    'voidLayer': 'blank'
  };

};


/**
 * @param {?number} categoryId the category id to get a category for
 * @return {?Object} The category.
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
 * @param {ol.Collection} collection The collection.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.setCurrentMapId = function(mapId, collection) {
  this.setMapId(mapId);

  return this.loadMapInformation().then(goog.bind(function() {
    return this.loadFeatures_().then(goog.bind(function(features) {
      var encOpt = /** @type {olx.format.ReadOptions} */ ({
        dataProjection: 'EPSG:2169',
        featureProjection: this.mapProjection
      });

      var featureStyleFunction = this.createStyleFunction(this.map);
      var jsonFeatures = (new ol.format.GeoJSON()).
          readFeatures(features, encOpt);
      goog.array.forEach(jsonFeatures, function(feature) {
        feature.set('__map_id__', this.getMapId());
        feature.set('__editable__', this.isEditable());
        feature.setStyle(featureStyleFunction);
      }, this);

      collection.extend(
          /** @type {!Array<(null|ol.Feature)>} */ (jsonFeatures));
      return collection;
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
  this.mapBgLayer = 'blank';
  this.mapBgOpacity = 1;
  this.mapLayers = [];
  this.mapLayersOpacities = [];
  this.mapLayersVisibilities = [];
  this.mapLayersIndicies = [];
};


/**
 * @return {boolean} Return true if is editable by the user
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
        goog.array.forEach(resp.data, function(map) {
          if (goog.isNull(map['update_date'])) {
            map['update_date'] = map['create_date'];
          }
        });
        return resp.data;
      }, this), goog.bind(
      function(error) {
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        }
        var msg = this.gettextCatalog.getString(
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
        var msg = this.gettextCatalog.getString(
            'Erreur inattendue lors du chargement de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * update the map with layers
 */
app.Mymaps.prototype.updateLayers = function() {
  var curBgLayer = this.mapBgLayer;
  this.appThemes_.getBgLayers().then(goog.bind(
      /**
       * @param {Array.<ol.layer.Base>} bgLayers The bg layer.
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
    this.appTheme_.setCurrentTheme(this.mapTheme, this.map);
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

          // remove layers with no name
          var iToRemove = [];
          this.mapLayers = goog.array.filter(this.mapLayers, function(item, i) {
            if (item.length === 0) {
              iToRemove.push(i);
              return false;
            }
            return true;
          }, this);
          goog.array.forEachRight(iToRemove, function(item) {
            if (this.mapLayersIndicies) {
              this.mapLayersIndicies.splice(item, 1);
            }
            if (this.mapLayersVisibilities) {
              this.mapLayersVisibilities.splice(item, 1);
            }
            if (this.mapLayersOpacities) {
              this.mapLayersOpacities.splice(item, 1);
            }
          }, this);
        } else {
          this.mapLayers = [];
          this.mapOpacities = [];
          this.mapVisibilities = [];
          this.mapLayersIndicies = [];
        }
        return mapinformation;
      }, this))
      .then(goog.bind(function(mapinformation) {
        this.updateLayers();
        this.layersChanged = false;
        return mapinformation;
      },this));
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
        var msg = this.gettextCatalog.getString(
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
      feature.get('fid')).then(goog.bind(
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

        var msg = this.gettextCatalog.getString(
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
        var msg = this.gettextCatalog.getString(
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
        var msg = this.gettextCatalog.getString(
            'Erreur inattendue lors de la copie de votre carte.');
        this.notify_(msg);
        return [];
      }, this));
    };


/**
 * Delete a map.
 * @param {string} mapId The map id to delete.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteAMap = function(mapId) {
  return this.$http_.delete(this.mymapsDeleteMapUrl_ + mapId).then(
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
        var msg = this.gettextCatalog.getString(
            'Erreur inattendue lors de la suppression de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Delete the current map.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteMap = function() {
  return this.deleteAMap(this.mapId_);
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
        var msg = this.gettextCatalog.getString(
            'Erreur inattendue lors de la mise à jour de votre carte.');
        this.notify_(msg);
        return [];
      }, this)
  );
    };


/**
 * Save the map environment.
 * @param {string} bgLayer The bg layer.
 * @param {string} bgOpacity The bg opacity.
 * @param {string} layers The layers.
 * @param {string} layers_opacity The layer opacity.
 * @param {string} layers_visibility The layer visibility.
 * @param {string} layers_indices The layer indices.
 * @param {string} theme The theme.
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
        var msg = this.gettextCatalog.getString(
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
        var msg = this.gettextCatalog.getString(
            'Erreur inattendue lors de la sauvegarde de votre modification.');
        this.notify_(msg);
        return [];
      }, this)
  );
};


/**
 * Save an array of features into the current map.
 * @param {Array.<ol.Feature>} features The features to save.
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
        var msg = this.gettextCatalog.getString(
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
  var msg = this.gettextCatalog.getString(
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
 * @param {ol.Map} curMap The current map.
 * @return {ol.FeatureStyleFunction} The Function to style.
 * @export
 */
app.Mymaps.prototype.createStyleFunction = function(curMap) {

  var styles = [];

  var vertexStyle = new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: 6,
      points: 4,
      angle: Math.PI / 4,
      fill: new ol.style.Fill({
        color: [255, 255, 255, 0.5]
      }),
      stroke: new ol.style.Stroke({
        color: [0, 0, 0, 1]
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
    var rgbColor = goog.color.hexToRgb(color);
    var opacity = this.get('opacity');
    if (!goog.isDef(opacity)) {
      opacity = 1;
    }
    var rgbaColor = goog.array.clone(rgbColor);
    rgbColor.push(1);
    rgbaColor.push(opacity);

    fillStyle.setColor(rgbaColor);
    if (this.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING &&
        this.get('showOrientation') === true) {
      var prevArrow, distance;
      this.getGeometry().forEachSegment(function(start, end) {
        var arrowPoint = new ol.geom.Point(
            [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]);
        var dx = end[0] - start[0];
        var dy = end[1] - start[1];

        var arrowOptions = {
          fill: new ol.style.Fill({
            color: rgbColor
          }),
          stroke: new ol.style.Stroke({
            color: rgbColor,
            width: 1
          }),
          radius: 10,
          points: 3,
          angle: 0,
          rotation: (90 * Math.PI / 180) + (-1 * Math.atan2(dy, dx))
        };

        if (prevArrow) {
          var pt1 = curMap.getPixelFromCoordinate(arrowPoint.getCoordinates()),
              pt2 = curMap.getPixelFromCoordinate(prevArrow.getCoordinates()),
              w = pt2[0] - pt1[0],
              h = pt2[1] - pt1[1];
          distance = Math.sqrt(w * w + h * h);
        }
        if (!prevArrow || distance > 40) {
          // arrows
          styles.push(new ol.style.Style({
            geometry: arrowPoint,
            image: new ol.style.RegularShape(arrowOptions)
          }));
          prevArrow = arrowPoint;
        }
      });
    }
    var lineDash;
    if (this.get('linestyle')) {
      switch (this.get('linestyle')) {
        case 'dashed':
          lineDash = [10, 10];
          break;
        case 'dotted':
          lineDash = [1, 6];
          break;
        default:
          lineDash = [1, 6];
          break;
      }
    }

    var stroke;

    if (this.get('stroke') > 0) {
      stroke = new ol.style.Stroke({
        color: rgbColor,
        width: this.get('stroke'),
        lineDash: lineDash
      });
    }
    var imageOptions = {
      fill: fillStyle,
      stroke: new ol.style.Stroke({
        color: rgbColor,
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
          angle: 0,
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
          angle: 0,
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
          textAlign: 'start',
          font: 'normal ' + this.get('size') + 'px Sans-serif',
          rotation: this.get('angle'),
          fill: new ol.style.Fill({
            color: rgbColor
          }),
          stroke: new ol.style.Stroke({
            color: [255, 255, 255],
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
