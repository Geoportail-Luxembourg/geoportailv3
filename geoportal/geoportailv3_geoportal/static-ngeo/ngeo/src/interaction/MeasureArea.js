/**
 * @module ngeo.interaction.MeasureArea
 */
import googAsserts from 'goog/asserts.js';
import ngeoInteractionMeasure from 'ngeo/interaction/Measure.js';
import * as olBase from 'ol/index.js';
import olGeomPolygon from 'ol/geom/Polygon.js';
import olInteractionDraw from 'ol/interaction/Draw.js';

class MeasureArea extends ngeoInteractionMeasure{
  /**
   * @classdesc
   * Interaction dedicated to measure length.
   *
   * See our live example: [../examples/measure.html](../examples/measure.html)
   *
   * @constructor
   * @struct
   * @extends {ngeo.interaction.Measure}
   * @param {!ngeox.unitPrefix} format The format function
   * @param {!angularGettext.Catalog} gettextCatalog Gettext catalog.
   * @param {ngeox.interaction.MeasureOptions=} options Options
   */
  constructor(format, gettextCatalog, options = {}) {

    super(options);


    /**
     * Message to show after the first point is clicked.
     * @type {Element}
     */
    this.continueMsg;
    if (options.continueMsg !== undefined) {
      this.continueMsg = options.continueMsg;
    } else {
      this.continueMsg = document.createElement('span');
      this.continueMsg.textContent = gettextCatalog.getString('Click to continue drawing the polygon.');
      const br = document.createElement('br');
      br.textContent = gettextCatalog.getString('Double-click or click starting point to finish.');
      this.continueMsg.appendChild(br);
    }

    /**
     * The format function
     * @type {ngeox.unitPrefix}
     */
    this.format = format;

  };


  /**
   * @inheritDoc
   */
  createDrawInteraction(style, source) {
    return new olInteractionDraw({
      type: /** @type {ol.geom.GeometryType} */ ('Polygon'),
      source: source,
      style: style
    });
  };


  /**
   * @inheritDoc
   */
  handleMeasure(callback) {
    const geom = googAsserts.assertInstanceof(this.sketchFeature.getGeometry(), olGeomPolygon);
    const proj = this.getMap().getView().getProjection();
    googAsserts.assert(proj);
    const output = ngeoInteractionMeasure.prototype.getFormattedArea(geom, proj, this.precision, this.format);
    const verticesCount = geom.getCoordinates()[0].length;
    let coord = null;
    if (verticesCount > 3) {
      coord = geom.getInteriorPoint().getCoordinates();
    }
    callback(output, coord);
  };
}

export default MeasureArea;
