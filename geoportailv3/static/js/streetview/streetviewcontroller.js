/**
 * @fileoverview This file provides a streetview overview.
 *
 * Example:
 *  <app-streetview
 *   app-streetview-map="::ctrl.map"
 *   app-streetview-location="ctrl.clickCoordinate">
 *  </app-streetview>
 *
 */
goog.provide('app.streetview.StreetviewController');

goog.require('app.module');
goog.require('ol');
goog.require('ol.geom.Point');
goog.require('ol.interaction');
goog.require('ol.style');


/**
 * @ngInject
 * @constructor
 * @param {angular.JQLite} $element Element.
 * @param {angular.Scope} $scope Scope.
 * @param {ngeo.map.FeatureOverlayMgr} ngeoFeatureOverlayMgr Ngeo FeatureOverlay
 *     manager.
 * @param {string} appImagesPath Path to the images folder.
 * @param {app.LocationInfoOverlay} appLocationInfoOverlay The overlay.
 * @param {app.Activetool} appActivetool The activetool service.
 * @param {angular.$window} $window Window.
 * @export
 */
app.streetview.StreetviewController = function($element, $scope, ngeoFeatureOverlayMgr,
    appImagesPath, appLocationInfoOverlay, appActivetool, $window) {
  /**
   * @type {angular.$window}
   * @private
   */
  this.window_ = $window;

  /**
   * @type {app.Activetool}
   * @private
   */
  this.appActivetool_ = appActivetool;

  /**
   * @type {app.LocationInfoOverlay}
   * @private
   */
  this.locationInfoOverlay_ = appLocationInfoOverlay;

  this['uid'] = goog.getUid(this);

  /**
   * @type {string}
   * @private
   */
  this.arrowPath_ = appImagesPath + '/arrow_sv.png';

  /**
   * @type {string}
   * @private
   */
  this.directionArrowPath_ = appImagesPath + '/direction_sv.png';

  /**
   * @type {string}
   * @private
   */
  this.appImagesPath_ = appImagesPath;

  /**
   * @type {angular.JQLite}
   * @private
   */
  this.element_ = $element;


  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {number}
   * @export
   */
  this.radius = 90;


  /**
   * @type {!ol.Feature}
   * @private
   */
  this.feature_ = new ol.Feature();

  /**
   * @type {ngeo.map.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  /**
   * @type {ol.Collection<ol.Feature>}
   * @private
   */
  this.features_ = new ol.Collection();
  this.featureOverlay_.setFeatures(this.features_);

  /**
   * @type {Array.<!ol.EventsKey>}
   * @private
   */
  this.listenerKeys_ = [];

  /**
   * The current location in the OpenLayers' map view projection.
   * @type {?ol.Coordinate}
   * @export
   */
  this.location;

  /**
   * @type {boolean}
   * @private
   */
  this.isInitialised_ = false;

  /**
   * Flag that determines whether there's data at a given location or not.
   * @type {boolean}
   * @export
   */
  this.noDataAtLocation = false;

  /**
   * @type {?google.maps.StreetViewPanorama}
   * @private
   */
  this.panorama_ = null;

  /**
   * @type {?google.maps.MapsEventListener}
   * @private
   */
  this.panoramaListener_ = null;

  /**
   * @type {?google.maps.MapsEventListener}
   * @private
   */
  this.panoramaPovListener_ = null;

  /**
   * @type {?google.maps.MapsEventListener}
   * @private
   */
  this.panoramaLinksListener_ = null;

  /**
   * @type {?google.maps.MapsEventListener}
   * @private
   */
  this.panoramaPanoListener_ = null;

  /**
   * @type {ol.geom.Point}
   * @private
   */
  this.point_ = new ol.geom.Point([0, 0]);

  this.feature_.setGeometry(this.point_);

  /**
   * @type {?google.maps.StreetViewService}
   * @private
   */
  this.streetViewService_ = null;

  /**
   * @type {boolean}
   * @private
   */
  this.panoramaPositionChanging_ = false;

  /**
   * @type {ol.interaction.Select}
   * @private
   */
  this.selectSingleClick_ = new ol.interaction.Select({
    filter: function(feature, layer) {
      return this.features_.getArray().indexOf(feature) != -1;
    }.bind(this)
  });

  /**
   * @type {ol.FeatureStyleFunction}
   * @private
   */
  this.featureStyleFunction_ = this.createStyleFunction();

};

app.streetview.StreetviewController.prototype.$onInit = function() {
  this.map_.addInteraction(this.selectSingleClick_);
  this.selectSingleClick_.on('select', function(e) {
    if (e.target.getFeatures().getLength() !== 0) {
      var curFeature = e.target.getFeatures().getArray()[0];
      var pano = curFeature.get('pano');
      e.target.getFeatures().clear();
      if (pano !== undefined) {
        this.panorama_.setPano(pano);
      }
    }
  }.bind(this));
  this.selectSingleClick_.setActive(false);
  this.scope_.$watch(function() {
    return this.location;
  }.bind(this), function(newVal, oldVal) {
    if (this.isActive() && this.streetViewService_ !== null) {
      this.handleLocationChange_(newVal, oldVal);
    }
  }.bind(this));

  // (3) Watcher to manage the visibility of the panorama.

  this.scope_.$watch(function() {
    return this.isActive();
  }.bind(this), function(show, oldShow) {
    if (show === undefined) {
      return;
    }
    this.selectSingleClick_.setActive(this.isActive());
    if (this.isActive()) {
      this.loadGoogleapis_().then(function() {
        var piwik = /** @type {Piwik} */ (this.window_['_paq']);
        piwik.push(['setDocumentTitle',
          'activateStreetview'
        ]);
        piwik.push(['trackPageView']);
        if (this.streetViewService_ === null) {
          this.streetViewService_ = new google.maps.StreetViewService();
        }
        if (this.panorama_ === null) {
          this.panorama_ = new google.maps.StreetViewPanorama(
            document.getElementById('streetview-' + this['uid']),
            {
              pov: {
                heading: 0,
                pitch: 0,
                zoom: 1
              },
              visible: false,
              zoom: 1
            }
          );
        }
        if (this.panoramaLinksListener_ === null) {
          this.panoramaLinksListener_ = google.maps.event.addListener(
            this.panorama_,
            'links_changed',
            this.handlePanoramaPositionChange_.bind(this)
          );
        }
        if (this.panoramaPovListener_ === null) {
          this.panoramaPovListener_ = google.maps.event.addListener(
            this.panorama_,
            'pov_changed',
            function() {
              var pov = this.panorama_.getPov();
              this.feature_.set('heading', pov.heading);
              this.feature_.set('zoom', Math.floor(pov.zoom));
              this.feature_.set('pitch', pov.pitch);
            }.bind(this)
          );
        }
        this.handleLocationChange_(this.location, []);
      }.bind(this));
    } else {
      if (this.panorama_ !== null) {
        this.panorama_.setVisible(false);
      }
      this.features_.clear();
      if (this.panoramaPovListener_) {
        google.maps.event.removeListener(this.panoramaPovListener_);
        this.panoramaPovListener_ = null;
      }
      if (this.panoramaLinksListener_) {
        google.maps.event.removeListener(this.panoramaLinksListener_);
        this.panoramaLinksListener_ = null;
      }
    }
  }.bind(this));
  ol.events.listen(this.map_, ol.MapBrowserEventType.POINTERMOVE, function(evt) {
    if (this.isActive()) {
      var pixel = this.map_.getEventPixel(evt.originalEvent);

      //detect feature at mouse coords
      var hit = this.map_.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (feature.get('pano') !== undefined) {
          return true;
        }
        return false;
      });
      this.map_.getViewport().style.cursor = hit ? 'pointer' : '';
    }
  }, this);
};

/**
 * Called when the 'location' property of this component changes.
 * @param {?ol.Coordinate} location Location, in OL map view projection.
 * @param {?ol.Coordinate} oldLocation The previous location.
 * @private
 */
app.streetview.StreetviewController.prototype.handleLocationChange_ = function(location, oldLocation) {

  // (1) No need to do anything if the old value equals the new value
  if (this.isInitialised_ && (location === oldLocation || (
    Array.isArray(location) && Array.isArray(oldLocation) &&
      ol.array.equals(location, oldLocation)
  ))) {
    return;
  }
  this.isInitialised_ = true;
  // (2) Update point coordinates
  this.point_.setCoordinates(location);

  // (3) Update StreetView location
  if (location && !this.panoramaPositionChanging_) {
    var lonLat = this.toLonLat_(location);
    this.streetViewService_.getPanorama({
      location: {
        lat: lonLat[1],
        lng: lonLat[0]
      },
      radius: this.radius
    }, this.handleStreetViewServiceGetPanorama_.bind(this));
  }
};

/**
 * @return {boolean} True if is active.
 * @export
 */
app.streetview.StreetviewController.prototype.isActive = function() {
  return this.appActivetool_.streetviewActive;
};


/**
 * Called when the component 'virtual ready' state changes.
 *
 * When ready:
 *  - add the feature to the overlay
 *
 * When not ready:
 *  - remove the feature from the overlay
 *
 * @param {boolean} ready Whether the component is ready or not.
 * @param {boolean} oldReady Previous ready value.
 * @private
 */
app.streetview.StreetviewController.prototype.handleReadyChange_ = function(ready, oldReady) {
  if (!this.isInitialised_ && ready === oldReady) {
    return;
  }
  if (ready) {
    this.handlePanoramaPositionChange_();
  } else {
    this.features_.clear();
  }
};

/**
 * @return {ol.FeatureStyleFunction} The Function to style.
 * @export
 */
app.streetview.StreetviewController.prototype.createStyleFunction = function() {
  var arrowPath = this.arrowPath_;
  var imagePath = this.appImagesPath_;
  return function(resolution) {
    if (this.get('isDirection')) {
      var curZoom = this.get('zoom');
      if (curZoom < 1) {
        curZoom = 1;
      } else if (curZoom > 4) {
        curZoom = 4;
      }
      var curPitch = Math.abs(this.get('pitch'));
      var pitch = 0;
      if (curPitch >= 0 && curPitch <= 23) {
        pitch = 0;
      } else if (curPitch > 23 && curPitch <= 45) {
        pitch = 1;
      } if (curPitch > 45 && curPitch <= 68) {
        pitch = 2;
      } if (curPitch > 68) {
        pitch = 3;
      }
      var directionArrowPath = imagePath + '/direction_sv_zl' + curZoom + '_p' + pitch + '.png';
      return [new ol.style.Style({
        image: new ol.style.Icon(/** @type {olx.style.IconOptions} */({
          src: directionArrowPath,
          rotation: this.get('heading') * Math.PI / 180
        }))
      })];
    }
    return [new ol.style.Style({
      image: new ol.style.Icon(/** @type {olx.style.IconOptions} */({
        anchor: [0.5, 50],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: arrowPath,
        rotation: this.get('heading') * Math.PI / 180
      }))
    })];
  };
};

/**
 * @param {google.maps.StreetViewPanoramaData} data Data.
 * @param {google.maps.StreetViewStatus} status Status.
 * @private
 */
app.streetview.StreetviewController.prototype.handleStreetViewServiceGetPanorama_ = function(data, status) {

  var panorama = this.panorama_;

  if (status === google.maps.StreetViewStatus.OK) {
    this.noDataAtLocation = false;
    panorama.setPosition(data.location.latLng);
    this.panorama_.setVisible(true);
  } else {
    this.noDataAtLocation = true;
    this.features_.clear();
    this.panorama_.setVisible(false);
  }
  this.scope_.$apply();
};

/**
 * @private
 */
app.streetview.StreetviewController.prototype.style_ = function() {
  this.features_.clear();

  var navigationLinks = this.panorama_.getLinks();
  var pov = this.panorama_.getPov();
  this.feature_.set('heading', pov.heading);
  this.feature_.set('zoom', Math.floor(pov.zoom));
  this.feature_.set('pitch', pov.pitch);

  this.feature_.set('isDirection', true);
  this.feature_.setStyle(this.featureStyleFunction_);
  this.features_.push(this.feature_);
  this.locationInfoOverlay_.clear();
  if (navigationLinks !== undefined) {
    navigationLinks.forEach(function(link) {
      var curFeature = new ol.Feature();
      curFeature.setGeometry(this.point_);
      curFeature.set('heading', link.heading);
      curFeature.set('pano', link.pano);
      curFeature.set('description', link.description);
      curFeature.set('isDirection', false);
      curFeature.setStyle(this.featureStyleFunction_);
      this.features_.push(curFeature);
    }, this);
  }
};

/**
 * Called when the panorama position changes. Update the location.
 * @private
 */
app.streetview.StreetviewController.prototype.handlePanoramaPositionChange_ = function() {
  this.panoramaPositionChanging_ = true;
  var position = this.panorama_.getPosition();
  var lonLat = [position.lng(), position.lat()];
  this.location = this.fromLonLat_(lonLat);
  this.point_.setCoordinates(this.location);
  this.scope_.$apply();

  if (!ol.extent.containsCoordinate(this.map_.getView().calculateExtent(this.map_.getSize()), this.location)) {
    this.map_.getView().setCenter(this.location);
  }
  this.panoramaPositionChanging_ = false;
  this.style_();
};

/**
 * @param {!ol.Coordinate} lonLat LonLat coordinate.
 * @return {ol.Coordinate} Map view projection coordinate.
 */
app.streetview.StreetviewController.prototype.fromLonLat_ = function(lonLat) {
  return ol.proj.fromLonLat(
    lonLat,
    this.map_.getView().getProjection()
  );
};

/**
 * @param {!ol.Coordinate} coordinate Map view projection coordinate.
 * @return {ol.Coordinate} LonLat coordinate.
 */
app.streetview.StreetviewController.prototype.toLonLat_ = function(coordinate) {
  return ol.proj.toLonLat(
    coordinate,
    this.map_.getView().getProjection()
  );
};


/**
 * Load the google api if not already loaded.
 * @return {Promise} The promise.
 */
app.streetview.StreetviewController.prototype.loadGoogleapis_ = function() {
  return new Promise(function(resolve, reject) {
    if (typeof google === 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?v=3&key=AIzaSyCObzX7dJqeGm5Wv2VwS4JzNyEtLsOgWX8';
      script.onload = function() {
        resolve('loaded');
      }.bind(this);
      document.getElementsByTagName('head')[0].appendChild(script);
    } else {
      resolve('loaded');
    }
  }.bind(this));
};
app.module.controller('AppStreetviewController', app.streetview.StreetviewController);
