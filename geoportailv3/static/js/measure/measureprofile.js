goog.provide('app.interaction');
goog.provide('app.interaction.MeasureProfile');

goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('goog.events');
goog.require('ol.DrawEvent');
goog.require('ol.DrawEventType');
goog.require('ol.Feature');
goog.require('ol.FeatureOverlay');
goog.require('ol.MapBrowserEvent');
goog.require('ol.Observable');
goog.require('ol.Overlay');
goog.require('ol.format.GeoJSON');
goog.require('ol.interaction.Interaction');
goog.require('ol.style.Style');


/**
 * Interactions for measure tools base class.
 * @typedef {{
 *    startMsg: (string|undefined),
 *    style:(ol.style.Style|Array.<ol.style.Style>|ol.style.StyleFunction|undefined)
 * }}
 */
app.interaction.MeasureBaseOptions;



/**
 * Interaction that allows measuring (length, area, ...).
 *
 * @constructor
 * @extends {ol.interaction.Interaction}
 * @param {app.interaction.MeasureBaseOptions=} opt_options Options
 */
app.interaction.MeasureProfile = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

  goog.base(this, {
    handleEvent: app.interaction.MeasureProfile.handleEvent_
  });


  /**
   * The help tooltip element.
   * @type {Element}
   * @private
   */
  this.helpTooltipElement_ = null;


  /**
   * Overlay to show the help messages.
   * @type {ol.Overlay}
   * @private
   */
  this.helpTooltip_ = null;


  /**
   * The measure tooltip element.
   * @type {Element}
   * @private
   */
  this.measureTooltipElement_ = null;


  /**
   * Overlay to show the measurement.
   * @type {ol.Overlay}
   * @private
   */
  this.measureTooltip_ = null;


  /**
   * The sketch feature.
   * @type {ol.Feature}
   * @protected
   */
  this.sketchFeature = null;

  /**
   * The message to show when user is about to start drawing.
   * @type {string}
   */
  this.startMsg = goog.isDef(options.startMsg) ? options.startMsg :
      'Click to start drawing';

  var style = goog.isDef(options.style) ? options.style :
      [
        new ol.style.Style({
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: 'white',
            width: 5
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 3
          })
        })
      ];

  /**
   * The draw overlay
   * @type {ol.FeatureOverlay}
   * @private
   */
  this.overlay_ = new ol.FeatureOverlay({
    style: style
  });

  /**
   * Message to show after the first point is clicked.
   * @type {string}
   * @private
   */
  this.continueMsg_ = goog.isDef(options.continueMsg) ? options.continueMsg :
      'Click to continue drawing the line<br>' +
      'Double-click or click last point to finish';

  /**
   * The draw interaction to be used.
   * @type {ol.interaction.Draw|ngeo.interaction.DrawAzimut}
   */
  this.drawInteraction = this.getDrawInteraction(options.sketchStyle,
      this.overlay_);

  goog.events.listen(this.drawInteraction, ol.DrawEventType.DRAWSTART,
      this.onDrawStart_, false, this);
  goog.events.listen(this.drawInteraction, ol.DrawEventType.DRAWEND,
      this.onDrawEnd_, false, this);

  goog.events.listen(this,
      ol.Object.getChangeEventType(ol.interaction.InteractionProperty.ACTIVE),
      this.updateState_, false, this);
};
goog.inherits(app.interaction.MeasureProfile, ol.interaction.Interaction);


/**
 * Handle map browser event.
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `false` if event propagation should be stopped.
 * @this {app.interaction.MeasureProfile}
 * @private
 */
app.interaction.MeasureProfile.handleEvent_ = function(evt) {
  if (evt.type != ol.MapBrowserEvent.EventType.POINTERMOVE || evt.dragging) {
    return true;
  }

  var helpMsg = this.startMsg;
  if (!goog.isNull(this.sketchFeature)) {
    this.handleMeasure(goog.bind(function(measure, coord, helpMsg_) {
      if (!goog.isNull(coord)) {
        this.measureTooltipElement_.innerHTML = measure;
        this.measureTooltip_.setPosition(coord);
      }
      helpMsg = helpMsg_;
    }, this));
  }

  this.helpTooltipElement_.innerHTML = helpMsg;
  this.helpTooltip_.setPosition(evt.coordinate);

  return true;
};


/**
 * Creates the draw interaction.
 * @param {ol.style.Style|Array.<ol.style.Style>|ol.style.StyleFunction|undefined}
 *     style The sketchStyle used for the drawing interaction.
 * @param {ol.FeatureOverlay} overlay The feature overlay.
 * @return {ol.interaction.Draw|ngeo.interaction.DrawAzimut}
 * @protected
 */
app.interaction.MeasureProfile.prototype.getDrawInteraction = function(style,
    overlay) {

  return new ol.interaction.Draw(
      /** @type {olx.interaction.DrawOptions} */ ({
        type: 'LineString',
        features: overlay.getFeatures(),
        style: style
      }));

};


/**
 * @inheritDoc
 */
app.interaction.MeasureProfile.prototype.setMap = function(map) {
  goog.base(this, 'setMap', map);

  this.overlay_.setMap(map);

  var prevMap = this.drawInteraction.getMap();
  if (!goog.isNull(prevMap)) {
    prevMap.removeInteraction(this.drawInteraction);
  }

  if (!goog.isNull(map)) {
    map.addInteraction(this.drawInteraction);
  }
};


/**
 * Handle draw interaction `drawstart` event.
 * @param {ol.DrawEvent} evt
 * @private
 */
app.interaction.MeasureProfile.prototype.onDrawStart_ = function(evt) {
  this.sketchFeature = evt.feature;
  this.overlay_.getFeatures().clear();
  this.createMeasureTooltip_();
};


/**
 * Handle draw interaction `drawend` event.
 * @param {ol.DrawEvent} evt
 * @private
 */
app.interaction.MeasureProfile.prototype.onDrawEnd_ = function(evt) {
  goog.dom.classlist.add(this.measureTooltipElement_, 'tooltip-static');
  this.measureTooltip_.setOffset([0, -7]);

  this.sketchFeature = null;
  this.removeMeasureTooltip_();
};


/**
 * Creates a new help tooltip
 * @private
 */
app.interaction.MeasureProfile.prototype.createHelpTooltip_ = function() {
  this.removeHelpTooltip_();
  this.helpTooltipElement_ = goog.dom.createDom(goog.dom.TagName.DIV);
  goog.dom.classlist.add(this.helpTooltipElement_, 'tooltip');
  this.helpTooltip_ = new ol.Overlay({
    element: this.helpTooltipElement_,
    offset: [15, 0],
    positioning: 'center-left'
  });
  this.getMap().addOverlay(this.helpTooltip_);
};


/**
 * Destroy the help tooltip
 * @private
 */
app.interaction.MeasureProfile.prototype.removeHelpTooltip_ = function() {
  this.getMap().removeOverlay(this.helpTooltip_);
  if (!goog.isNull(this.helpTooltipElement_)) {
    this.helpTooltipElement_.parentNode.removeChild(this.helpTooltipElement_);
  }
  this.helpTooltipElement_ = null;
  this.helpTooltip_ = null;
};


/**
 * Creates a new measure tooltip
 * @private
 */
app.interaction.MeasureProfile.prototype.createMeasureTooltip_ = function() {
  this.removeMeasureTooltip_();
  this.measureTooltipElement_ = goog.dom.createDom(goog.dom.TagName.DIV);
  goog.dom.classlist.addAll(this.measureTooltipElement_,
      ['tooltip', 'tooltip-measure']);
  this.measureTooltip_ = new ol.Overlay({
    element: this.measureTooltipElement_,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  this.getMap().addOverlay(this.measureTooltip_);
};


/**
 * Destroy the help tooltip
 * @private
 */
app.interaction.MeasureProfile.prototype.removeMeasureTooltip_ = function() {
  if (!goog.isNull(this.measureTooltipElement_)) {
    this.measureTooltipElement_.parentNode.removeChild(
        this.measureTooltipElement_);
    this.measureTooltipElement_ = null;
    this.measureTooltip_ = null;
  }
};


/**
 * @private
 */
app.interaction.MeasureProfile.prototype.updateState_ = function() {
  var active = this.getActive();
  this.drawInteraction.setActive(active);
  if (!this.getMap()) {
    return;
  }
  if (active) {
    this.createMeasureTooltip_();
    this.createHelpTooltip_();
  } else {
    this.overlay_.getFeatures().clear();
    this.getMap().removeOverlay(this.measureTooltip_);
    this.removeMeasureTooltip_();
    this.removeHelpTooltip_();
  }
};


/**
 * Function implemented in inherited classes to compute measurement, determine
 * where to place the tooltip and determine which help message to display.
 * @param {function(string, ?ol.Coordinate, string)} callback The function
 * to be called.
 * @protected
 */
app.interaction.MeasureProfile.prototype.handleMeasure = function(callback) {
  var geom = /** @type {ol.geom.LineString} */
      (this.sketchFeature.getGeometry());
  var output = this.formatMeasure_(geom);
  var coord = geom.getLastCoordinate();
  callback(output, coord, this.continueMsg_);
};


/**
 * Format measure output.
 * @param {ol.geom.LineString} line
 * @return {string}
 * @private
 */
app.interaction.MeasureProfile.prototype.formatMeasure_ = function(line) {
  var length = 0;
  var map = this.getMap();
  var sourceProj = map.getView().getProjection();
  var coordinates = line.getCoordinates();
  for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
    var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
    var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
    length += ol.sphere.WGS84.haversineDistance(c1, c2);
  }
  var output;
  if (length > 1000) {
    output = parseFloat((length / 1000).toPrecision(3)) +
        ' ' + 'km';
  } else {
    output = parseFloat(length.toPrecision(3)) +
        ' ' + 'm';
  }
  return output;
};
