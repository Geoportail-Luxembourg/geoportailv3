/**
 * @fileoverview This file defines the mymaps webservice. this service
 * interacts with the Geoportail MyMaps webservice and exposes functions that
 * return objects representing maps and features.
 */

goog.provide('app.Mymaps');

goog.require('app.module');
goog.require('app.NotifyNotificationType');
goog.require('goog.array');
goog.require('goog.color');
goog.require('goog.object');
goog.require('ol.format.GeoJSON');
goog.require('ol.geom');
goog.require('ol.proj');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Icon');
goog.require('ol.style.RegularShape');
goog.require('ol.style.Text');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');


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
 * @param {ngeo.map.BackgroundLayerMgr} ngeoBackgroundLayerMgr The background layer
 * manager.
 * @param {ngeo.offline.NetworkStatus} ngeoNetworkStatus ngeo Network Status.
 * @param {string} arrowUrl URL to the arrow.
 * @param {string} arrowModelUrl URL to the Cesium arrow model.
 * @ngInject
 */
app.Mymaps = function($http, mymapsMapsUrl, mymapsUrl, appStateManager,
    appUserManager, appNotify, appGetLayerForCatalogNode, gettextCatalog,
    appThemes, appTheme, ngeoBackgroundLayerMgr, ngeoNetworkStatus, arrowUrl, arrowModelUrl) {
  /**
   * @type {string}
   * @private
   */
  this.arrowUrl_ = arrowUrl;

  /**
   * @type {string}
   * @private
   */
  this.arrowModelUrl_ = arrowModelUrl;

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
   * @type {ngeo.map.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @type {ngeo.offline.NetworkStatus}
   * @private
   */
  this.ngeoNetworkStatus_ = ngeoNetworkStatus;

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
  this.mymapsUserCategoriesUrl_ = mymapsUrl + '/get_users_categories';

  /**
   * @type {string}
   * @private
   */
  this.mymapsCategoriesUrl_ = mymapsUrl + '/categories';

  /**
   * @type {string}
   * @private
   */
  this.mymapsAllCategoriesUrl_ = mymapsUrl + '/allcategories';

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
  this.mymapsDeleteFeaturesUrl_ = mymapsUrl + '/delete_all_features/';

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
  this.mymapsSaveFeatureOrderUrl_ = mymapsUrl + '/save_order/';

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
   * Whether the map is editable by the current user.
   * @type {boolean}
   */
  this.mapIsEditable = false;

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
  this.mapBgLayer = 'topogr_global';

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
   * The list of all existing categories objects.
   * @type {?Array.<Object>}
   */
  this.allcategories = null;

  /**
   * The raw response data of the map info query.
   * @type {?Object}
   */
  this.mapInfo_ = null;

  /**
   * The raw response data of the map features query.
   * @type {?Object}
   */
  this.mapFeatures_ = null;

  /**
   * @const
   * @private
   */
  this.V2_BGLAYER_TO_V3_ = {
    'webbasemap': 'basemap_2015_global',
    'pixelmaps-color': 'topogr_global',
    'pixelmaps-gray': 'topo_bw_jpeg',
    'streets': 'streets_jpeg',
    'voidlayer': 'blank',
    'voidLayer': 'blank'
  };

  this.loadAllCategories();
};


/**
 * @return {?Object} The raw response data of the map info query.
 */
app.Mymaps.prototype.getMapInfo = function() {
  return this.mapInfo_;
};


/**
 * @return {?Object} The raw response data of the map features query.
 */
app.Mymaps.prototype.getMapFeatures = function() {
  return this.mapFeatures_;
};


/**
 * @param {?number} categoryId the category id to get a category for
 * @return {?Object} The category.
 */
app.Mymaps.prototype.getCategory = function(categoryId) {
  if (goog.isDefAndNotNull(categoryId)) {
    return goog.array.find(this.allcategories, function(category) {
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

  return this.loadMapInformation().then(goog.bind(function(mapinformation) {
    if (mapinformation !== null) {
      return this.loadFeatures_().then(goog.bind(function(features) {
        return this.setFeatures(features, collection);
      }, this));
    }
    return null;
  }, this));
};

/**
 * Fill a collection of features with features objects.
 * @param {app.MapsResponse} features An array of feature object.
 * @param {ol.Collection} collection The collection of features to fill.
 * @return {ol.Collection} a collection of features with the new features.
 */
app.Mymaps.prototype.setFeatures = function(features, collection) {
  if (features !== null) {
    var encOpt = /** @type {olx.format.ReadOptions} */ ({
      dataProjection: 'EPSG:2169',
      featureProjection: this.mapProjection
    });

    var featureStyleFunction = this.createStyleFunction(this.map);
    var jsonFeatures = (new ol.format.GeoJSON()).
        readFeatures(features, encOpt);
    goog.array.forEach(jsonFeatures, function(feature) {
      feature.set('altitudeMode', 'clampToGround');
      feature.set('__map_id__', this.getMapId());
      feature.setStyle(featureStyleFunction);
    }, this);

    collection.extend(
        /** @type {!Array<(null|ol.Feature)>} */ (jsonFeatures));
  }
  return collection;
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
  this.mapBgLayer = 'topogr_global';
  this.mapBgOpacity = 1;
  this.mapLayers = [];
  this.mapLayersOpacities = [];
  this.mapLayersVisibilities = [];
  this.mapLayersIndicies = [];
  this.mapIsEditable = false;
};


/**
 * @return {boolean} Return true if is editable by the user
 */
app.Mymaps.prototype.isEditable = function() {
  if (this.isMymapsSelected() && this.appUserManager_.isAuthenticated() &&
      this.mapIsEditable && !this.ngeoNetworkStatus_.isDisconnected()) {
    return true;
  }
  return false;
};


/**
 * Get the categories available for each user that the connected user can see.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.getUsersCategories = function() {
  var url = this.mymapsUserCategoriesUrl_;
  return this.$http_.get(url).then(
      function(resp) {
        return resp.data;
      }.bind(this));
};

/**
 * Get an array of map objects.
 * @param {?string} owner The map owner to restrict.
 * @param {?number} categoryId The category to restrict.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.getMaps = function(owner, categoryId) {
  var url = this.mymapsMapsUrl_;
  var params = {};
  if (owner !== null) {
    params['owner'] = owner;
  }
  if (categoryId !== null) {
    params['category'] = categoryId;
  }

  return this.$http_.get(url, {params: params}).then(goog.bind(
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
 * Load the permissible categories from the webservice.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadAllCategories = function() {
  return this.$http_.get(this.mymapsAllCategoriesUrl_).then(goog.bind(
      /**
         * @param {angular.$http.Response} resp Ajax response.
         * @return {app.MapsResponse} The "mymaps" web service response.
         */
      function(resp) {
        this.allcategories = resp.data;
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
        this.mapFeatures_ = resp.data;
        return resp.data;
      }, this), goog.bind(
      function(error) {
        var msg;
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        } else if (error.status == 404) {
          msg = this.gettextCatalog.getString(
            'La carte demandée n\'existe pas.');
          this.notify_(msg, app.NotifyNotificationType.WARNING);
          return null;
        }
        msg = this.gettextCatalog.getString(
          'Erreur inattendue lors du chargement de votre carte.');
        this.notify_(msg, app.NotifyNotificationType.ERROR);
        return null;
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
    }, this));
  }, this));
};


/**
 * Load the map information.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.loadMapInformation = function() {
  return this.getMapInformation().then(
      goog.bind(function(mapinformation) {
        return this.setMapInformation(mapinformation);
      }, this));
};


/**
 * FIXME
 * @param {Object} mapinformation any
 * @return {Object} mapinformation any
 */
app.Mymaps.prototype.setMapInformation = function(mapinformation) {
  if (mapinformation !== null) {
    this.mapDescription = mapinformation['description'];
    this.mapTitle = mapinformation['title'];
    this.mapOwner = mapinformation['user_login'];
    this.mapIsPublic = mapinformation['public'];
    this.mapCategoryId = mapinformation['category_id'];
    this.mapBgLayer = mapinformation['bg_layer'];
    this.mapTheme = mapinformation['theme'];
    this.mapIsEditable = mapinformation['is_editable'];

    if (!this.mapBgLayer) {
      if (this.mapTheme === 'tourisme') {
        this.mapBgLayer = 'topo_bw_jpeg';
      } else {
        this.mapBgLayer = 'topogr_global';
      }
      mapinformation['bg_layer'] = this.mapBgLayer;
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
  }
  this.updateLayers();
  this.layersChanged = false;
  return mapinformation;
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
        this.mapInfo_ = resp.data;
        return resp.data;
      }, this), goog.bind(
      function(error) {
        var msg;
        if (error.status == 401) {
          this.notifyUnauthorized();
          return null;
        } else if (error.status == 404) {
          msg = this.gettextCatalog.getString(
            'La carte demandée n\'existe pas.');
          this.notify_(msg, app.NotifyNotificationType.WARNING);
          return null;
        }
        msg = this.gettextCatalog.getString(
          'Erreur inattendue lors du chargement de votre carte.');
        this.notify_(msg, app.NotifyNotificationType.ERROR);
        return null;
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
        return [];
      }, this)
  );
};


/**
 * Delete all features of a map.
 * @param {string} mapId The map id of the features to delete.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteAllFeaturesAMap = function(mapId) {
  return this.$http_.delete(this.mymapsDeleteFeaturesUrl_ + mapId).then(
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
            'Erreur inattendue lors de la suppression des objets de la carte.');
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
 * Delete all the features of the current map.
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.deleteMapFeatures = function() {
  return this.deleteAllFeaturesAMap(this.mapId_);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
        return [];
      }, this)
  );
    };


/**
 * Save features order into a map.
 * @param {Array<ol.Feature>} features The feature to save
 * @return {angular.$q.Promise} Promise.
 */
app.Mymaps.prototype.saveFeaturesOrder = function(features) {

  var orders = [];
  goog.array.forEach(features, function(feature) {
    orders.push({'fid': feature.get('fid'),
      'display_order': feature.get('display_order')});
  }, this);

  var req = $.param({
    'orders': JSON.stringify(orders)
  });
  var config = {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  };
  return this.$http_.post(this.mymapsSaveFeatureOrderUrl_ + this.mapId_,
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
        this.notify_(msg, app.NotifyNotificationType.ERROR);
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
  this.notify_(msg, app.NotifyNotificationType.WARNING);
};


/**
 * @return {boolean} Return true if a map is selected.
 */
app.Mymaps.prototype.isMymapsSelected = function() {
  return !!this.mapId_;
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

      var coordinates;
      if (geom instanceof ol.geom.LineString) {
        coordinates = geom.getCoordinates();
        return new ol.geom.MultiPoint(coordinates);
      } else if (geom instanceof ol.geom.Polygon) {
        coordinates = geom.getCoordinates()[0];
        return new ol.geom.MultiPoint(coordinates);
      } else {
        return geom;
      }
    }
  });

  var fillStyle = new ol.style.Fill();
  var symbolUrl = this.mymapsSymbolUrl_;
  var arrowUrl = this.arrowUrl_;
  const arrowModelUrl = this.arrowModelUrl_;

  const colorStringToRgba = (colorString, opacity = 1) => {
    const color = goog.color.hexToRgb(colorString);
    color.push(opacity);
    return color;
  };

  return function(resolution) {

    // clear the styles
    styles.length = 0;

    if (this.get('__editable__') && this.get('__selected__')) {
      styles.push(vertexStyle);
    }
    var order = this.get('display_order');
    if (order === undefined) {
      order = 0;
    }
    // goog.asserts.assert(goog.isDef(this.get('__style__'));
    var color = this.get('color') || '#FF0000';
    var rgbColor = colorStringToRgba(color, 1);
    var opacity = this.get('opacity');
    if (!goog.isDef(opacity)) {
      opacity = 1;
    }
    var rgbaColor = goog.array.clone(rgbColor);
    rgbaColor[3] = opacity;

    fillStyle.setColor(rgbaColor);
    if (this.getGeometry().getType() === ol.geom.GeometryType.LINE_STRING &&
        this.get('showOrientation') === true) {
      var prevArrow, distance;
      var arrowColor = this.get('arrowcolor');
      if (arrowColor === undefined || arrowColor === null) {
        arrowColor = color;
      }
      this.getGeometry().forEachSegment(function(start, end) {
        var arrowPoint = new ol.geom.Point(
            [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]);
        var dx = end[0] - start[0];
        var dy = end[1] - start[1];

        if (prevArrow != undefined) {
          var pt1 = curMap.getPixelFromCoordinate(arrowPoint.getCoordinates()),
              pt2 = curMap.getPixelFromCoordinate(prevArrow.getCoordinates()),
              w = pt2[0] - pt1[0],
              h = pt2[1] - pt1[1];
          distance = Math.sqrt(w * w + h * h);
        }
        if (!prevArrow || distance > 600) {
          var src = arrowUrl + '?color=' + arrowColor.replace('#', '');
          const rotation =  Math.PI / 2 - Math.atan2(dy, dx);
          // arrows
          styles.push(new ol.style.Style({
            geometry: arrowPoint,
            zIndex: order,
            image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
              rotation,
              src
            }))
          }));
          const modelColor = colorStringToRgba(arrowColor, 1);
          arrowPoint.set('olcs_model', () => {
            const coordinates = arrowPoint.getCoordinates();
            const center = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326');
            return {
              cesiumOptions: {
                url: arrowModelUrl,
                // Adding a tiny translation along Z would allow the arrows not to sink into the terrain.
                // However it does not work, the model is always clamped to the ground.
                modelMatrix: olcs.core.createMatrixAtCoordinates(center, rotation),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                minimumPixelSize: 80,
                color: olcs.core.convertColorToCesium(modelColor)
                // It would be great to have a silouhette around the 3d arrow to better distinguish it from the underlying line.
                // But for some reason Cesium is throwing an error with the model we are using.
                // silhouetteColor: Cesium.Color.WHITE,
                // silhouetteSize: 3
              }
            };
          });
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
          break;
      }
    }

    var stroke;
    var featureStroke = this.get('stroke');
    if (featureStroke > 0) {
      if (!this.get('__editable__') && this.get('__selected__')) {
        featureStroke = featureStroke + 3;
      }
      stroke = new ol.style.Stroke({
        color: rgbColor,
        width: featureStroke,
        lineDash: lineDash
      });
    }

    var featureSize = this.get('size');
    if (!this.get('__editable__') && this.get('__selected__')) {
      featureSize = featureSize + 3;
    }
    var imageOptions = {
      fill: fillStyle,
      stroke: new ol.style.Stroke({
        color: rgbColor,
        width: featureSize / 7
      }),
      radius: featureSize
    };
    var image = null;
    if (this.get('symbolId')) {
      goog.object.extend(imageOptions, {
        src: symbolUrl + this.get('symbolId') + '?scale=' + featureSize,
        scale: 1,
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
          radius2: featureSize
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
          textAlign: 'left',
          font: 'normal ' + featureSize + 'px Sans-serif',
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
        stroke: stroke,
        zIndex: order
      }));
    }

    return styles;
  };
};

app.module.service('appMymaps', app.Mymaps);
