/**
 * @module ngeo.interaction.DrawRegularPolygonFromClick
 */
import googAsserts from 'goog/asserts.js';
import ngeoCustomEvent from 'ngeo/CustomEvent.js';
import * as olBase from 'ol/index.js';
import * as olEvents from 'ol/events.js';
import olFeature from 'ol/Feature.js';
import * as olFunctions from 'ol/functions.js';
import olGeomCircle from 'ol/geom/Circle.js';
import {fromCircle, makeRegular} from 'ol/geom/Polygon.js';
import olInteractionInteraction from 'ol/interaction/Interaction.js';

class DrawRegularPolygonFromClick extends olInteractionInteraction {
  /**
   * @classdesc
   * This interactions allows drawing regular polygons of a pre-determined number
   * of sides and size a a clicked location on the map.
   *
   * @constructor
   * @struct
   * @fires ngeox.DrawEvent
   * @extends {ol.interaction.Interaction}
   * @param {ngeox.interaction.DrawRegularPolygonFromClickOptions} options Options
   */
  constructor(options) {
    super({
      handleEvent: olFunctions.TRUE
    });


    /**
     * @type {number}
     * @private
     */
    this.angle_ = options.angle !== undefined ? options.angle : 0;

    /**
     * @type {number}
     * @private
     */
    this.radius_ = options.radius;

    /**
     * @type {number}
     * @private
     */
    this.sides_ = options.sides !== undefined ? options.sides : 3;

    /**
     * @type {!Array.<ol.EventsKey>}
     * @private
     */
    this.listenerKeys_ = [];

  };

  /**
   * Activate or deactivate the interaction.
   * @param {boolean} active Active.
   * @override
   */
  setActive(active) {
    olInteractionInteraction.prototype.setActive.call(this, active);

    if (this.getMap()) {
      if (active) {
        this.enable_();
      } else {
        this.disable_();
      }
    }
  };


  /**
   * @inheritDoc
   */
  setMap(map) {

    const active = this.getActive();

    const currentMap = this.getMap();
    if (currentMap && active) {
      this.disable_();
    }

    olInteractionInteraction.prototype.setMap.call(this, map);

    if (map && active) {
      this.enable_();
    }

  };


  /**
   * Enable the interaction. Called when added to a map AND active.
   * @private
   */
  enable_() {
    const map = this.getMap();
    googAsserts.assert(map, 'Map should be set.');
    this.listenerKeys_.push(
      olEvents.listen(map, 'click', this.handleMapClick_, this)
    );
  };


  /**
   * Disable the interaction. Called when removed from a map or deactivated.
   * @private
   */
  disable_() {
    const map = this.getMap();
    googAsserts.assert(map, 'Map should be set.');
    this.listenerKeys_.forEach(olEvents.unlistenByKey);
    this.listenerKeys_.length = 0;
  };


  /**
   * Called the the map is clicked. Create a regular polygon at the clicked
   * location using the configuration
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * @private
   */
  handleMapClick_(evt) {
    const center = evt.coordinate;
    const geometry = fromCircle(
      new olGeomCircle(center), this.sides_
    );

    makeRegular(geometry, center, this.radius_, this.angle_);


    /** @type {ngeox.DrawEvent} */
    const event = new ngeoCustomEvent('drawend', {feature: new olFeature(geometry)});
    this.dispatchEvent(event);
  };
}

export default DrawRegularPolygonFromClick;
