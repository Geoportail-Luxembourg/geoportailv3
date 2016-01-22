/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */
goog.provide('app.MymapsDirectiveController');
goog.provide('app.mymapsDirective');

goog.require('app');
goog.require('app.FeaturePopup');
goog.require('app.Mymaps');
goog.require('app.Notify');
goog.require('app.SelectedFeatures');
goog.require('app.Theme');
goog.require('app.UserManager');
goog.require('goog.array');
goog.require('ngeo.filereaderDirective');
goog.require('ngeo.modalDirective');
goog.require('ol.format.GPX');
goog.require('ol.format.GeoJSON');
goog.require('ol.format.KML');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @param {string} appMymapsTemplateUrl
 * @ngInject
 */
app.mymapsDirective = function(appMymapsTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'useropen': '=appMymapsUseropen',
      'drawopen': '=appMymapsDrawopen',
      'layersChanged': '=appMymapsLayersChanged',
      'map': '=appMymapsMap',
      'selectedLayers': '=appMymapsSelectedLayers'
    },
    controller: 'AppMymapsController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appMymapsTemplateUrl
  };
};


app.module.directive('appMymaps', app.mymapsDirective);


/**
 * @param {!angular.Scope} $scope Scope.
 * @param {angular.$compile} $compile The compile provider.
 * @param {gettext} gettext Gettext service.
 * @param {ngeo.BackgroundLayerMgr} ngeoBackgroundLayerMgr Background layer
 *     manager.
 * @param {app.Mymaps} appMymaps Mymaps service.
 * @param {app.Notify} appNotify Notify service.
 * @param {app.FeaturePopup} appFeaturePopup Feature popup service.
 * @param {app.SelectedFeatures} appSelectedFeatures Selected features service.
 * @param {app.Theme} appTheme the current theme service.
 * @param {app.UserManager} appUserManager
 * @param {app.DrawnFeatures} appDrawnFeatures Drawn features service.
 * @param {Document} $document Document.
 * @param {string} exportgpxkmlUrl URL to echo web service.
 * @constructor
 * @export
 * @ngInject
 */

app.MymapsDirectiveController = function($scope, $compile, gettext,
    ngeoBackgroundLayerMgr, appMymaps, appNotify, appFeaturePopup,
    appSelectedFeatures, appTheme, appUserManager, appDrawnFeatures,
    $document, exportgpxkmlUrl) {

  /**
   * @type {app.Theme}
   * @private
   */
  this.appTheme_ = appTheme;

  /**
   * @type {Array}
   * @private
   */
  this.selectedLayers_ = this['selectedLayers'];

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {ngeo.BackgroundLayerMgr}
   * @private
   */
  this.backgroundLayerMgr_ = ngeoBackgroundLayerMgr;

  /**
   * @private
   * @type {string}
   */
  this.exportgpxkmlUrl_ = exportgpxkmlUrl;

  /**
   * @export
   * @type {boolean}
   */
  this.fileReaderSupported = true;

  /**
   * @export
   * @type {string}
   */
  this.gpxFileContent = '';

  /**
   * @export
   * @type {string}
   */
  this.kmlFileContent = '';

  /**
   * @private
   * @type {Document}
   */
  this.$document_ = $document;

  /**
   * @private
   * @type {ol.format.KML}
   */
  this.kmlFormat_ = new ol.format.KML();

  /**
   * @private
   * @type {ol.format.GPX}
   */
  this.gpxFormat_ = new ol.format.GPX();

  /**
   * @type {Array.<ol.Feature>}
   * @export
   */
  this.featuresList = appDrawnFeatures.getArray();

  /**
   * @type {app.DrawnFeatures}
   * @private
   */
  this.drawnFeatures_ = appDrawnFeatures;

  /**
   * @type {app.UserManager}
   * @private
   */
  this.appUserManager_ = appUserManager;

  /**
   * @type {app.Mymaps}
   * @private
   */
  this.appMymaps_ = appMymaps;

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
   * If modal is open and what type it is
   * @type {string|undefined}
   * @export
   */
  this.modal = undefined;

  /**
   * Tells whether the 'creatingFromAnonymous' modal window is open or not.
   * @type {boolean}
   * @export
   */
  this.creatingFromAnonymous = false;

  /**
   * Tells whether the 'choosing a map' modal window is open or not.
   * @type {boolean}
   * @export
   */
  this.choosing = false;

  /**
   * List of Mymaps
   * @type {app.MapsResponse}
   * @export
   */
  this.maps = [];

  /**
   * String to be used in the title field in the modifying window.
   * Helps canceling modifications.
   * @type {string}
   * @export
   */
  this.newTitle = '';

  /**
   * String to be used in the description field in the modifying window.
   * Helps canceling modifications.
   * @type {string}
   * @export
   */
  this.newDescription = '';

  /**
   * ID to be used in the category field in the modifying window.
   * Helps canceling modifications.
   * @type {?number}
   * @export
   */
  this.newCategoryId = null;

  /**
   * Is Map public?
   * @type {boolean}
   * @export
   */
  this.newIsPublic = false;

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.selectedFeatures_ = appSelectedFeatures;

  /**
   * @type {Array.<ol.Feature>?}
   * @export
   */
  this.selectedFeaturesList = this.selectedFeatures_.getArray();

  /**
   * @type {app.FeaturePopup}
   * @private
   */
  this.featurePopup_ = appFeaturePopup;

  $scope.$watch(goog.bind(function() {
    return this.appUserManager_.getRoleId();
  }, this), goog.bind(function(newVal, oldVal) {
    if (goog.isDefAndNotNull(newVal)) {
      this.appMymaps_.loadCategories();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.kmlFileContent;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal) {
      this.importKml();
    }
  }, this));

  $scope.$watch(goog.bind(function() {
    return this.gpxFileContent;
  }, this), goog.bind(function(newVal, oldVal) {
    if (newVal) {
      this.importGpx();
    }
  }, this));
};


/**
 * Reset the layers & bglayer with the one of Mymaps.
 * @export
 */
app.MymapsDirectiveController.prototype.resetLayers = function() {
  goog.array.clear(this.selectedLayers_);
  this.appMymaps_.updateLayers();
};


/**
 * Save the current layers definition into Mymaps.
 * @return {angular.$q.Promise} Promise.
 * @export
 */
app.MymapsDirectiveController.prototype.saveLayers = function() {
  var bgLayer = /** @type {string} */
      (this.backgroundLayerMgr_.get(this.map_).get('label'));
  var bgOpacity = '1';
  var layersLabels = [];
  var layersOpacities = [];
  var layersVisibilities = [];
  var layersIndices = [];
  goog.array.forEach(this.selectedLayers_, function(item, index) {
    layersLabels.push(item.get('label'));
    layersOpacities.push('' + item.getOpacity());
    if (item.getOpacity() === 0) {
      layersVisibilities.push('false');
    } else {
      layersVisibilities.push('true');
    }
    layersIndices.push('' + index);
  });
  var promise = this.appMymaps_.updateMapEnv(bgLayer, bgOpacity,
      layersLabels.join(','), layersOpacities.join(','),
      layersVisibilities.join(','), layersIndices.join(','),
      this.appTheme_.getCurrentTheme())
  .then(goog.bind(function() {
        this.appMymaps_.loadMapInformation();
      },this));
  this['layersChanged'] = false;
  return promise;
};


/**
 * @param {boolean|undefined} value
 * @return {boolean|undefined}
 * @export
 */
app.MymapsDirectiveController.prototype.modalShownHidden = function(value) {
  if (goog.isDef(value) && value === false) {
    this.modal = undefined;
    return false;
  } else if (goog.isDef(this.modal)) {
    return true;
  }
};


/**
 * Copy the map.
 * @export
 */
app.MymapsDirectiveController.prototype.openCopyMapModal = function() {
  this.newTitle = this.appMymaps_.mapTitle;
  this.newDescription = this.appMymaps_.mapDescription;
  this.modal = 'COPYING';
};


/**
 * Copy the map.
 * @export
 */
app.MymapsDirectiveController.prototype.copyMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.copyMap(
        this.newTitle,
        this.newDescription,
        this.newCategoryId,
        this.newIsPublic
    ).then(goog.bind(function(resp) {
      if (goog.isNull(resp)) {
        this.askToConnect();
      } else {
        var mapId = resp['uuid'];
        if (goog.isDef(mapId)) {
          var map = {'uuid': mapId};
          this.onChosen(map, false);
          var msg = this.gettext_('Carte copiée');
          this.notify_(msg);
          this.modal = undefined;
        }}}, this));
  }
};


/**
 * Export a Gpx file.
 * @export
 */
app.MymapsDirectiveController.prototype.exportGpx = function() {
  var features = this.drawnFeatures_.getCollection();
  var mymapsFeatures = features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });
  var gpx = this.gpxFormat_.writeFeatures(mymapsFeatures, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  gpx = gpx.replace('<gpx ',
    '<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.1" ');
  this.exportFeatures_(gpx, 'gpx',
      this.sanitizeFilename_(this.appMymaps_.mapTitle));
};


/**
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 * @private
 */
app.MymapsDirectiveController.prototype.sanitizeFilename_ = function(name) {
  name = name.replace(/\s+/gi, '_'); // Replace white space with _.
  return name.replace(/[^a-zA-Z0-9\-]/gi, ''); // Strip any special charactere.
};


/**
 * Import a GPX file.
 * @export
 */
app.MymapsDirectiveController.prototype.importGpx = function() {
  var gpxFeatures = (this.gpxFormat_.readFeatures(this.gpxFileContent, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  }));
  var mapId = this.appMymaps_.getMapId();
  goog.array.forEach(gpxFeatures, function(feature) {
    feature.set('__map_id__', mapId);

    if (feature.getId()) {
      feature.setId(undefined);
    }
  });

  this.appMymaps_.saveFeatures(gpxFeatures).then(
      goog.bind(function() {
        var map = {'uuid': mapId};
        this.onChosen(map, false);
      }, this)
  );
};


/**
 * Export a KML file.
 * @export
 */
app.MymapsDirectiveController.prototype.exportKml = function() {
  var features = this.drawnFeatures_.getCollection();
  var mymapsFeatures = features.getArray().filter(function(feature) {
    return !!feature.get('__map_id__');
  });
  var kml = this.kmlFormat_.writeFeatures(mymapsFeatures, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  });
  this.exportFeatures_(kml, 'kml',
      this.sanitizeFilename_(this.appMymaps_.mapTitle));
};


/**
 * Import a KML file.
 * @export
 */
app.MymapsDirectiveController.prototype.importKml = function() {
  var kmlFeatures = (this.kmlFormat_.readFeatures(this.kmlFileContent, {
    dataProjection: 'EPSG:4326',
    featureProjection: this['map'].getView().getProjection()
  }));
  var mapId = this.appMymaps_.getMapId();
  goog.array.forEach(kmlFeatures, function(feature) {
    feature.set('__map_id__', mapId);
    if (feature.getId()) {
      feature.setId(undefined);
    }
  });

  this.appMymaps_.saveFeatures(kmlFeatures).then(
      goog.bind(function() {
        var map = {'uuid': mapId};
        this.onChosen(map, false);
      }, this)
  );
};


/**
 * Close the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.closeMap = function() {
  this.drawnFeatures_.clearMymapsFeatures();
  this.selectedFeatures_.clear();
  this['layersChanged'] = false;
};


/**
 * Closes the current anonymous drawing.
 * @export
 */
app.MymapsDirectiveController.prototype.closeAnonymous = function() {
  this.drawnFeatures_.clearAnonymousFeatures();
  this.selectedFeatures_.clear();
};


/**
 * Open the dialog to create a new new map from an anoymous drawing.
 * @export
 */
app.MymapsDirectiveController.prototype.openNewMapFromAnonymous = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.creatingFromAnonymous = true;
  }
};


/**
 * Add the anonymous drawing into the current map
 * @export
 */
app.MymapsDirectiveController.prototype.addInMymaps = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    if (this.isMymapsSelected()) {
      this.drawnFeatures_.moveAnonymousFeaturesToMymaps().then(
          goog.bind(function(mapinformation) {
            var mapId = this.appMymaps_.getMapId();
            var map = {'uuid': mapId};
            this.onChosen(map, false);
          }, this));
    }
  }
};


/**
 * Create a map from an anonymous drawing.
 * @export
 */
app.MymapsDirectiveController.prototype.createMapFromAnonymous = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.createMap(this.newTitle, this.newDescription,
        this.newCategoryId, this.newIsPublic)
        .then(goog.bind(function(resp) {
          if (goog.isNull(resp)) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (goog.isDef(mapId)) {
              this['drawopen'] = true;
              this.appMymaps_.setMapId(mapId);
              return this.saveLayers();
            }}}, this))
        .then(goog.bind(function(mapinformation) {
          return this.drawnFeatures_.moveAnonymousFeaturesToMymaps();
        }, this))
        .then(goog.bind(function(mapinformation) {
          var map = {'uuid': this.appMymaps_.getMapId()};
          this.onChosen(map, false);
          var msg = this.gettext_('Carte créée');
          this.notify_(msg);
          this.creatingFromAnonymous = false;
        }, this));
  }
};


/**
 * Returns if a mymaps is selected or not.
 * @return {boolean} Returns true if a mymaps is selected.
 * @export
 */
app.MymapsDirectiveController.prototype.isMymapsSelected = function() {
  return this.appMymaps_.isMymapsSelected();
};


/**
 * @return {string} Returns the description.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapDescription = function() {
  return this.appMymaps_.mapDescription;
};


/**
 * @return {string} Returns the title.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapTitle = function() {
  return this.appMymaps_.mapTitle;
};


/**
 * @return {string} Returns the map owner.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapOwner = function() {
  return this.appMymaps_.mapOwner;
};


/**
 * @param {?number} id
 * @return {Object} returns the category name
 * @export
 */
app.MymapsDirectiveController.prototype.getMapCategory = function(id) {
  var category = this.appMymaps_.getCategory(id);
  if (goog.isDefAndNotNull(category)) {
    return category;
  } else {
    return {
      'id': null,
      'name': this.gettext_('Please select a Category')
    };
  }
};


/**
 * @return {Object} returns the categories object
 * @export
 */
app.MymapsDirectiveController.prototype.getCategories = function() {
  return this.appMymaps_.categories;
};


/**
 * Open a map. Actually opens the map selector.
 * @export
 */
app.MymapsDirectiveController.prototype.openChooseMapModal = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    this.appMymaps_.getMaps().then(goog.bind(function(mymaps) {
      if (goog.isNull(mymaps)) {
        this.askToConnect();
      } else if (!goog.array.isEmpty(mymaps)) {
        this.choosing = true;
        this.maps = mymaps;
      } else {
        this.notify_(this.gettext_(
            'You have no existing Maps, please create a New Map'
            ));
      }
    }, this));
  }
};


/**
 * Opens Create Map Dialog
 * @export
 */
app.MymapsDirectiveController.prototype.openCreateMapModal = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  }else {
    this.modal = 'CREATE';
    this.newTitle = this.gettext_('Map without Title');
    this.newDescription = '';
    this.newCategoryId = null;
    this.newIsPublic = false;
  }
};


/**
 *  Open the modification modal
 * @export
 */
app.MymapsDirectiveController.prototype.openModifyMapModal = function() {
  if (this.appMymaps_.isEditable()) {
    this.newTitle = this.appMymaps_.mapTitle;
    this.newDescription = this.appMymaps_.mapDescription;
    this.newCategoryId = this.appMymaps_.mapCategoryId;
    this.newIsPublic = this.appMymaps_.mapIsPublic;
    this.modal = 'MODIFY';
  }
};


/**
 * @return {boolean} Returns whether the map is public or not.
 * @export
 */
app.MymapsDirectiveController.prototype.getMapIsPublic = function() {
  return this.appMymaps_.mapIsPublic;
};


/**
 * Creates and load a new map.
 * @export
 */
app.MymapsDirectiveController.prototype.createMap = function() {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  }else {
    this.appMymaps_.createMap(
        this.newTitle,
        this.newDescription,
        this.newCategoryId,
        this.newIsPublic
    )
      .then(goog.bind(function(resp) {
          this.modal = 'CREATE';
          if (goog.isNull(resp)) {
            this.askToConnect();
          } else {
            var mapId = resp['uuid'];
            if (goog.isDef(mapId)) {
              var map = {'uuid': mapId};
              this.appMymaps_.setMapId(mapId);
              this.saveLayers();
              this.onChosen(map, false);
              var msg = this.gettext_('Nouvelle carte créée');
              this.notify_(msg);
              this.modal = undefined;
            }
          }}, this));
  }
};


/**
 * Delete a map.
 * @param {string} mapId The map id to delete.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteAMap = function(mapId) {
  if (!this.appUserManager_.isAuthenticated()) {
    this.askToConnect();
  } else {
    if (this.appMymaps_.getMapId() === mapId) {
      this.closeMap();
    }
    this.appMymaps_.deleteAMap(mapId).then(goog.bind(function(resp) {
      if (goog.isNull(resp)) {
        this.askToConnect();
      } else {
        goog.array.remove(this.maps,
            goog.array.find(this.maps, goog.bind(function(item) {
              if (item['uuid'] === mapId) {
                return true;
              }
            }, this)));
      }
    }, this));
  }
};


/**
 * Delete the current map.
 * @export
 */
app.MymapsDirectiveController.prototype.deleteMap = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    } else {
      this.appMymaps_.deleteMap().then(goog.bind(function(resp) {
        if (goog.isNull(resp)) {
          this.askToConnect();
        } else {
          this.closeMap();
        }
      }, this));
    }
  }
};


/**
 * Notify the user he has to connect
 * @export
 */
app.MymapsDirectiveController.prototype.askToConnect = function() {
  var msg = this.gettext_(
      'Veuillez vous identifier afin d\'accéder à vos cartes'
      );
  this.notify_(msg);
  this['useropen'] = true;
};


/**
 * Called when a map is choosen.
 * @param {Object} map The selected map.
 * @param {boolean} clear It removes the alreay selected layers.
 * @return {angular.$q.Promise} Promise.
 * @export
 */
app.MymapsDirectiveController.prototype.onChosen = function(map, clear) {
  this.closeMap();
  if (clear) {
    this.map_.getLayers().clear();
  }
  var promise = this.appMymaps_.setCurrentMapId(map['uuid'],
      this.drawnFeatures_.getCollection());
  this['drawopen'] = true;
  this.choosing = false;
  return promise;
};


/**
 * Is the map editable
 * @return {boolean}
 * @export
 */
app.MymapsDirectiveController.prototype.isEditable = function() {
  return this.appMymaps_.isEditable();
};


/**
 * Saves the modifications made using the modification modal.
 * @export
 */
app.MymapsDirectiveController.prototype.saveModifications = function() {
  if (this.appMymaps_.isEditable()) {
    if (!this.appUserManager_.isAuthenticated()) {
      this.askToConnect();
    }else {
      this.appMymaps_.updateMap(
          this.newTitle,
          this.newDescription,
          this.newCategoryId,
          this.newIsPublic
      )
        .then(
          goog.bind(function(mymaps) {
            if (goog.isNull(mymaps)) {
              this.askToConnect();
            } else {
              this.modal = undefined;
            }
          }, this));
    }
  }
};


/**
 * Return feature type as a string
 * @param {ol.Feature} feature
 * @return {string}
 * @export
 */
app.MymapsDirectiveController.prototype.getFeatureType = function(feature) {
  return feature.getGeometry().getType();
};


/**
 * Get a features Array with the Mymaps features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
app.MymapsDirectiveController.prototype.getMymapsFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return !!feature.get('__map_id__');
  });
};


/**
 * Get a features Array with the anonymous features.
 * @return {Array.<ol.Feature>?} The features array.
 * @export
 */
app.MymapsDirectiveController.prototype.getAnonymousFeatures = function() {
  return this.featuresList.filter(function(feature) {
    return !feature.get('__map_id__');
  });
};


/**
 * Selects feature.
 * @param {ol.Feature} feature
 * @export
 */
app.MymapsDirectiveController.prototype.selectFeature = function(feature) {
  this.selectedFeatures_.clear();
  this.selectedFeatures_.push(feature);

  this.featurePopup_.show(feature, this.map_);
};


/**
 * @param {string} doc The document to export/download.
 * @param {string} format The document format.
 * @param {string} filename File name for the exported document.
 * @private
 */
app.MymapsDirectiveController.prototype.exportFeatures_ =
    function(doc, format, filename) {
  var formatInput = $('<input>').attr({
    type: 'hidden',
    name: 'format',
    value: format
  });
  var nameInput = $('<input>').attr({
    type: 'hidden',
    name: 'name',
    value: filename
  });
  var docInput = $('<input>').attr({
    type: 'hidden',
    name: 'doc',
    value: doc
  });
  var form = $('<form>').attr({
    method: 'POST',
    action: this.exportgpxkmlUrl_
  });
  form.append(formatInput, nameInput, docInput);
  angular.element(this.$document_[0].body).append(form);
  form[0].submit();
  form.remove();
};

app.module.controller('AppMymapsController', app.MymapsDirectiveController);
