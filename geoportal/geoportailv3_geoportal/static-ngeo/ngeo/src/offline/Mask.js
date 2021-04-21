import Layer from 'ol/layer/Layer.js';
import {createCanvasContext2D} from 'ol/dom.js';
import {toRadians} from 'ol/math.js';
import {DEVICE_PIXEL_RATIO} from 'ol/has.js';


/**
 * @extends {Layer<any>}
 */
export default class Mask extends Layer {
  constructor(options = {}) {
    super(options);

    /**
     * @private
     */
    this.context_ = createCanvasContext2D();

    this.context_.canvas.style.opacity = '0.5';
    this.context_.canvas.style.position = 'absolute';

    /**
     * @type {number}
     */
    this.margin_ = options.margin || 100;

    /**
     * @type {number}
     */
    this.extentInMeters_ = options.extentInMeters || 0;
  }


  /**
   * @param {number[]} center, a xy point.
   * @param {number} halfLength a half length of a square's side.
   * @return {number[]} an extent.
   */
  createExtent(center, halfLength) {
    const minx = center[0] - halfLength;
    const miny = center[1] - halfLength;
    const maxx = center[0] + halfLength;
    const maxy = center[1] + halfLength;
    return [minx, miny, maxx, maxy];
  }

  /**
   * @param {import("ol/PluggableMap").FrameState} frameState
   */
  render(frameState) {
    const cwidth = this.context_.canvas.width = frameState.size[0];
    const cheight = this.context_.canvas.height = frameState.size[1];

    const context = this.context_;
    // background (clockwise)
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(cwidth, 0);
    context.lineTo(cwidth, cheight);
    context.lineTo(0, cheight);
    context.lineTo(0, 0);
    context.closePath();

    const extentLength = this.extentInMeters_ ?
      DEVICE_PIXEL_RATIO * this.extentInMeters_ / frameState.viewState.resolution :
      Math.min(cwidth, cheight) - this.margin_ * 2;

    // Draw the get data zone
    const extent = this.createExtent([cwidth / 2, cheight / 2], Math.ceil(extentLength / 2));

    context.moveTo(extent[0], extent[1]);
    context.lineTo(extent[0], extent[3]);
    context.lineTo(extent[2], extent[3]);
    context.lineTo(extent[2], extent[1]);
    context.lineTo(extent[0], extent[1]);
    context.closePath();

    // Fill the mask
    context.fillStyle = 'rgba(0, 5, 25, 0.5)';
    context.fill();

    return context.canvas;
  }
}
