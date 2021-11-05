import {transform} from 'ol/proj';
import {getArea, getDistance} from 'ol/sphere';


/*
 * Calculate the area of the passed polygon and return a formatted string
 * of the area.
 * @param {import("ol/geom/Polygon.js").default} polygon Polygon.
 * @param {import("ol/proj/Projection.js").default} projection Projection of the polygon coords.
 * @param {number|undefined} precision Precision.
 * @param {import('ngeo/misc/filters.js').unitPrefix} format The format function.
 * @param {boolean} [spherical=false] Whether to use the spherical area.
 * @return {string} Formatted string of the area.
 */
export function getFormattedArea(polygon, projection, precision, format, spherical = false) {
  let area;
  if (spherical) {
    const geom = polygon.clone().transform(projection, 'EPSG:4326');
    area = Math.abs(getArea(geom, {'projection': 'EPSG:4326'}));
  } else {
    area = polygon.getArea();
  }
  return format(area, 'm²', 'square', precision);
}

/*
 * Calculate the length of the passed line string and return a formatted
 * string of the length.
 * @param {import("ol/geom/LineString.js").default} lineString Line string.
 * @param {import("ol/proj/Projection.js").default} projection Projection of the line string coords.
 * @param {number|undefined} precision Precision.
 * @param {import('ngeo/misc/filters.js').unitPrefix} format The format function.
 * @param {boolean} [spherical=false] Whether to use the spherical distance.
 * @return {string} Formatted string of length.
 * @hidden
 */
export function getFormattedLength(lineString, projection, precision, format, spherical = false) {
  let length = 0;
  if (spherical) {
    const coordinates = lineString.getCoordinates();
    for (let i = 0, ii = coordinates.length - 1; i < ii; ++i) {
      const c1 = transform(coordinates[i], projection, 'EPSG:4326');
      const c2 = transform(coordinates[i + 1], projection, 'EPSG:4326');
      length += getDistance(c1, c2);
    }
  } else {
    length = lineString.getLength();
  }
  return format(length, 'm', 'unit', precision);
}
