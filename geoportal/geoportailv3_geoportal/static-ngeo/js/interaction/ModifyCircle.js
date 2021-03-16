/**
 * @module app.interaction.ModifyCircle
 */
import ngeoInteractionCommon from 'ngeo/interaction/common.js';
import ViewHint from 'ol/ViewHint.js';
import olFeature from 'ol/Feature.js';
import olMapBrowserPointerEvent from 'ol/MapBrowserPointerEvent.js';
import {equals, squaredDistanceToSegment, closestOnSegment, squaredDistance} from 'ol/coordinate.js';
import {listen, unlisten} from 'ol/events.js';
import {boundingExtent, getCenter} from 'ol/extent.js';
import olGeomGeometryType from 'ol/geom/GeometryType.js';
import olGeomCircle from 'ol/geom/Circle.js';
import olGeomLineString from 'ol/geom/LineString.js';
import olGeomPoint from 'ol/geom/Point.js';
import {fromCircle} from 'ol/geom/Polygon.js';
import Interaction from 'ol/interaction/Interaction.js';
import {ModifyEvent} from 'ol/interaction/Modify.js';
import olInteractionPointer, {handleEvent as pointerHandleEvent} from 'ol/interaction/Pointer.js';
import olLayerVector from 'ol/layer/Vector.js';
import olSourceVector from 'ol/source/Vector.js';
import olStructsRBush from 'ol/structs/RBush.js';
import {inherits, getUid} from 'ol/index.js';


/**
 * @typedef {{
 *   depth: (Array.<number>|undefined),
 *            feature: ol.Feature,
 *            geometry: ol.geom.SimpleGeometry,
 *            index: (number|undefined),
 *            segment: Array.<ol.Extent>
 * }}
 */
// eslint-disable-next-line no-unused-vars
let SegmentDataType;


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
    handleDragEvent: exports.handleDragEvent_,
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
   * @type {ol.structs.RBush.<SegmentDataType>}
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
   * Indicate whether the interaction is currently changing a feature's
   * coordinates.
   * @type {boolean}
   * @private
   */
  this.changingFeature_ = false;

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

  console.assert(options.features !== null && options.features !== undefined);
  /**
   * @type {ol.Collection.<ol.Feature>}
   * @private
   */
  this.features_ = /** @type {!ol.Collection.<ol.Feature>} */ (options.features);

  this.features_.forEach(this.addFeature_, this);
  listen(this.features_, 'add',
      this.handleFeatureAdd_, this);
  listen(this.features_, 'remove',
      this.handleFeatureRemove_, this);

};

inherits(exports, olInteractionPointer);


/**
 * @param {ol.Feature} feature Feature.
 * @private
 */
exports.prototype.addFeature_ = function(feature) {
  if (feature.getGeometry().getType() === olGeomGeometryType.POLYGON &&
      !!feature.get('isCircle')) {
    var geometry = /** @type {ol.geom.Polygon}*/ (feature.getGeometry());
    this.writeCircleGeometry_(feature, geometry);

    var map = this.getMap();
    if (map) {
      this.handlePointerAtPixel_(this.lastPixel_, map);
    }
    listen(feature, 'change',
        this.handleFeatureChange_, this);
  }
};


/**
 * @param {ol.MapBrowserPointerEvent} evt Map browser event
 * @private
 */
exports.prototype.willModifyFeatures_ = function(evt) {
  if (!this.modified_) {
    this.modified_ = true;
    this.dispatchEvent(new ModifyEvent(
        'modifystart', this.features_, evt));
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
  unlisten(feature, 'change',
      this.handleFeatureChange_, this);
};


/**
 * @param {ol.Feature} feature Feature.
 * @private
 */
exports.prototype.removeFeatureSegmentData_ = function(feature) {
  var rBush = this.rBush_;
  var /** @type {Array.<SegmentDataType>} */ nodesToRemove = [];
  rBush.forEach(
      /**
       * @param {SegmentDataType} node RTree node.
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
  Interaction.prototype.setMap.call(this, map);
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
  if (!this.changingFeature_) {
    var feature = /** @type {ol.Feature} */ (evt.target);
    this.removeFeature_(feature);
    this.addFeature_(feature);
  }
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
 * @param {ol.geom.Polygon} geometry Geometry.
 * @private
 */
exports.prototype.writeCircleGeometry_ = function(feature, geometry) {
  var rings = geometry.getCoordinates();
  var coordinates, i, ii, j, jj, segment, segmentData;
  for (j = 0, jj = rings.length; j < jj; ++j) {
    coordinates = rings[j];
    for (i = 0, ii = coordinates.length - 1; i < ii; ++i) {
      segment = coordinates.slice(i, i + 2);
      segmentData = /** @type {SegmentDataType} */ ({
        feature: feature,
        geometry: geometry,
        depth: [j],
        index: i,
        segment: segment
      });
      this.rBush_.insert(boundingExtent(segment), segmentData);
    }
  }
};


/**
 * @param {ol.Coordinate} coordinates Coordinates.
 * @return {ol.Feature} Vertex feature.
 * @private
 */
exports.prototype.createOrUpdateVertexFeature_ =
    function(coordinates) {
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
 * @param {SegmentDataType} a The first segment data.
 * @param {SegmentDataType} b The second segment data.
 * @return {number} The difference in indexes.
 * @private
 */
exports.compareIndexes_ = function(a, b) {
  return a.index - b.index;
};


/**
 * @param {ol.MapBrowserPointerEvent} evt Event.
 * @return {boolean} Start drag sequence?
 * @this {app.interaction.ModifyCircle}
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
    var vertexExtent = boundingExtent([vertex]);
    var segmentDataMatches = this.rBush_.getInExtent(vertexExtent);
    var componentSegments = {};
    segmentDataMatches.sort(exports.compareIndexes_);
    for (var i = 0, ii = segmentDataMatches.length; i < ii; ++i) {
      var segmentDataMatch = segmentDataMatches[i];
      var segment = segmentDataMatch.segment;
      var uid = getUid(segmentDataMatch.feature);
      var depth = segmentDataMatch.depth;
      if (depth) {
        uid += '-' + depth.join('-'); // separate feature components
      }
      if (!componentSegments[uid]) {
        componentSegments[uid] = new Array(2);
      }
      if (equals(segment[0], vertex) &&
          !componentSegments[uid][0]) {
        this.dragSegments_.push([segmentDataMatch, 0]);
        componentSegments[uid][0] = segmentDataMatch;
      } else if (equals(segment[1], vertex) &&
          !componentSegments[uid][1]) {
        this.dragSegments_.push([segmentDataMatch, 1]);
        componentSegments[uid][1] = segmentDataMatch;
      }
    }
  }
  return !!this.vertexFeature_;
};


/**
 * @param {ol.MapBrowserPointerEvent} evt Event.
 * @this {app.interaction.ModifyCircle}
 * @private
 */
exports.handleDragEvent_ = function(evt) {
  this.willModifyFeatures_(evt);
  var vertex = evt.coordinate;
  var geometry =
      /** @type {ol.geom.Polygon}*/ (this.dragSegments_[0][0].geometry);
  var center = getCenter(geometry.getExtent());

  var line = new olGeomLineString([center, vertex]);


  /**
   * @type {ol.geom.Circle}
   */
  var circle = new olGeomCircle(center, line.getLength());
  var coordinates = fromCircle(circle, 64).getCoordinates();
  this.setGeometryCoordinates_(geometry, coordinates);

  this.createOrUpdateVertexFeature_(vertex);
};


/**
 * @param {ol.MapBrowserPointerEvent} evt Event.
 * @return {boolean} Stop drag sequence?
 * @this {app.interaction.ModifyCircle}
 * @private
 */
exports.handleUpEvent_ = function(evt) {
  this.rBush_.clear();
  this.writeCircleGeometry_(this.dragSegments_[0][0].feature,
      this.dragSegments_[0][0].geometry);

  if (this.modified_) {
    this.dispatchEvent(new ModifyEvent(
        'modifyend', this.features_, evt));
    this.modified_ = false;
  }
  return false;
};


/**
 * Handles the {@link ol.MapBrowserEvent map browser event} and may modify the
 * geometry.
 * @param {ol.MapBrowserEvent} mapBrowserEvent Map browser event.
 * @return {boolean} `false` to stop event propagation.
 * @this {app.interaction.ModifyCircle}
 * @api
 */
exports.handleEvent = function(mapBrowserEvent) {
  if (!(mapBrowserEvent instanceof olMapBrowserPointerEvent)) {
    return true;
  }

  var handled;
  if (!mapBrowserEvent.map.getView().getHints()[ViewHint.INTERACTING] &&
      mapBrowserEvent.type == 'pointermove' &&
      !this.handlingDownUpSequence) {
    this.handlePointerMove_(mapBrowserEvent);
  }

  return pointerHandleEvent.call(this, mapBrowserEvent) && !handled;
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
  var pixelCoordinate = map.getCoordinateFromPixel(pixel);
  var sortByDistance = function(a, b) {
    return squaredDistanceToSegment(pixelCoordinate, a.segment) -
        squaredDistanceToSegment(pixelCoordinate, b.segment);
  };

  var lowerLeft = map.getCoordinateFromPixel(
      [pixel[0] - this.pixelTolerance_, pixel[1] + this.pixelTolerance_]);
  var upperRight = map.getCoordinateFromPixel(
      [pixel[0] + this.pixelTolerance_, pixel[1] - this.pixelTolerance_]);
  var box = boundingExtent([lowerLeft, upperRight]);

  var rBush = this.rBush_;
  var nodes = rBush.getInExtent(box);
  if (nodes.length > 0) {
    nodes.sort(sortByDistance);
    var node = nodes[0];
    var closestSegment = node.segment;
    var vertex = (closestOnSegment(pixelCoordinate,
        closestSegment));
    var vertexPixel = map.getPixelFromCoordinate(vertex);
    if (Math.sqrt(squaredDistance(pixel, vertexPixel)) <=
        this.pixelTolerance_) {
      var pixel1 = map.getPixelFromCoordinate(closestSegment[0]);
      var pixel2 = map.getPixelFromCoordinate(closestSegment[1]);
      var squaredDist1 = squaredDistance(vertexPixel, pixel1);
      var squaredDist2 = squaredDistance(vertexPixel, pixel2);
      var dist = Math.sqrt(Math.min(squaredDist1, squaredDist2));
      this.snappedToVertex_ = dist <= this.pixelTolerance_;
      if (this.snappedToVertex_) {
        vertex = squaredDist1 > squaredDist2 ?
            closestSegment[1] : closestSegment[0];
        this.createOrUpdateVertexFeature_(vertex);
        var vertexSegments = {};
        vertexSegments[getUid(closestSegment)] = true;
        var segment;
        for (var i = 1, ii = nodes.length; i < ii; ++i) {
          segment = nodes[i].segment;
          if ((equals(closestSegment[0], segment[0]) &&
              equals(closestSegment[1], segment[1]) ||
              (equals(closestSegment[0], segment[1]) &&
              equals(closestSegment[1], segment[0])))) {
            vertexSegments[getUid(segment)] = true;
          } else {
            break;
          }
        }
        return;
      }
    }
  }
  if (this.vertexFeature_) {
    this.overlay_.getSource().removeFeature(this.vertexFeature_);
    this.vertexFeature_ = null;
  }
};


/**
 * @param {ol.geom.SimpleGeometry} geometry Geometry.
 * @param {Array} coordinates Coordinates.
 * @private
 */
exports.prototype.setGeometryCoordinates_ =
    function(geometry, coordinates) {
      this.changingFeature_ = true;
      geometry.setCoordinates(coordinates);
      this.changingFeature_ = false;
    };


/**
 * @return {ol.StyleFunction} Styles.
 */
exports.getDefaultStyleFunction = function() {
  var style = ngeoInteractionCommon.getDefaultModifyStyleFunction();
  return function(feature, resolution) {
    return style[olGeomGeometryType.POINT];
  };
};


export default exports;
