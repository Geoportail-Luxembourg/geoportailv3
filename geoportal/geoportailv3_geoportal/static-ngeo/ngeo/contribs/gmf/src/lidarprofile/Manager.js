/**
 * @module gmf.lidarprofile.Manager
 */
import gmfLidarprofileMeasure from './Measure.js';
import gmfLidarprofilePlot from './Plot.js';
import gmfLidarprofileUtils from './Utils.js';
import ngeoDownloadCsv from 'ngeo/download/Csv.js';
import olLayerVector from 'ol/layer/Vector.js';
import olOverlay from 'ol/Overlay.js';
import olSourceVector from 'ol/source/Vector.js';
import olStyleFill from 'ol/style/Fill.js';
import olStyleCircle from 'ol/style/Circle.js';
import olStyleStyle from 'ol/style/Style.js';
import {select} from 'd3-selection';
import i18next from 'i18next';
const d3 = {
  select,
};

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

const gettextCatalog = { getString: str => str }

export class LidarManager {

  /**
   * Provides a service to manage a D3js component to be used to draw an lidar point cloud profile chart.
   * Requires access to a Pytree webservice: https://github.com/sitn/pytree
   *
   * @struct
   * @ngdoc service
   * @ngname gmflidarprofileManager
   */
  constructor() {

    /**
     * @type {angularGettext.Catalog}
     */
    this.gettextCatalog = gettextCatalog;

    /**
     * @type {ngeo.misc.Debounce}
     * @private
     */
    this.ngeoDebounce_ = debounce;

    /**
     * @type {?angular.$q.Promise}
     * @private
     */
    this.promise = null;

    /**
     * @type {gmf.lidarprofile.Plot}
     */
    this.plot = null;

    /**
     * @type {gmf.lidarprofile.Measure}
     */
    this.measure = null;

    /**
     * @type {gmf.lidarprofile.Config}
     */
    this.config = null;

    /**
     * @type {ol.Map}
     * @private
     */
    this.map_ = null;

    /**
     * The hovered point attributes in D3 profile highlighted on the 2D map
     * @type {ol.Overlay}
     */
    this.cartoHighlight = new olOverlay({
      offset: [0, -15],
      positioning: 'bottom-center'
    });

    /**
     * The hovered point geometry (point) in D3 profile highlighted on the 2D map
     * @type {ol.layer.Vector}
     */
    this.lidarPointHighlight = new olLayerVector({
      source: new olSourceVector({}),
      style: new olStyleStyle({
        image: new olStyleCircle({
          fill: new olStyleFill({
            color: 'rgba(0, 0, 255, 1)'
          }),
          radius: 3
        })
      })
    });

    /**
     * The profile footpring represented as a LineString represented
     * with real mapunites stroke width
     * @type {ol.layer.Vector}
     */
    this.lidarBuffer = new olLayerVector({
      source: new olSourceVector({})
    });


    /**
     * The variable where all points of the profile are stored
     * @type {gmfx.LidarprofilePoints}
     */
    this.profilePoints = this.getEmptyProfilePoints_();

    /**
     * @type {boolean}
     * @private
     */
    this.isPlotSetup_ = false;

    /**
     * @type {ol.geom.LineString}
     * @private
     */
    this.line_;

    /**
     * @type {number}
     */
    this.width;

    /**
     * @type {gmf.lidarprofile.Utils}
     */
    this.utils = new gmfLidarprofileUtils();

  }

  /**
   * @param {gmf.lidarprofile.Config} config Instance of gmf.lidarprofile.Config
   * @param {ol.Map} map The map.
   */
  init(config, map) {
    this.config = config;
    this.plot = new gmfLidarprofilePlot(this);
    this.measure = new gmfLidarprofileMeasure(this);
    this.setMap(map);
  }

  /**
   * Clears the profile footprint
   * @export
   */
  clearBuffer() {
    if (this.lidarBuffer) {
      this.lidarBuffer.getSource().clear();
    }
  }

  clearRect() {
    const canvas = d3.select('.gmf-lidarprofile-container .lidar-canvas');
    const canvasEl = canvas.node();
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.getBoundingClientRect().width, canvasEl.getBoundingClientRect().height);
    canvas.selectAll('*').remove();
    d3.select('.gmf-lidarprofile-container .lidar-error').style('visibility', 'hidden');
    this.profilePoints = this.getEmptyProfilePoints_();
    this.line_;
    this.plot = new gmfLidarprofilePlot(this);
    this.measure = new gmfLidarprofileMeasure(this);
    this.setMap(map);
  }


  /**
   * Set the line for the profile
   * @param {ol.geom.LineString} line that defines the profile
   * @export
   */
  setLine(line) {
    this.line_ = line;
  }

  /**
   * Set the map used by the profile
   * @param {ol.Map} map The map.
   * @export
   */
  setMap(map) {
    this.map_ = map;
    this.cartoHighlight.setMap(map);
    this.lidarPointHighlight.setMap(map);
    this.lidarBuffer.setMap(map);
  }

  /**
   * @return {gmfx.LidarprofilePoints} An empty lidarprofile points object.
   * @private
   */
  getEmptyProfilePoints_() {
    return {
      distance: [],
      altitude: [],
      color_packed: [],
      intensity: [],
      classification: [],
      coords: []
    };
  }


  /**
   * Load profile data (lidar points) by successive Levels Of Details using asynchronous requests
   * @param {Array} clippedLine an array of the clipped line coordinates
   * @param {number} distanceOffset the left side of D3 profile domain at current zoom and pan configuration
   * @param {boolean} resetPlot whether to reset D3 plot or not
   * @param {number} minLOD minimum Level Of Detail
   * @param {boolean} exportLAS export LAS file
   * @param {number|undefined} userWidth The extract width.
   * @export
   */
  getProfileByLOD(clippedLine, distanceOffset, resetPlot, minLOD, exportLAS, userWidth) {

    const gettextCatalog = this.gettextCatalog;
    this.profilePoints = this.getEmptyProfilePoints_();

    if (resetPlot) {
      this.isPlotSetup_ = false;
    }

    d3.select('.gmf-lidarprofile-container .lidar-error').style('visibility', 'hidden');
    let pytreeLinestring = this.utils.getPytreeLinestring(this.line_);

    let maxLODWith;
    let lastLOD = false;
    d3.select('.gmf-lidarprofile-container .lod-info').html('');
    const max_levels = this.config.serverConfig.max_levels;
    let profileWidth = 0;

    if (distanceOffset == 0) {
      maxLODWith = this.utils.getNiceLOD(this.line_.getLength(), max_levels);
    } else {
      console.log("Plot : ", this.plot)
      const domain = this.plot.updateScaleX.domain();
      pytreeLinestring = '';

      for (let i = 0; i < clippedLine.length; i++) {
        pytreeLinestring += `{${clippedLine[i][0]},${clippedLine[i][1]}},`;
      }
      pytreeLinestring = pytreeLinestring.substr(0, pytreeLinestring.length - 1);
      maxLODWith = this.utils.getNiceLOD(domain[1] - domain[0], max_levels);
    }

    this.config.clientConfig.pointSum = 0;
    if (this.config.clientConfig.autoWidth) {
      profileWidth = maxLODWith.width;
    } else {
      profileWidth = this.config.serverConfig.width;
    }
    profileWidth = userWidth;
    const profileWidthTxt = i18next.t('Profile width: ');
    d3.select('.gmf-lidarprofile-container .width-info').html(`${profileWidthTxt} ${profileWidth}m`);
    if (!exportLAS) {
      for (let i = 0; i < maxLODWith.maxLOD; i++) {
        if (i == 0) {
          this.queryPytree_(minLOD, this.config.serverConfig.initialLOD, i, pytreeLinestring, distanceOffset, lastLOD, profileWidth, resetPlot, false);
          i += this.config.serverConfig.initialLOD - 1;
        } else if (i < maxLODWith.maxLOD - 1) {
          this.queryPytree_(minLOD + i, minLOD + i + 1, i, pytreeLinestring, distanceOffset, lastLOD, profileWidth, false, false);
        } else {
          lastLOD = true;
          this.queryPytree_(minLOD + i, minLOD + i + 1, i, pytreeLinestring, distanceOffset, lastLOD, profileWidth, false, false);
        }
      }
    } else {
      this.queryPytree_(undefined, undefined, undefined, pytreeLinestring, distanceOffset, lastLOD, profileWidth, false, true);
    }
  }


  /**
   * Request to Pytree service for a range of Level Of Detail (LOD)
   * @param {number | undefined} minLOD minimum Level Of Detail of the request
   * @param {number | undefined} maxLOD maximum Level Of Detail of the request
   * @param {number | undefined} iter the iteration in profile requests cycle
   * @param {string} coordinates linestring in cPotree format
   * @param {number} distanceOffset the left side of D3 profile domain at current zoom and pan configuration
   * @param {boolean} lastLOD the deepest level to retrieve for this profile
   * @param {number} width the width of the profile
   * @param {boolean} resetPlot whether to reset D3 plot or not, used for first LOD
   * @param {boolean} exportLAS should export a LAS file
   * @private
   */
  queryPytree_(minLOD, maxLOD, iter, coordinates, distanceOffset, lastLOD, width, resetPlot, exportLAS) {
    if (!this.config) {
      throw new Error('Missing config');
    }
    if (!this.config.serverConfig) {
      throw new Error('Missing config.serverConfig');
    }
    this.map_.getViewport().style.cursor = 'wait';
    document.body.style.cursor = 'wait';
    const gettextCatalog = this.gettextCatalog;
    const lodInfo = d3.select('.gmf-lidarprofile-container .lod-info');
    if (this.config.serverConfig.debug) {
      let html = lodInfo.html();
      const loadingLodTxt = i18next.t('Loading LOD: ');
      html += `${loadingLodTxt} ${minLOD}-${maxLOD}...<br>`;
      lodInfo.html(html);
    }

    const pointCloudName = this.config.serverConfig.default_point_cloud;
    const getLAS = exportLAS?1:0;

    const options = {
      method: 'GET',
      headers: {'Content-Type': 'text/plain; charset=x-user-defined'},
      responseType: 'arraybuffer',
    };
    if (exportLAS) {
        const url = `${this.config.pytreeLidarprofileJsonUrl}profile/get?width=${width}&coordinates=${coordinates}&pointCloud=${pointCloudName}&attributes=&getLAS=${getLAS}`;  
        fetch(url, options).then(res => res.blob())
          .then(blobobject => {
            const blob = window.URL.createObjectURL(blobobject);
            const anchor = document.createElement('a');
            anchor.style.display = 'none';
            anchor.href = blob;
            anchor.download = "output.las";
            document.body.appendChild(anchor);
            anchor.click();
            window.URL.revokeObjectURL(blob);
          }).finally(()=>{
            this.map_.getViewport().style.cursor = '';
            document.body.style.cursor = '';
          });
    } else {
      let url = `${this.config.pytreeLidarprofileJsonUrl}profile/get?minLOD=${minLOD}&maxLOD=${maxLOD}&width=${width}&coordinates=${coordinates}&pointCloud=${pointCloudName}&attributes=&getLAS=${getLAS}`;
      if (minLOD === undefined || maxLOD === undefined) {$
        url = `${this.config.pytreeLidarprofileJsonUrl}profile/get?width=${width}&coordinates=${coordinates}&pointCloud=${pointCloudName}&attributes=&getLAS=${getLAS}`;
      }
      fetch(url, options)
        .then((resp) => resp.arrayBuffer())
        .then((data) => {
          if (!this.config) {
            throw new Error('Missing config');
          }
          if (!this.config.serverConfig) {
            throw new Error('Missing config.serverConfig');
          }
          if (this.config.serverConfig.debug) {
            let html = lodInfo.html();
            const lodTxt = i18next.t('LOD: ');
            const loadedTxt = i18next.t('loaded');
            html += `${lodTxt} ${minLOD}-${maxLOD} ${loadedTxt}<br>`;
            lodInfo.html(html);
          }
          this.processBuffer_(data, iter, distanceOffset, lastLOD, resetPlot);
        })
        .catch((err) => {
          throw `Error on pytree query: ${err.message}`;
        }).finally(() => {
          this.map_.getViewport().style.cursor = '';
          document.body.style.cursor = '';
        });
    }
  }

  /**
   * Process the binary array return by Pytree (cPotree)
   * @param {ArrayBuffer} profile binary array returned by cPotree executable called by Pytree
   * @param {number} iter the iteration in profile requests cycle
   * @param {number} distanceOffset the left side of D3 profile domain at current zoom and pan configuration
   * @param {boolean} lastLOD the deepest level to retrieve for this profile
   * @param {boolean} resetPlot whether to reset D3 plot or not
   * @private
   */
  processBuffer_(profile, iter, distanceOffset, lastLOD, resetPlot) {
    const lidarError = d3.select('.gmf-lidarprofile-container .lidar-error');

    const typedArrayInt32 = new Int32Array(profile, 0, 4);
    const headerSize = typedArrayInt32[0];

    const uInt8header = new Uint8Array(profile, 4, headerSize);
    let strHeaderLocal = '';
    for (let i = 0; i < uInt8header.length; i++) {
      strHeaderLocal += String.fromCharCode(uInt8header[i]);
    }

    try {

      JSON.parse(strHeaderLocal);

    } catch (e) {
      if (!this.isPlotSetup_) {
        const canvas = d3.select('.gmf-lidarprofile-container .lidar-canvas');
        const canvasEl = canvas.node();
        const ctx = canvasEl.getContext('2d');
        ctx.clearRect(0, 0, canvasEl.getBoundingClientRect().width, canvasEl.getBoundingClientRect().height);
        canvas.selectAll('*').remove();
        const errorTxt = this.getHTMLError_();
        lidarError.style('visibility', 'visible');
        lidarError.html(errorTxt);
      }
      return;
    }

    lidarError.style('visibility', 'hidden');

    const jHeader = JSON.parse(strHeaderLocal);

    // If number of points return is higher than Pytree configuration max value,
    // stop sending requests.
    this.config.clientConfig.pointSum += jHeader['points'];
    if (this.config.clientConfig.pointSum >
        this.config.serverConfig.max_point_number) {
      console.warn('Number of points is higher than Pytree configuration max value !');
    }

    const attr = jHeader['pointAttributes'];
    const attributes = [];
    for (let j = 0; j < attr.length; j++) {
      if (this.config.serverConfig.point_attributes[attr[j]] != undefined) {
        attributes.push(this.config.serverConfig.point_attributes[attr[j]]);
      }
    }
    const scale = jHeader['scale'];

    if (jHeader['points'] < 3) {
      return;
    }

    const points = this.getEmptyProfilePoints_();
    const bytesPerPoint = jHeader['bytesPerPoint'];
    const buffer = profile.slice(4 + headerSize);
    for (let i = 0; i < jHeader['points']; i++) {

      const byteOffset = bytesPerPoint * i;
      const view = new DataView(buffer, byteOffset, bytesPerPoint);
      let aoffset = 0;
      for (let k = 0; k < attributes.length; k++) {

        if (attributes[k]['value'] == 'POSITION_PROJECTED_PROFILE') {
          const udist = view.getUint32(aoffset, true);
          const dist = udist * scale;
          points.distance.push(Math.round(100 * (distanceOffset + dist)) / 100);
          this.profilePoints.distance.push(Math.round(100 * (distanceOffset + dist)) / 100);

        } else if (attributes[k]['value']  == 'CLASSIFICATION') {
          const classif = view.getUint8(aoffset);
          points.classification.push(classif);
          this.profilePoints.classification.push(classif);

        } else if (attributes[k]['value']  == 'INTENSITY') {
          const intensity = view.getUint8(aoffset);
          points.intensity.push(intensity);
          this.profilePoints.intensity.push(intensity);

        } else if (attributes[k]['value'] == 'COLOR_PACKED') {
          const r = view.getUint8(aoffset);
          const g = view.getUint8(aoffset + 1);
          const b = view.getUint8(aoffset + 2);
          points.color_packed.push([r, g, b]);
          this.profilePoints.color_packed.push([r, g, b]);

        } else if (attributes[k]['value']  == 'POSITION_CARTESIAN') {
          const x = view.getInt32(aoffset, true) * scale + jHeader['boundingBox']['lx'];
          const y = view.getInt32(aoffset + 4, true) * scale + jHeader['boundingBox']['ly'];
          const z = view.getInt32(aoffset + 8, true) * scale + jHeader['boundingBox']['lz'];
          points.coords.push([x, y]);
          points.altitude.push(z);
          this.profilePoints.altitude.push(z);
          this.profilePoints.coords.push([x, y]);
        }
        aoffset = aoffset + attributes[k]['bytes'];
      }
    }

    const rangeX = [0, this.line_.getLength()];

    const rangeY = [this.utils.arrayMin(points.altitude), this.utils.arrayMax(points.altitude)];

    if ((iter == 0 && resetPlot) || !this.isPlotSetup_) {
      this.plot.setupPlot(rangeX, rangeY);
      this.isPlotSetup_ = true;
    }
    this.plot.drawPoints(points);
  }

  /**
   * @return {string} The html for errors.
   * @private
   */
  getHTMLError_() {
    const gettextCatalog = this.gettextCatalog;
    const errorInfoTxt = i18next.t('Lidar profile service error');
    const errorOfflineTxt = i18next.t('It might be offline');
    const errorOutsideTxt = i18next.t('Or did you attempt to draw a profile outside data extent?');
    const errorNoPointError = i18next.t('Or did you attempt to draw such a small profile that no point was returned?');
    return `
      <div class="lidarprofile-error">
      <p class="bold">${errorInfoTxt}</p>
      <p>${errorOfflineTxt}</p>
      <p>${errorOutsideTxt}</p>
      <p>${errorNoPointError}</p>
    `;
  }

  /**
   * Update the profile data according to D3 chart zoom and pan level
   * The update will wait on a 200ms pause on the actions of users before to do the update.
   * @export
   */
  updateData() {
    this.ngeoDebounce_(this.updateData_.bind(this), 200, true)();
  }

  /**
   * @private
   */
  updateData_() {
    console.log("Update data")
    const domainX = this.plot.updateScaleX['domain']();
    let map_resolution = this.map_ ? this.map_.getView().getResolution() : 0;
    map_resolution = map_resolution || 0;
    const clip = this.utils.clipLineByMeasure(this.config, map_resolution,
      this.line_, domainX[0], domainX[1]);

    this.lidarBuffer.getSource().clear();
    this.lidarBuffer.getSource().addFeature(clip.bufferGeom);
    this.lidarBuffer.setStyle(clip.bufferStyle);

    const span = domainX[1] - domainX[0];
    const maxLODWidth = this.utils.getNiceLOD(span, this.config.serverConfig.max_levels);
    const xTolerance = 0.2;

    if (Math.abs(domainX[0] - this.plot.previousDomainX[0]) < xTolerance &&
        Math.abs(domainX[1] - this.plot.previousDomainX[1]) < xTolerance) {

      this.plot.drawPoints(this.profilePoints);

    } else {
      if (maxLODWidth.maxLOD <= this.config.serverConfig.initialLOD) {
        this.plot.drawPoints(this.profilePoints);
      } else {
        this.getProfileByLOD(clip.clippedLine, clip.distanceOffset, false, 0, false, this.width);
      }
    }

    this.plot.previousDomainX = domainX;
  }

};
