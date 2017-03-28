/**
 * @fileoverview This file provides a profile directive. This directive is used
 * to create a profile panel in the page.
 *
 * Example:
 *
 * <app-profile app-profile-data="mainCtrl.profileData"
 *   app-profile-open="mainCtrl.profileOpen" app-profile-map="::mainCtrl.map">
 * </app-profile>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 */
goog.provide('app.ProfileController');
goog.provide('app.profileDirective');

goog.require('app');
goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('ngeo');
goog.require('ngeo.FeatureOverlay');
goog.require('ngeo.FeatureOverlayMgr');
goog.require('ngeo.profileDirective');
goog.require('ol.Feature');
goog.require('ol.MapBrowserEvent.EventType');
goog.require('ol.Overlay');
goog.require('ol.geom.GeometryLayout');
goog.require('ol.geom.Point');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Style');


/**
 * @param {string} appProfileTemplateUrl Url to layermanager template
 * @return {angular.Directive} The Directive Definition Object.
 * @ngInject
 */
app.profileDirective = function(appProfileTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'profileData': '=appProfileData',
      'profileInteraction': '=appProfileInteraction',
      'map': '=appProfileMap',
      'isLoadingProfileMsg': '=appProfileIsLoadingMsg'
    },
    controller: 'AppProfileController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appProfileTemplateUrl
  };
};

app.module.directive('appProfile', app.profileDirective);


/**
 * @constructor
 * @param {angular.Scope} $scope Scope.
 * @param {ngeo.FeatureOverlayMgr} ngeoFeatureOverlayMgr Feature overlay
 * manager.
 * @param {string} echocsvUrl URL to echo web service.
 * @param {Document} $document Document.
 * @export
 * @ngInject
 */
app.ProfileController = function($scope, ngeoFeatureOverlayMgr, echocsvUrl,
    $document) {

  /**
   * @type {boolean}
   * @private
   */
  this.showTooltip_ = true;

  /**
   * @type {string}
   * @export
   */
  this.elevationGain;

  /**
   * @type {string}
   * @export
   */
  this.elevationLoss;

  /**
   * @type {string}
   * @export
   */
  this.cumulativeElevation;

  /**
   * @private
   * @type {Document}
   */
  this.$document_ = $document;

  /**
   * @private
   * @type {string}
   */
  this.echocsvUrl_ = echocsvUrl;

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @private
   */
  this.distanceLabel_ = 'Distance : ';

  /**
   * @private
   */
  this.elevationLabel_ = 'Elevation : ';

  /**
   * Overlay to show the measurement.
   * @type {ol.Overlay}
   * @private
   */
  this.measureTooltip_ = null;

  /**
   * The measure tooltip element.
   * @type {Element}
   * @private
   */
  this.measureTooltipElement_ = null;

  /**
   * The draw overlay
   * @type {ngeo.FeatureOverlay}
   * @private
   */
  this.featureOverlay_ = ngeoFeatureOverlayMgr.getFeatureOverlay();

  this.featureOverlay_.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 3,
          fill: new ol.style.Fill({color: '#ffffff'})
        })
      }));

  /**
   * @type {ol.geom.LineString}
   * @private
   */
  this.line_ = null;

  /**
   * @param {Object} item The item.
   * @return {number} The elevation.
   */
  var z = function(item) {
    if ('values' in item && 'dhm' in item['values']) {
      return parseFloat((item['values']['dhm']).toPrecision(5));
    }
    return 0;
  };

  /**
    * @param {Object} item The item.
    * @return {number} The distance.
    */
  var dist = function(item) {
    if ('dist' in item) {
      return item['dist'];
    }
    return 0;
  };

  /**
   * @type {ol.Feature}
   * @private
   */
  this.snappedPoint_ = new ol.Feature();
  this.featureOverlay_.addFeature(this.snappedPoint_);

  /**
   * @type {ol.EventsKey}
   * @private
   */
  this.event_ = ol.events.listen(this['map'], ol.MapBrowserEvent.EventType.POINTERMOVE,
      /**
       * @param {ol.MapBrowserPointerEvent} evt Map browser event.
       */
      function(evt) {
        if (evt.dragging || goog.isNull(this.line_)) {
          return;
        }
        var coordinate = this['map'].getEventCoordinate(evt.originalEvent);
        this.snapToGeometry_(coordinate, this.line_);
      }, this);

  /**
   * @param {Object} point The point.
   * @param {number} dist The distance.
   * @param {string} xUnits The x unit.
   * @param {Object} elevation The elevation.
   * @param {string} yUnits The y unit.
   */
  var hoverCallback = function(point, dist, xUnits, elevation, yUnits) {
    if (this.showTooltip_) {
      // An item in the list of points given to the profile.
      this['point'] = point;
      this.featureOverlay_.clear();
      var curPoint = new ol.geom.Point([point['x'], point['y']]);
      curPoint.transform('EPSG:3857', this['map'].getView().getProjection());
      var positionFeature = new ol.Feature({
        geometry: curPoint
      });
      this.featureOverlay_.addFeature(positionFeature);
      this.createMeasureTooltip_();
      this.measureTooltipElement_.innerHTML = this.distanceLabel_ +
          this.formatDistance_(dist, xUnits) +
          '<br>' +
          this.elevationLabel_ +
          this.formatElevation_(elevation['line1'], yUnits);
      this.measureTooltip_.setPosition(curPoint.getCoordinates());
      this.snappedPoint_.setGeometry(new ol.geom.Point([point.x, point.y]));
    }
  }.bind(this);

  var outCallback = goog.bind(function() {
    if (this.showTooltip_) {
      this['point'] = null;
      this.removeMeasureTooltip_();
      this.featureOverlay_.clear();
      this.snappedPoint_.setGeometry(null);
    }
  }, this);
  var linesConfiguration = {
    'line1': {
      style: {},
      zExtractor: z
    }
  };

  this['profileOptions'] = {
    linesConfiguration: linesConfiguration,
    distanceExtractor: dist,
    hoverCallback: hoverCallback,
    outCallback: outCallback,
    formatter: {
      xhover: this.formatDistance_,
      yhover: this.formatElevation_
    }
  };


  this['point'] = null;

  this.unwatchProfileData = $scope.$watch(function() {
    return this['profileData'];
  }.bind(this), function(newVal, oldVal) {
    if (goog.isDef(newVal)) {
      var elevationGain = 0;
      var elevationLoss = 0;
      var cumulativeElevation = 0;
      var lastElevation;
      var i;
      var len = newVal.length;
      var lineString = new ol.geom.LineString([], ol.geom.GeometryLayout.XYM);
      for (i = 0; i < len; i++) {
        var p = newVal[i];
        p = new ol.geom.Point([p['x'], p['y']]);
        p.transform('EPSG:3857', this['map'].getView().getProjection());
        lineString.appendCoordinate(
            p.getCoordinates().concat(newVal[i]['dist']));

        var curElevation = (newVal[i]['values']['dhm']);
        if (lastElevation !== undefined) {
          var elevation = curElevation - lastElevation;
          cumulativeElevation = cumulativeElevation + elevation;
          if (elevation > 0) {
            elevationGain = elevationGain + elevation;
          } else {
            elevationLoss = elevationLoss + elevation;
          }
        }
        lastElevation = curElevation;
      }
      this.line_ = lineString;
      this.elevationGain = this.formatElevationGain_(elevationGain, 'm');
      this.elevationLoss = this.formatElevationGain_(-1 * elevationLoss, 'm');
      this.cumulativeElevation = this.formatElevationGain_(cumulativeElevation,
          'm');
    } else {
      this.line_ = null;
    }
  }.bind(this));

  this.scope_.$on('$destroy', function() {
    ol.events.unlistenByKey(this.event_);
    this.unwatchProfileData();
  }.bind(this));
};


/**
 * Creates a new measure tooltip
 * @private
 */
app.ProfileController.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = goog.dom.createDom(goog.dom.TagName.DIV);
  goog.dom.classlist.addAll(this.measureTooltipElement_,
      ['tooltip', 'tooltip-measure']);
  this.measureTooltip_ = new ol.Overlay({
    element: this.measureTooltipElement_,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  this['map'].addOverlay(this.measureTooltip_);
};


/**
 * Destroy the help tooltip
 * @private
 */
app.ProfileController.prototype.removeMeasureTooltip_ = function() {
  if (!goog.isNull(this.measureTooltipElement_)) {
    this.measureTooltipElement_.parentNode.removeChild(
        this.measureTooltipElement_);
    this.measureTooltipElement_ = null;
    this.measureTooltip_ = null;
  }
};


/**
 * Format the distance text.
 * @param {number} dist The distance.
 * @param {string} units The unit.
 * @return {string} The formatted distance.
 * @private
 */
app.ProfileController.prototype.formatDistance_ = function(dist, units) {
  return parseFloat(dist.toPrecision(3)) + ' ' + units;
};


/**
 * Format the elevation text.
 * @param {number} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} The elevation text.
 * @private
 */
app.ProfileController.prototype.formatElevation_ = function(elevation, units) {
  return parseFloat(elevation.toPrecision(4)) + ' ' + units;
};


/**
 * Format the elevation gain text.
 * @param {number} elevation The elevation.
 * @param {string} units The unit.
 * @return {string} the elevation gain text.
 * @private
 */
app.ProfileController.prototype.formatElevationGain_ =
    function(elevation, units) {
      return parseFloat(parseInt(elevation, 10)) + ' ' + units;
    };


/**
 * @param {ol.Coordinate} coordinate The current pointer coordinate.
 * @param {ol.geom.Geometry|undefined} geom The geometry to snap to.
 * @private
 */
app.ProfileController.prototype.snapToGeometry_ = function(coordinate, geom) {
  var closestPoint = geom.getClosestPoint(coordinate);
  // compute distance to line in pixels
  var dx = closestPoint[0] - coordinate[0];
  var dy = closestPoint[1] - coordinate[1];
  var viewResolution = this['map'].getView().getResolution();
  var distSqr = dx * dx + dy * dy;
  var pixelDistSqr = distSqr / (viewResolution * viewResolution);
  // Check whether dist is lower than 8 pixels
  this['profileHighlight'] = pixelDistSqr < 64 ? closestPoint[2] : -1;
  if (this['profileHighlight'] > -1) {
    this.showTooltip_ = false;
  } else {
    this.showTooltip_ = true;
  }
  this.scope_.$digest();
};


/**
 * Export the data as a csv file.
 * @export
 */
app.ProfileController.prototype.exportCSV = function() {
  var csv = 'dist,MNT,y,x\n';
  this['profileData'].forEach(goog.bind(function(item) {
    csv = csv + item['dist'] + ',' +
          (item['values']['dhm']) + ',' +
          item['x'] + ',' +
          item['y'] + '\n';
  },this));

  var csvInput = $('<input>').attr({
    type: 'hidden',
    name: 'csv',
    value: csv
  });
  var nameInput = $('<input>').attr({
    type: 'hidden',
    name: 'name',
    value: 'mnt'
  });

  var form = $('<form>').attr({
    method: 'POST',
    action: this.echocsvUrl_
  });
  form.append(nameInput, csvInput);
  angular.element(this.$document_[0].body).append(form);
  form[0].submit();
  form.remove();
};

app.module.controller('AppProfileController', app.ProfileController);
