// The MIT License (MIT)
//
// Copyright (c) 2017-2020 Camptocamp SA
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import angular from 'angular';
import ngeoDatasourceHelper from 'ngeo/datasource/Helper.js';
import {ServerType} from 'ngeo/datasource/OGC.js';

/**
 * @hidden
 */
export class DatasourceWFSAlias {
  /**
   * Service that provides methods to get additional information and actions
   * when performing WFS requests.
   *
   * @param {import("ngeo/datasource/Helper.js").DatasourceHelper} ngeoDataSourcesHelper Ngeo data
   *     source helper service.
   * @ngdoc service
   * @ngname gmfWFSAliases
   * @ngInject
   */
  constructor(ngeoDataSourcesHelper) {
    // === Injected properties ===

    /**
     * @type {import("ngeo/datasource/Helper.js").DatasourceHelper}
     * @private
     */
    this.ngeoDataSourcesHelper_ = ngeoDataSourcesHelper;
  }

  /**
   * @param {import("ngeo/datasource/OGC.js").default} dataSource Data source.
   */
  describe(dataSource) {
    // Only QGIS Server supports WFS aliases
    if (
      dataSource.ogcServerType === ServerType.QGISSERVER &&
      dataSource.wfsUrl_ &&
      dataSource.getWFSLayerNames().length == 1 &&
      !dataSource.attributes
    ) {
      // Trigger an additional WFS DescribeFeatureType request to get
      // datasource attributes, including aliases.
      this.ngeoDataSourcesHelper_.getDataSourceAttributes(dataSource);
    }
  }
}

/**
 * @type {angular.IModule}
 * @hidden
 */
const module = angular.module('gmfDatasourceWFSAliases', [ngeoDatasourceHelper.name]);
module.service('gmfWFSAliases', DatasourceWFSAlias);

export default module;
