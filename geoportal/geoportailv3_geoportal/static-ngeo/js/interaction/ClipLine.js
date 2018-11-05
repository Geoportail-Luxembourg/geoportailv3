/**
 * @module app.interaction.ClipLine
 */
import olBase from 'ol.js';
import olCollection from 'ol/Collection.js';
import olFeature from 'ol/Feature.js';
import olMapBrowserEventType from 'ol/MapBrowserEventType.js';
import olMapBrowserPointerEvent from 'ol/MapBrowserPointerEvent.js';
import olCoordinate from 'ol/coordinate.js';
import {listen} from 'ol/events.js';
import olExtent from 'ol/extent.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomPoint from 'ol/geom/Point.js';
import olInteractionInteraction from 'ol/interaction/Interaction.js';
import olInteractionModify from 'ol/interaction/Modify.js';
import olInteractionPointer from 'ol/interaction/Pointer.js';
import olInteractionModifyEventType from 'ol/interaction/ModifyEventType.js';
import olLayerVector from 'ol/layer/Vector.js';
import olSourceVector from 'ol/source/Vector.js';
import olStructsRBush from 'ol/structs/RBush.js';
import olStyleStyle from 'ol/style/Style.js';

/**
 * @classdesc
 * Interaction for modifying feature geometries.
 *
 * @constructor
 * @extends {ol.interaction.Pointer}
 * @param {olx.interaction.ModifyOptions} options Options.
 * @fires app.interaction.ModifyCircleEvent
 * @api
 */
const exports = function(options) {

  olInteractionPointer.call(this, {
    handleDownEvent: exports.handleDownEvent_,
    handleEvent: exports.handleEvent,
    handleUpEvent: exports.handleUpEvent_
  });

  /**
   * Editing vertex.
   * @type {ol.Feature}
   * @private
   */
  this.vertexFeature_ = null;

  /**
   * @type {ol.Pixel}
   * @private
   */
  this.lastPixel_ = [0, 0];

  /**
   * @type {boolean}
   * @private
   */
  this.modified_ = false;

  /**
   * Segment RTree for each layer
   * @type {ol.structs.RBush.<Object>}
   * @private
   */
  this.rBush_ = new olStructsRBush();

  /**
   * @type {number}
   * @private
   */
  this.pixelTolerance_ = options.pixelTolerance !== undefined ?
      options.pixelTolerance : 10;

  /**
   * @type {boolean}
   * @private
   */
  this.snappedToVertex_ = false;

  /**
   * @type {Array}
   * @private
   */
  this.dragSegments_ = null;

  /**
   * Draw overlay where sketch features are drawn.
   * @type {ol.layer.Vector}
   * @private
   */
  this.overlay_ = new olLayerVector({
    source: new olSourceVector({
      useSpatialIndex: false,
      wrapX: !!options.wrapX
    }),
    style: options.style ? options.style :
        exports.getDefaultStyleFunction(),
    updateWhileAnimating: true,
    updateWhileInteracting: true
  });

  console.assert(options.features !== undefined);
  /**
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.features_ = /** @type {!ol.Collection.<ol.Feature>} */ (options.features);

  this.features_.forEach(this.addFeature_, this);
  listen(this.features_, olBase.CollectionEventType.ADD,
      this.handleFeatureAdd_, this);
  listen(this.features_, olBase.CollectionEventType.REMOVE,
      this.handleFeatureRemove_, this);

};

olBase.inherits(exports, olInteractionPointer);


/**
 * @param {ol.Feature} feature Feature.
 * @private
 */
exports.prototype.addFeature_ = function(feature) {
  if (feature.getGeometry().getType() === olGeomGeometryType.LINE_STRING) {
    var geometry = /** @type {ol.geom.LineString}*/ (feature.getGeometry());
    this.writeLineStringGeometry_(feature, geometry);

    var map = this.getMap();
    if (map) {
      if (this.lastPixel_[0] !== 0 && this.lastPixel_[1] !== 0) {
        this.handlePointerAtPixel_(this.lastPixel_, map);
      }
    }
    listen(feature, olEvents.EventType.CHANGE,
        this.handleFeatureChange_, this);
  }
};


/**
 * @param {ol.Feature} feature Feature.
 * @private
 */
exports.prototype.removeFeature_ = function(feature) {
  this.removeFeatureSegmentData_(feature);
  // Remove the vertex feature if the collection of canditate features
  // is empty.
  if (this.vertexFeature_ && this.features_.getLength() === 0) {
    this.overlay_.getSource().removeFeature(this.vertexFeature_);
    this.vertexFeature_ = null;
  }
  olEvents.unlisten(feature, olEvents.EventType.CHANGE,
      this.handleFeatureChange_, this);
};


/**
 * @param {ol.Feature} feature Feature.
 * @private
 */
exports.prototype.removeFeatureSegmentData_ = function(feature) {
  var rBush = this.rBush_;
  var /** @type {Array.<Object>} */ nodesToRemove = [];
  rBush.forEach(
      /**
       * @param {Object} node RTree node.
       */
      function(node) {
        if (feature === node.feature) {
          nodesToRemove.push(node);
        }
      });
  for (var i = nodesToRemove.length - 1; i >= 0; --i) {
    rBush.remove(nodesToRemove[i]);
  }
};


/**
 * @inheritDoc
 */
exports.prototype.setMap = function(map) {
  this.overlay_.setMap(map);
  olInteractionInteraction.prototype.setMap.call(this, map);
};


/**
 * @param {ol.Collection.Event} evt Event.
 * @private
 */
exports.prototype.handleFeatureAdd_ = function(evt) {
  var feature = evt.element;
  console.assert(feature instanceof olFeature,
      'feature should be an ol.Feature');
  this.addFeature_(/** @type {ol.Feature} */ (feature));
};


/**
 * @param {ol.events.Event} evt Event.
 * @private
 */
exports.prototype.handleFeatureChange_ = function(evt) {
  var feature = /** @type {ol.Feature} */ (evt.target);
  this.removeFeature_(feature);
  this.addFeature_(feature);
};


/**
 * @param {ol.Collection.Event} evt Event.
 * @private
 */
exports.prototype.handleFeatureRemove_ = function(evt) {
  var feature = /** @type {ol.Feature} */ (evt.element);
  this.removeFeature_(feature);
};


/**
 * @param {ol.Feature} feature Feature
 * @param {ol.geom.LineString} geometry Geometry.
 * @private
 */
exports.prototype.writeLineStringGeometry_ = function(feature, geometry) {
  var coordinates = geometry.getCoordinates();
  var i, ii, segment, segmentData;
  for (i = 0, ii = coordinates.length - 1; i < ii; ++i) {
    segment = coordinates.slice(i, i + 2);
    segmentData = /** @type {Object} */ ({
      feature: feature,
      geometry: geometry,
      index: i,
      segment: segment
    });
    this.rBush_.insert(olExtent.boundingExtent(segment), segmentData);
  }
};


/**
 * @param {ol.Coordinate} coordinates Coordinates.
 * @return {ol.Feature} Vertex feature.
 * @private
 */
exports.prototype.createOrUpdateVertexFeature_ = function(coordinates) {
  var vertexFeature = this.vertexFeature_;
  if (!vertexFeature) {
    vertexFeature = new olFeature(new olGeomPoint(coordinates));
    this.vertexFeature_ = vertexFeature;
    this.overlay_.getSource().addFeature(vertexFeature);
  } else {
    var geometry = /** @type {ol.geom.Point} */ (vertexFeature.getGeometry());
    geometry.setCoordinates(coordinates);
  }
  return vertexFeature;
};


/**
 * @param {Object} a The first segment data.
 * @param {Object} b The second segment data.
 * @return {number} The difference in indexes.
 * @private
 */
exports.compareIndexes_ = function(a, b) {
  return a.index - b.index;
};


/**
 * @param {ol.MapBrowserPointerEvent} evt Event.
 * @return {boolean} Stop drag sequence?
 * @this {app.interaction.ClipLine}
 * @private
 */
exports.handleUpEvent_ = function(evt) {
  this.handlingDownUpSequence = false;
  return false;
};


/**
 * @param {ol.MapBrowserPointerEvent} evt Event.
 * @return {boolean} Start drag sequence?
 * @this {app.interaction.ClipLine}
 * @private
 */
exports.handleDownEvent_ = function(evt) {
  this.handlePointerAtPixel_(evt.pixel, evt.map);
  this.dragSegments_ = [];
  this.modified_ = false;
  var vertexFeature = this.vertexFeature_;
  if (vertexFeature) {
    var geometry = /** @type {ol.geom.Point} */ (vertexFeature.getGeometry());
    var vertex = geometry.getCoordinates();
    var vertexExtent = olExtent.boundingExtent([vertex]);
    var segmentDataMatches = this.rBush_.getInExtent(vertexExtent);
    segmentDataMatches.sort(exports.compareIndexes_);
    for (var i = 0, ii = segmentDataMatches.length; i < ii; ++i) {
      var segmentDataMatch = segmentDataMatches[i];
      if (segmentDataMatch.feature !== undefined &&
          this.features_.getArray().indexOf(segmentDataMatch.feature) >= 0) {
        var closestVertex = olCoordinate.closestOnSegment(vertex, segmentDataMatch.segment);
        if (!olCoordinate.equals(closestVertex, vertex)) {
          continue;
        }
        this.features_.remove(segmentDataMatch.feature);
        var feature1 = segmentDataMatch.feature.clone();
        var feature2 = segmentDataMatch.feature.clone();
        var geometry1 = /** @type {ol.geom.LineString} */ (feature1.getGeometry());
        var geometry2 = /** @type {ol.geom.LineString} */ (feature2.getGeometry());
        var origLineStringGeom = /** @type {ol.geom.LineString} */ (segmentDataMatch.feature.getGeometry());
        var coordsPart1 = origLineStringGeom.getCoordinates().slice(0, [segmentDataMatch.index + 1]);
        coordsPart1.push(vertex);
        var coordsPart2 = origLineStringGeom.getCoordinates().slice([segmentDataMatch.index + 1]);
        coordsPart1.push(vertex);
        coordsPart2.splice(0, 0, vertex);
        geometry1.setCoordinates(coordsPart1);
        geometry2.setCoordinates(coordsPart2);
        this.features_.push(feature1);
        this.features_.push(feature2);

        this.dispatchEvent(new  olInteractionModify.Event(
          olInteractionModifyEventType.MODIFYEND, new olCollection([feature1, feature2, segmentDataMatch.feature]), evt));
        this.modified_ = true;
      }
    }
  }
  this.handlePointerAtPixel_(evt.pixel, evt.map);
  return !!this.vertexFeature_;
};


/**
 * Handles the {@link ol.MapBrowserEvent map browser event} and may modify the
 * geometry.
 * @param {ol.MapBrowserEvent} mapBrowserEvent Map browser event.
 * @return {boolean} `false` to stop event propagation.
 * @this {app.interaction.ClipLine}
 * @api
 */
exports.handleEvent = function(mapBrowserEvent) {
  if (!(mapBrowserEvent instanceof olMapBrowserPointerEvent)) {
    return true;
  }

  if (!mapBrowserEvent.map.getView().getHints()[olBase.ViewHint.INTERACTING] &&
      mapBrowserEvent.type == olMapBrowserEventType.POINTERMOVE &&
      !this.handlingDownUpSequence) {
    this.handlePointerMove_(mapBrowserEvent);
  }

  return olInteractionPointer.handleEvent.call(this, mapBrowserEvent);
};


/**
 * @inheritDoc
 */
exports.prototype.setActive = function(active) {
  this.handlingDownUpSequence = false;
  if (this.overlay_ !== undefined) {
    if (this.vertexFeature_) {
      this.overlay_.getSource().removeFeature(this.vertexFeature_);
      this.vertexFeature_ = null;
    }
  }
  var map = this.getMap();
  if (map) {
    if (active) {
      map.getTargetElement().style.cursor = 'crosshair';
    } else {
      map.getTargetElement().style.cursor = '';
    }
  }
  olInteractionInteraction.prototype.setActive.call(this, active);
};

/**
 * @param {ol.MapBrowserEvent} evt Event.
 * @private
 */
exports.prototype.handlePointerMove_ = function(evt) {
  this.lastPixel_ = evt.pixel;
  this.handlePointerAtPixel_(evt.pixel, evt.map);
};

/**
 * @param {ol.Pixel} pixel Pixel
 * @param {ol.PluggableMap} map Map.
 * @private
 */
exports.prototype.handlePointerAtPixel_ = function(pixel, map) {
  if (!this.getActive()) {
    return;
  }
  var pixelCoordinate = map.getCoordinateFromPixel(pixel);
  var sortByDistance = function(a, b) {
    return olCoordinate.squaredDistanceToSegment(pixelCoordinate, a.segment) -
        olCoordinate.squaredDistanceToSegment(pixelCoordinate, b.segment);
  };

  var box = olExtent.buffer(
      olExtent.createOrUpdateFromCoordinate(pixelCoordinate),
      map.getView().getResolution() * this.pixelTolerance_);

  var rBush = this.rBush_;
  var nodes = rBush.getInExtent(box);
  if (nodes.length > 0) {
    nodes.sort(sortByDistance);
    var node = nodes[0];
    var closestSegment = node.segment;
    var vertex = (olCoordinate.closestOnSegment(pixelCoordinate,
        closestSegment));
    var vertexPixel = map.getPixelFromCoordinate(vertex);
    if (Math.sqrt(olCoordinate.squaredDistance(pixel, vertexPixel)) <=
        this.pixelTolerance_) {
      var pixel1 = map.getPixelFromCoordinate(closestSegment[0]);
      var pixel2 = map.getPixelFromCoordinate(closestSegment[1]);
      var squaredDist1 = olCoordinate.squaredDistance(vertexPixel, pixel1);
      var squaredDist2 = olCoordinate.squaredDistance(vertexPixel, pixel2);
      var dist = Math.sqrt(Math.min(squaredDist1, squaredDist2));
      this.snappedToVertex_ = dist <= this.pixelTolerance_;
      if (this.snappedToVertex_) {
        vertex = squaredDist1 > squaredDist2 ?
            closestSegment[1] : closestSegment[0];
      }
      this.createOrUpdateVertexFeature_(vertex);

      return;
    }
  }
  if (this.vertexFeature_) {
    this.overlay_.getSource().removeFeature(this.vertexFeature_);
    this.vertexFeature_ = null;
  }
};


/**
 * @return {ol.StyleFunction} Styles.
 */
exports.getDefaultStyleFunction = function() {
  var style = olStyleStyle.createDefaultEditing();
  return function(feature, resolution) {
    return style[olGeomGeometryType.POINT];
  };
};


export default exports;
