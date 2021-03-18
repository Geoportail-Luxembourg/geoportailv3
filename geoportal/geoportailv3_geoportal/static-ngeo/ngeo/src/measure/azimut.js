// The MIT License (MIT)
//
// Copyright (c) 2016-2020 Camptocamp SA
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
import ngeoDrawController from 'ngeo/draw/Controller.js';
import ngeoMiscFilters from 'ngeo/misc/filters.js';
import ngeoGeometryType from 'ngeo/GeometryType.js';
import ngeoInteractionMeasureAzimut, {getAzimut} from 'ngeo/interaction/MeasureAzimut.js';
import {listen} from 'ol/events.js';
import olFeature from 'ol/Feature.js';
import {fromCircle} from 'ol/geom/Polygon.js';
import olStyleStyle from 'ol/style/Style.js';

/**
 * @type {angular.IModule}
 * @hidden
 */
const module = angular.module('ngeoMeasureazimut', [ngeoDrawController.name, ngeoMiscFilters.name]);

/**
 * @param {angular.ICompileService} $compile Angular compile service.
 * @param {angular.gettext.gettextCatalog} gettextCatalog Gettext catalog.
 * @param {angular.IFilterService} $filter Angular filter
 * @param {angular.auto.IInjectorService} $injector Main injector.
 * @return {angular.IDirective} The directive specs.
 * @ngInject
 * @ngdoc directive
 * @ngname ngeoDrawpoint
 */
function measureAzimutComponent($compile, gettextCatalog, $filter, $injector) {
  return {
    restrict: 'A',
    require: '^^ngeoDrawfeature',
    /**
     * @param {angular.IScope} $scope Scope.
     * @param {JQuery} element Element.
     * @param {angular.IAttributes} attrs Attributes.
     * @param {angular.IController=} drawFeatureCtrl Controller.
     */
    link: ($scope, element, attrs, drawFeatureCtrl) => {
      if (!drawFeatureCtrl) {
        throw new Error('Missing drawFeatureCtrl');
      }

      const helpMsg = gettextCatalog.getString('Click to start drawing circle');
      const contMsg = gettextCatalog.getString('Click to finish');

      /** @type {import('ngeo/interaction/Measure.js').MeasureOptions} */
      const options = {
        style: new olStyleStyle(),
        startMsg: $compile(`<div translate>${helpMsg}</div>`)($scope)[0],
        continueMsg: $compile(`<div translate>${contMsg}</div>`)($scope)[0],
      };
      if ($injector.get('ngeoMeasurePrecision')) {
        options.precision = $injector.get('ngeoMeasurePrecision');
      }
      if ($injector.get('ngeoMeasureDecimals')) {
        options.decimals = $injector.get('ngeoMeasureDecimals');
      }
      const measureAzimut = new ngeoInteractionMeasureAzimut(
        $filter('ngeoUnitPrefix'),
        $filter('number'),
        options
      );

      if (drawFeatureCtrl.uid) {
        measureAzimut.set('ngeo-interaction-draw-uid', `${drawFeatureCtrl.uid}-azimut`);
      }

      drawFeatureCtrl.registerInteraction(measureAzimut);
      drawFeatureCtrl.measureAzimut = measureAzimut;

      listen(
        measureAzimut,
        'measureend',
        /**
         * @param {Event|import('ol/events/Event.js').default} event Event.
         */
        (event) => {
          const myEvent = /** @type {import('ngeo/interaction/Measure.js').MeasureEvent} */ (event);
          // In the case of azimut measure interaction, the feature's
          // geometry is actually a collection (line + circle)
          // For our purpose here, we only need the circle, which gets
          // transformed into a polygon with 64 sides.
          const geometry =
            /** @type {import("ol/geom/GeometryCollection.js").default} */
            (myEvent.detail.feature.getGeometry());
          const circle = /** @type {import("ol/geom/Circle.js").default} */ (geometry.getGeometries()[1]);
          const polygon = fromCircle(
            circle,
            Number.parseInt(attrs.$$element.attr('ngeo-measureazimut-nbpoints') || 64)
          );
          myEvent.detail.feature = new olFeature(polygon);
          const azimut = getAzimut(
            /** @type {import("ol/geom/LineString.js").default} */ (geometry.getGeometries()[0])
          );
          myEvent.detail.feature.set('azimut', azimut);

          drawFeatureCtrl.handleDrawEnd(ngeoGeometryType.CIRCLE, event);
        },
        drawFeatureCtrl
      );

      listen(measureAzimut, 'change:active', drawFeatureCtrl.handleActiveChange, drawFeatureCtrl);
    },
  };
}

module.directive('ngeoMeasureazimut', measureAzimutComponent);

export default module;
