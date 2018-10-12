goog.provide('app.interaction.DrawRoute');

goog.require('ol');
goog.require('ol.Feature');
goog.require('ol.MapBrowserEventType');
goog.require('ol.Object');
goog.require('ol.events');
goog.require('ol.events.Event');
goog.require('ol.events.condition');
goog.require('ol.format.GeoJSON');
goog.require('ol.functions');
goog.require('ol.geom.GeometryType');
goog.require('ol.geom.LineString');
goog.require('ol.geom.MultiLineString');
goog.require('ol.geom.Point');
goog.require('ol.geom.Polygon');
goog.require('ol.interaction.DrawEventType');
goog.require('ol.interaction.Pointer');
goog.require('ol.interaction.Property');
goog.require('ol.layer.Vector');
goog.require('ol.source.Vector');
goog.require('ol.style.Style');


/**
 * @classdesc
 * Interaction for drawing route geometries.
 *
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @fires app.interaction.DrawRoute.Event
 * @param {olx.interaction.DrawOptions} options Options.
 * @api
 */
app.interaction.DrawRoute = function(options) {

  ol.interaction.Pointer.call(this, {
    handleDownEvent: app.interaction.DrawRoute.handleDownEvent_,
    handleEvent: app.interaction.DrawRoute.handleEvent,
    handleUpEvent: app.interaction.DrawRoute.handleUpEvent_
  });
  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ =  options.$http;
  /**
   * @type {boolean}
   * @private
   */
  this.finishAfterRoute_ = false;

  /**
   * @type {boolean}
   * @private
   */
  this.shouldHandle_ = false;

  /**
   * @type {ol.Pixel}
   * @private
   */
  this.downPx_ = null;

  /**
   * @type {boolean}
   * @private
   */
  this.freehand_ = false;

  /**
   * @type {boolean}
   * @private
   */
  this.mapMatching_ = options.mapMatching;

  /**
   * Target source for drawn features.
   * @type {ol.source.Vector}
   * @private
   */
  this.source_ = options.source ? options.source : null;

  /**
   * Target collection for drawn features.
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.features_ = options.features ? options.features : null;

  /**
   * Pixel distance for snapping.
   * @type {number}
   * @private
   */
  this.snapTolerance_ = options.snapTolerance ? options.snapTolerance : 12;

  /**
   * Geometry type.
   * @type {ol.geom.GeometryType}
   * @private
   */
  this.type_ = /** @type {ol.geom.GeometryType} */ (options.type);

  /**
   * Drawing mode (derived from geometry type.
   * @type {app.interaction.DrawRoute.Mode_}
   * @private
   */
  this.mode_ = app.interaction.DrawRoute.getMode_(this.type_);

  /**
   * The number of points that must be drawn before a polygon ring or line
   * string can be finished.  The default is 3 for polygon rings and 2 for
   * line strings.
   * @type {number}
   * @private
   */
  this.minPoints_ = options.minPoints ?
      options.minPoints :
      (this.mode_ === app.interaction.DrawRoute.Mode_.POLYGON ? 3 : 2);

  /**
   * The number of points that can be drawn before a polygon ring or line string
   * is finished. The default is no restriction.
   * @type {number}
   * @private
   */
  this.maxPoints_ = options.maxPoints ? options.maxPoints : Infinity;

  /**
   * A function to decide if a potential finish coordinate is permissable
   * @private
   * @type {ol.EventsConditionType}
   */
  this.finishCondition_ = options.finishCondition ? options.finishCondition : ol.functions.TRUE;

  /**
   * @private
   * @type {string}
   */
  this.lastWaypoints_;

  /**
   * @private
   * @type {string}
   */
  this.getRouteUrl_ = options.getRouteUrl;

  /**
   * @private
   * @type {Array}
   */
  this.pointsCnt_ = [];

  /**
   * @private
   * @type {boolean}
   */
  this.isRequestingRoute_ = false;

  var geometryFunction = options.geometryFunction;
  if (!geometryFunction) {
    /**
     * @param {ol.Coordinate|Array.<ol.Coordinate>|Array.<Array.<ol.Coordinate>>} coordinates
     *     The coordinates.
     * @param {ol.geom.SimpleGeometry=} opt_geometry Optional geometry.
     * @return {ol.geom.SimpleGeometry} A geometry.
     */
    geometryFunction = function(coordinates, opt_geometry) {
      var geometry = opt_geometry;
      if (geometry) {
        if (!this.isRequestingRoute_) {
          geometry.setCoordinates(coordinates);
        }
      } else {
        geometry = new ol.geom.LineString(coordinates);
      }
      return geometry;
    };
  }

  /**
   * @type {ol.DrawGeometryFunctionType}
   * @private
   */
  this.geometryFunction_ = geometryFunction;

  /**
   * Finish coordinate for the feature (first point for polygons, last point for
   * linestrings).
   * @type {ol.Coordinate}
   * @private
   */
  this.finishCoordinate_ = null;

  /**
   * Sketch feature.
   * @type {ol.Feature}
   * @private
   */
  this.sketchFeature_ = null;

  /**
   * Sketch point.
   * @type {ol.Feature}
   * @private
   */
  this.sketchPoint_ = null;

  /**
   * Sketch coordinates. Used when drawing a line or polygon.
   * @type {ol.Coordinate|Array.<ol.Coordinate>|Array.<Array.<ol.Coordinate>>}
   * @private
   */
  this.sketchCoords_ = null;

  /**
   * Sketch line. Used when drawing polygon.
   * @type {ol.Feature}
   * @private
   */
  this.sketchLine_ = null;

  /**
   * Sketch line coordinates. Used when drawing a polygon or circle.
   * @type {Array.<ol.Coordinate>}
   * @private
   */
  this.sketchLineCoords_ = null;

  /**
   * Squared tolerance for handling up events.  If the squared distance
   * between a down and up event is greater than this tolerance, up events
   * will not be handled.
   * @type {number}
   * @private
   */
  this.squaredClickTolerance_ = options.clickTolerance ?
      options.clickTolerance * options.clickTolerance : 36;

  /**
   * Draw overlay where our sketch features are drawn.
   * @type {ol.layer.Vector}
   * @private
   */
  this.overlay_ = new ol.layer.Vector({
    source: new ol.source.Vector({
      useSpatialIndex: false,
      wrapX: options.wrapX ? options.wrapX : false
    }),
    style: options.style ? options.style :
        app.interaction.DrawRoute.getDefaultStyleFunction()
  });

  /**
   * Name of the geometry attribute for newly created features.
   * @type {string|undefined}
   * @private
   */
  this.geometryName_ = options.geometryName;

  /**
   * @private
   * @type {ol.EventsConditionType}
   */
  this.condition_ = options.condition ?
      options.condition : ol.events.condition.noModifierKeys;

  /**
   * @private
   * @type {ol.EventsConditionType}
   */
  this.freehandCondition_;
  if (options.freehand) {
    this.freehandCondition_ = ol.events.condition.always;
  } else {
    this.freehandCondition_ = options.freehandCondition ?
        options.freehandCondition : ol.events.condition.shiftKeyOnly;
  }

  ol.events.listen(this,
      ol.Object.getChangeEventType(ol.interaction.Property.ACTIVE),
      this.updateState_, this);

};
ol.inherits(app.interaction.DrawRoute, ol.interaction.Pointer);


/**
 * @return {ol.StyleFunction} Styles.
 */
app.interaction.DrawRoute.getDefaultStyleFunction = function() {
  var styles = ol.style.Style.createDefaultEditing();
  return function(feature, resolution) {
    return styles[feature.getGeometry().getType()];
  };
};


/**
 * @inheritDoc
 */
app.interaction.DrawRoute.prototype.setMap = function(map) {
  ol.interaction.Pointer.prototype.setMap.call(this, map);
  this.updateState_();
};


/**
 * Handles the {@link ol.MapBrowserEvent map browser event} and may actually
 * draw or finish the drawing.
 * @param {ol.MapBrowserEvent} event Map browser event.
 * @return {boolean} `false` to stop event propagation.
 * @this {app.interaction.DrawRoute}
 * @api
 */
app.interaction.DrawRoute.handleEvent = function(event) {
  this.freehand_ = this.mode_ !== app.interaction.DrawRoute.Mode_.POINT && this.freehandCondition_(event);
  var pass = !this.freehand_;
  if (this.freehand_ &&
      event.type === ol.MapBrowserEventType.POINTERDRAG && this.sketchFeature_ !== null) {
    this.addToDrawing_(event);
    pass = false;
  } else if (event.type ===
      ol.MapBrowserEventType.POINTERMOVE) {
    pass = this.handlePointerMove_(event);
  } else if (event.type === ol.MapBrowserEventType.DBLCLICK) {
    pass = false;
  }
  return ol.interaction.Pointer.handleEvent.call(this, event) && pass;
};


/**
 * @param {ol.MapBrowserPointerEvent} event Event.
 * @return {boolean} Start drag sequence?
 * @this {app.interaction.DrawRoute}
 * @private
 */
app.interaction.DrawRoute.handleDownEvent_ = function(event) {
  this.shouldHandle_ = !this.freehand_;

  if (this.freehand_) {
    this.downPx_ = event.pixel;
    if (!this.finishCoordinate_) {
      this.startDrawing_(event);
    }
    return true;
  } else if (this.condition_(event)) {
    this.downPx_ = event.pixel;
    return true;
  } else {
    return false;
  }
};


/**
 * @param {ol.MapBrowserPointerEvent} event Event.
 * @return {boolean} Stop drag sequence?
 * @this {app.interaction.DrawRoute}
 * @private
 */
app.interaction.DrawRoute.handleUpEvent_ = function(event) {
  var pass = true;

  this.handlePointerMove_(event);

  var circleMode = this.mode_ === app.interaction.DrawRoute.Mode_.CIRCLE;

  if (this.shouldHandle_) {
    if (!this.finishCoordinate_) {
      this.startDrawing_(event);
      if (this.mode_ === app.interaction.DrawRoute.Mode_.POINT) {
        this.finishDrawing();
      }
    } else if (this.freehand_ || circleMode) {
      this.finishDrawing();
    } else if (this.atFinish_(event)) {
      if (this.finishCondition_(event)) {
        if (this.isRequestingRoute_) {
          this.finishAfterRoute_ = true;
        } else {
          this.finishDrawing();
        }
      }
    } else {
      this.addToDrawing_(event);
    }
    pass = false;
  } else if (this.freehand_) {
    this.finishCoordinate_ = null;
    this.abortDrawing_();
  }
  return pass;
};


/**
 * Handle move events.
 * @param {ol.MapBrowserEvent} event A move event.
 * @return {boolean} Pass the event to other interactions.
 * @private
 */
app.interaction.DrawRoute.prototype.handlePointerMove_ = function(event) {
  if (this.downPx_ &&
      ((!this.freehand_ && this.shouldHandle_) ||
      (this.freehand_ && !this.shouldHandle_))) {
    var downPx = this.downPx_;
    var clickPx = event.pixel;
    var dx = downPx[0] - clickPx[0];
    var dy = downPx[1] - clickPx[1];
    var squaredDistance = dx * dx + dy * dy;
    this.shouldHandle_ = this.freehand_ ?
        squaredDistance > this.squaredClickTolerance_ :
        squaredDistance <= this.squaredClickTolerance_;
  }

  if (this.finishCoordinate_) {
    this.modifyDrawing_(event);
  } else {
    this.createOrUpdateSketchPoint_(event);
  }
  return true;
};


/**
 * Determine if an event is within the snapping tolerance of the start coord.
 * @param {ol.MapBrowserEvent} event Event.
 * @return {boolean} The event is within the snapping tolerance of the start.
 * @private
 */
app.interaction.DrawRoute.prototype.atFinish_ = function(event) {
  var at = false;
  if (this.sketchFeature_) {
    var potentiallyDone = false;
    var potentiallyFinishCoordinates = [this.finishCoordinate_];
    potentiallyDone = this.sketchCoords_.length > this.minPoints_;

    if (potentiallyDone) {
      var map = event.map;
      for (var i = 0, ii = potentiallyFinishCoordinates.length; i < ii; i++) {
        var finishCoordinate = potentiallyFinishCoordinates[i];
        var finishPixel = map.getPixelFromCoordinate(finishCoordinate);
        var pixel = event.pixel;
        var dx = pixel[0] - finishPixel[0];
        var dy = pixel[1] - finishPixel[1];
        var snapTolerance = this.freehand_ ? 1 : this.snapTolerance_;
        at = Math.sqrt(dx * dx + dy * dy) <= snapTolerance;
        if (at) {
          this.finishCoordinate_ = finishCoordinate;
          break;
        }
      }
    }
  }
  return at;
};


/**
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
app.interaction.DrawRoute.prototype.createOrUpdateSketchPoint_ = function(event) {
  var coordinates = event.coordinate.slice();
  if (!this.sketchPoint_) {
    this.sketchPoint_ = new ol.Feature(new ol.geom.Point(coordinates));
    this.updateSketchFeatures_();
  } else {
    var sketchPointGeom = /** @type {ol.geom.Point} */ (this.sketchPoint_.getGeometry());
    sketchPointGeom.setCoordinates(coordinates);
  }
};


/**
 * Start the drawing.
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
app.interaction.DrawRoute.prototype.startDrawing_ = function(event) {
  var start = event.coordinate;
  this.finishCoordinate_ = start;
  if (this.mode_ === app.interaction.DrawRoute.Mode_.POINT) {
    this.sketchCoords_ = start.slice();
  } else if (this.mode_ === app.interaction.DrawRoute.Mode_.POLYGON) {
    this.sketchCoords_ = [[start.slice(), start.slice()]];
    this.sketchLineCoords_ = this.sketchCoords_[0];
  } else {
    this.sketchCoords_ = [start.slice(), start.slice()];
    if (this.mode_ === app.interaction.DrawRoute.Mode_.CIRCLE) {
      this.sketchLineCoords_ = this.sketchCoords_;
    }
  }
  if (this.sketchLineCoords_) {
    this.sketchLine_ = new ol.Feature(
        new ol.geom.LineString(this.sketchLineCoords_));
  }
  var geometry = this.geometryFunction_(this.sketchCoords_);
  this.sketchFeature_ = new ol.Feature();
  if (this.geometryName_) {
    this.sketchFeature_.setGeometryName(this.geometryName_);
  }
  this.sketchFeature_.setGeometry(geometry);
  this.updateSketchFeatures_();
  this.dispatchEvent(new app.interaction.DrawRoute.Event(
      ol.interaction.DrawEventType.DRAWSTART, this.sketchFeature_));
};


/**
 * Modify the drawing.
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
app.interaction.DrawRoute.prototype.modifyDrawing_ = function(event) {
  var coordinate = event.coordinate;
  var geometry = /** @type {ol.geom.SimpleGeometry} */ (this.sketchFeature_.getGeometry());
  var coordinates, last;

  coordinates = this.sketchCoords_;
  last = coordinates[coordinates.length - 1];

  last[0] = coordinate[0];
  last[1] = coordinate[1];
  this.geometryFunction_(
      /** @type {!ol.Coordinate|!Array.<ol.Coordinate>|!Array.<Array.<ol.Coordinate>>} */ (this.sketchCoords_),
      geometry);
  if (this.sketchPoint_) {
    var sketchPointGeom = /** @type {ol.geom.Point} */ (this.sketchPoint_.getGeometry());
    sketchPointGeom.setCoordinates(coordinate);
  }
  var sketchLineGeom;
  if (geometry instanceof ol.geom.Polygon &&
      this.mode_ !== app.interaction.DrawRoute.Mode_.POLYGON) {
    if (!this.sketchLine_) {
      this.sketchLine_ = new ol.Feature(new ol.geom.LineString(null));
    }
    var ring = geometry.getLinearRing(0);
    sketchLineGeom = /** @type {ol.geom.LineString} */ (this.sketchLine_.getGeometry());
    sketchLineGeom.setFlatCoordinates(
        ring.getLayout(), ring.getFlatCoordinates());
  } else if (this.sketchLineCoords_) {
    sketchLineGeom = /** @type {ol.geom.LineString} */ (this.sketchLine_.getGeometry());
    sketchLineGeom.setCoordinates(this.sketchLineCoords_);
  }
  this.updateSketchFeatures_();
};


/**
 * Add a new coordinate to the drawing.
 * @param {ol.MapBrowserEvent} event Event.
 * @private
 */
app.interaction.DrawRoute.prototype.addToDrawing_ = function(event) {
  var coordinate = event.coordinate;
  var geometry = /** @type {ol.geom.SimpleGeometry} */ (this.sketchFeature_.getGeometry());
  var done;
  var coordinates;

  this.finishCoordinate_ = coordinate.slice();
  coordinates = this.sketchCoords_;
  if (coordinates.length >= this.maxPoints_) {
    if (this.freehand_) {
      coordinates.pop();
    } else {
      done = true;
    }
  }
  coordinates.push(coordinate.slice());
  if (!this.mapMatching_ || this.freehand_ ||
      this.getRouteUrl_ === undefined ||
      this.$http_ === undefined) {
    this.pointsCnt_.push(1);
    this.geometryFunction_(coordinates, geometry);
    this.updateSketchFeatures_();
  } else {
    var last = coordinates[coordinates.length - 1];
    if (coordinates.length > 2) {
      var penultimate = ol.proj.transform(coordinates[coordinates.length - 2], 'EPSG:3857', 'EPSG:4326');
      var antepenultimate = ol.proj.transform(coordinates[coordinates.length - 3], 'EPSG:3857', 'EPSG:4326');
      var waypoints = antepenultimate[1] + ',' + antepenultimate[0] + ',' + penultimate[1] + ',' + penultimate[0];
      if (waypoints !== this.lastWaypoints_ && !this.isRequestingRoute_) {
        this.lastWaypoints_ = waypoints;
        var url = this.getRouteUrl_ + '?waypoints=' + waypoints;
        this.isRequestingRoute_ = true;
        this.$http_.get(url).then(function(resp) {
          var parser = new ol.format.GeoJSON();
          if (resp['data']['success']) {
            var routedGeometry = parser.readGeometry(resp['data']['geom']);
            this.pointsCnt_.push(/** @type {ol.geom.LineString} */ (routedGeometry).getCoordinates().length);
            var curCoordinates = geometry.getCoordinates().slice(0, geometry.getCoordinates().length - 2).
              concat(/** @type {ol.geom.LineString} */ (routedGeometry.transform('EPSG:4326', 'EPSG:3857')).getCoordinates());
            if (!this.finishAfterRoute_) {
              curCoordinates.push(last);
            }
            geometry.setCoordinates(curCoordinates);
            this.sketchCoords_ = curCoordinates;
          } else {
            console.log('Erreur de calcul de la route');
          }
          if (this.finishAfterRoute_) {
            this.finishAfterRoute_ = false;
            this.finishCoordinate_ = null;
            this.finishDrawing();
          } else {
            this.updateSketchFeatures_();
            if (coordinates.length >= 2) {
              this.finishCoordinate_ = coordinates[coordinates.length - 2].slice();
            }
          }
          this.isRequestingRoute_ = false;
        }.bind(this));
      }
    }
    if (!this.isRequestingRoute_) {
      var curCoordinates = geometry.getCoordinates().slice(0, geometry.getCoordinates().length - 1);
      curCoordinates.push(last);
      geometry.setCoordinates(curCoordinates);
    }
  }
  if (done) {
    this.finishDrawing();
  }
};

/**
 * Activate or deactivate Map matching.
 * @param {boolean} actif Set to true to activate mapmatching.
 */
app.interaction.DrawRoute.prototype.setMapMatching = function(actif) {
  this.mapMatching_ = actif;
};

/**
 * Get the status of mapmatching.
 * @return {boolean} Return true if mapMatching is active.
 */
app.interaction.DrawRoute.prototype.getMapMatching = function() {
  return this.mapMatching_;
};

/**
 * Toggle the mapmatching status.
 * @return {boolean} Return true if mapMatching is active.
 */
app.interaction.DrawRoute.prototype.toggleMapMatching = function() {
  this.mapMatching_ = !this.mapMatching_;
  return this.mapMatching_;
};

/**
 * Remove last point of the feature currently being drawn.
 * @api
 */
app.interaction.DrawRoute.prototype.removeLastPoints = function() {
  if (!this.sketchFeature_) {
    return;
  }
  var geometry = /** @type {ol.geom.SimpleGeometry} */ (this.sketchFeature_.getGeometry());
  var coordinates = this.sketchCoords_;
  var curNb = this.pointsCnt_.pop();
  coordinates.splice((-1 * curNb) - 1, curNb);
  this.geometryFunction_(coordinates, geometry);
  if (coordinates.length >= 2) {
    this.finishCoordinate_ = coordinates[coordinates.length - 2].slice();
  }

  if (coordinates.length === 0) {
    this.finishCoordinate_ = null;
  }

  this.updateSketchFeatures_();
};

/**
 * Remove last point of the feature currently being drawn.
 * @api
 */
app.interaction.DrawRoute.prototype.removeLastPoint = function() {
  if (!this.sketchFeature_) {
    return;
  }
  var geometry = /** @type {ol.geom.SimpleGeometry} */ (this.sketchFeature_.getGeometry());
  var coordinates, sketchLineGeom;
  if (this.mode_ === app.interaction.DrawRoute.Mode_.LINE_STRING) {
    coordinates = this.sketchCoords_;
    coordinates.splice(-2, 1);
    this.geometryFunction_(coordinates, geometry);
    if (coordinates.length >= 2) {
      this.finishCoordinate_ = coordinates[coordinates.length - 2].slice();
    }
  } else if (this.mode_ === app.interaction.DrawRoute.Mode_.POLYGON) {
    coordinates = this.sketchCoords_[0];
    coordinates.splice(-2, 1);
    sketchLineGeom = /** @type {ol.geom.LineString} */ (this.sketchLine_.getGeometry());
    sketchLineGeom.setCoordinates(coordinates);
    this.geometryFunction_(this.sketchCoords_, geometry);
  }

  if (coordinates.length === 0) {
    this.finishCoordinate_ = null;
  }

  this.updateSketchFeatures_();
};


/**
 * Stop drawing and add the sketch feature to the target layer.
 * The {@link ol.interaction.DrawEventType.DRAWEND} event is dispatched before
 * inserting the feature.
 * @api
 */
app.interaction.DrawRoute.prototype.finishDrawing = function() {
  var sketchFeature = this.abortDrawing_();

  // First dispatch event to allow full set up of feature
  this.dispatchEvent(new app.interaction.DrawRoute.Event(
      ol.interaction.DrawEventType.DRAWEND, sketchFeature));

  // Then insert feature
  if (this.features_) {
    this.features_.push(sketchFeature);
  }
  if (this.source_) {
    this.source_.addFeature(sketchFeature);
  }
};


/**
 * Stop drawing without adding the sketch feature to the target layer.
 * @return {ol.Feature} The sketch feature (or null if none).
 * @private
 */
app.interaction.DrawRoute.prototype.abortDrawing_ = function() {
  this.finishCoordinate_ = null;
  var sketchFeature = this.sketchFeature_;
  this.pointsCnt_ = [];
  if (sketchFeature) {
    this.sketchFeature_ = null;
    this.sketchPoint_ = null;
    this.sketchLine_ = null;
    this.overlay_.getSource().clear(true);
  }
  return sketchFeature;
};


/**
 * Extend an existing geometry by adding additional points. This only works
 * on features with `LineString` geometries, where the interaction will
 * extend lines by adding points to the end of the coordinates array.
 * @param {!ol.Feature} feature Feature to be extended.
 * @api
 */
app.interaction.DrawRoute.prototype.extend = function(feature) {
  var geometry = feature.getGeometry();
  var lineString = /** @type {ol.geom.LineString} */ (geometry);
  this.sketchFeature_ = feature;
  this.sketchCoords_ = lineString.getCoordinates();
  var last = this.sketchCoords_[this.sketchCoords_.length - 1];
  this.finishCoordinate_ = last.slice();
  this.sketchCoords_.push(last.slice());
  this.updateSketchFeatures_();
  this.dispatchEvent(new app.interaction.DrawRoute.Event(
      ol.interaction.DrawEventType.DRAWSTART, this.sketchFeature_));
};


/**
 * @inheritDoc
 */
app.interaction.DrawRoute.prototype.shouldStopEvent = ol.functions.FALSE;


/**
 * Redraw the sketch features.
 * @private
 */
app.interaction.DrawRoute.prototype.updateSketchFeatures_ = function() {
  var sketchFeatures = [];
  if (this.sketchFeature_) {
    sketchFeatures.push(this.sketchFeature_);
  }
  if (this.sketchLine_) {
    sketchFeatures.push(this.sketchLine_);
  }
  if (this.sketchPoint_) {
    sketchFeatures.push(this.sketchPoint_);
  }
  var overlaySource = this.overlay_.getSource();
  overlaySource.clear(true);
  overlaySource.addFeatures(sketchFeatures);
};


/**
 * @private
 */
app.interaction.DrawRoute.prototype.updateState_ = function() {
  var map = this.getMap();
  var active = this.getActive();
  if (!map || !active) {
    this.abortDrawing_();
  }
  this.overlay_.setMap(active ? map : null);
};

/**
 * Get the drawing mode.  The mode for mult-part geometries is the same as for
 * their single-part cousins.
 * @param {ol.geom.GeometryType} type Geometry type.
 * @return {app.interaction.DrawRoute.Mode_} Drawing mode.
 * @private
 */
app.interaction.DrawRoute.getMode_ = function(type) {
  var mode;
  if (type === ol.geom.GeometryType.POINT ||
      type === ol.geom.GeometryType.MULTI_POINT) {
    mode = app.interaction.DrawRoute.Mode_.POINT;
  } else if (type === ol.geom.GeometryType.LINE_STRING ||
      type === ol.geom.GeometryType.MULTI_LINE_STRING) {
    mode = app.interaction.DrawRoute.Mode_.LINE_STRING;
  } else if (type === ol.geom.GeometryType.POLYGON ||
      type === ol.geom.GeometryType.MULTI_POLYGON) {
    mode = app.interaction.DrawRoute.Mode_.POLYGON;
  } else if (type === ol.geom.GeometryType.CIRCLE) {
    mode = app.interaction.DrawRoute.Mode_.CIRCLE;
  }
  return /** @type {!app.interaction.DrawRoute.Mode_} */ (mode);
};


/**
 * Draw mode.  This collapses multi-part geometry types with their single-part
 * cousins.
 * @enum {string}
 * @private
 */
app.interaction.DrawRoute.Mode_ = {
  POINT: 'Point',
  LINE_STRING: 'LineString',
  POLYGON: 'Polygon',
  CIRCLE: 'Circle'
};

/**
 * @classdesc
 * Events emitted by {@link app.interaction.DrawRoute} instances are instances of
 * this type.
 *
 * @constructor
 * @extends {ol.events.Event}
 * @implements {oli.DrawEvent}
 * @param {ol.interaction.DrawEventType} type Type.
 * @param {ol.Feature} feature The feature drawn.
 */
app.interaction.DrawRoute.Event = function(type, feature) {

  ol.events.Event.call(this, type);

  /**
   * The feature being drawn.
   * @type {ol.Feature}
   * @api
   */
  this.feature = feature;

};
ol.inherits(app.interaction.DrawRoute.Event, ol.events.Event);
