/**
 * @module app.projections
 */

import {get as getProjection} from 'ol/proj.js';
import {register} from 'ol/proj/proj4.js';
import proj4 from 'proj4';

proj4.defs('EPSG:32632', '+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs');

proj4.defs('EPSG:32631', '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs');

proj4.defs('EPSG:2169',
    '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 ' +
    '+k=1 +x_0=80000 +y_0=100000 +ellps=intl ' +
    '+towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 ' +
    '+units=m +no_defs"');

register(proj4);

getProjection('EPSG:32632').setExtent([166021.44, 0.00, 833978.55, 9329005.18]);
getProjection('EPSG:32631').setExtent([166021.44, 0.00, 833978.55, 9329005.18]);
getProjection('EPSG:2169').setExtent([48225.17, 56225.60, 105842.04, 139616.40]);
