/**
 * @module gmf.layertree.timeSliderComponent
 */
import ngeoMiscWMSTime from 'ngeo/misc/WMSTime.js';

import 'jquery-ui/ui/widgets/slider.js';
import 'angular-ui-slider';
import './timeslider.less';

/**
 * @type {!angular.Module}
 */
const exports = angular.module('gmfLayertreeTimeSliderComponent', [
  ngeoMiscWMSTime.module.name,
  'ui.slider',
]);


exports.run(/* @ngInject */ ($templateCache) => {
  $templateCache.put('gmf/layertree/timesliderComponent', require('./timesliderComponent.html'));
});


/**
 * Provide a directive to select a single date or a range of dates with a slider
 * Example:
 *
 *      <gmf-time-slider
 *          gmf-time-slider-time="{
 *            maxValue: '2013-12-31T00:00:00Z',
 *            minValue: '2006-01-01T00:00:00Z',
 *            mode: 'range'}"
 *          gmf-time-slider-on-date-selected="ctrl.onDateSelected(time)">
 *      </gmf-time-slider>
 *
 * @htmlAttribute {ngeox.TimeProperty} gmf-time-slider-time parameter for initialization.
 * @htmlAttribute {function()} gmf-time-slider-on-date-selected Expression evaluated after
 * date(s) changed
 * @param {angular.$timeout} $timeout angular timeout service
 * @param {angular.$filter} $filter angular filter service
 * @return {angular.Directive} The directive specs.
 * @ngInject
 * @ngdoc directive
 * @ngname gmfTimeSlider
 */
exports.directive_ = function($timeout, $filter) {
  return {
    scope: {
      onDateSelected: '&gmfTimeSliderOnDateSelected',
      time: '=gmfTimeSliderTime'
    },
    bindToController: true,
    controller: 'gmfTimeSliderController as sliderCtrl',
    restrict: 'AE',
    templateUrl: 'gmf/layertree/timesliderComponent',
    link: /** @type {!angular.LinkingFunctions} */ ({
      pre: function preLink(scope, element, attrs, ctrl) {
        ctrl.init();

        ctrl.sliderOptions['stop'] = onSliderReleased_;
        ctrl.sliderOptions['slide'] = computeDates_;

        function onSliderReleased_(e, sliderUi) {
          ctrl.onDateSelected({
            time: computeDates_(e, sliderUi)
          });
          scope.$apply();
        }

        function computeDates_(e, sliderUi) {
          let sDate, eDate, wmstime;
          if (sliderUi.values) {
            sDate = new Date(ctrl.getClosestValue_(sliderUi.values[0]));
            eDate = new Date(ctrl.getClosestValue_(sliderUi.values[1]));
            ctrl.dates = [sDate.getTime(), eDate.getTime()];
            if (ctrl.isInterval) {
              if (ctrl.dates[0] != ctrl.prevLower) {
                eDate = new Date(ctrl.getClosestValue_(ctrl.dates[0] + ctrl.interval));
                ctrl.dates[1] = eDate;
                ctrl.prevLower = ctrl.dates[0];
                ctrl.prevUpper = ctrl.dates[1];
              }
              if (ctrl.dates[1] != ctrl.prevUpper) {
                ctrl.interval = eDate - sDate;
                ctrl.prevUpper = ctrl.dates[1];
              }
            }
            wmstime = {
              start: sDate.getTime(),
              end: eDate.getTime()
            };
          } else {
            sDate = new Date(ctrl.getClosestValue_(sliderUi.value));
            ctrl.dates = sDate.getTime();
            wmstime = {
              start: sDate.getTime()
            };
          }
          scope.$apply();
          return wmstime;
        }
      }
    })
  };
};


exports.directive('gmfTimeSlider', exports.directive_);


/**
 * TimeSliderController - directive controller
 * @param {!angular.Scope} $scope Angular scope.
 * @param {ngeo.misc.WMSTime} ngeoWMSTime WMSTime service.
 * @constructor
 * @private
 * @ngInject
 * @ngdoc controller
 * @ngname gmfTimeSliderController
 */
exports.Controller_ = function($scope, ngeoWMSTime) {

  /**
   * @type {ngeo.misc.WMSTime}
   * @private
   */
  this.ngeoWMSTime_ = ngeoWMSTime;

  /**
   * Function called after date(s) changed/selected
   * @function
   * @export
   */
  this.onDateSelected;


  /**
   * A time object for directive initialization
   * @type {ngeox.TimeProperty}
   * @export
   */
  this.time;

  /**
   * If the component is used to select a date range
   * @type {boolean}
   * @export
   */
  this.isModeRange;

  /**
   * Minimal value of the slider (time in ms)
   * @type {number}
   * @export
   */
  this.minValue;

  /**
   * Maximal value of the slider (time in ms)
   * @type {number}
   * @export
   */
  this.maxValue;

  /**
   * Used when WMS time object has a property 'values' instead of an interval
   * @type (?Array<number>)
   */
  this.timeValueList;

  /**
   * Default Slider options (used by ui-slider directive)
   * @type {{
   *  range : boolean,
   *  min : number,
   *  max : number
   * }}
   * @export
   */
  this.sliderOptions;

  /**
   * Model for the ui-slider directive (date in ms format)
   * @type {Array.<number>|number}
   * @export
   */
  this.dates;
};


/**
 * Initialise the controller.
 */
exports.Controller_.prototype.init = function() {
  this.timeValueList = this.getTimeValueList_();

  // Fetch the initial options for the component
  const initialOptions_ = this.ngeoWMSTime_.getOptions(this.time);
  this.isModeRange = this.time.mode === 'range';
  this.isInterval = this.time.translate_interval;
  this.minValue = initialOptions_.minDate;
  this.maxValue = initialOptions_.maxDate;
  this.dates = this.isModeRange ? [initialOptions_.values[0], initialOptions_.values[1]] :
    initialOptions_.values;
  this.prevLower = this.dates[0];
  this.prevUpper = this.dates[1];
  this.interval = this.isModeRange ? this.dates[1] - this.dates[0] : 0;
  this.sliderOptions = {
    range: this.isModeRange,
    min: this.minValue,
    max: this.maxValue
  };
  let sDate, eDate, wmstime;
  if (this.isModeRange) {
    sDate = new Date(this.getClosestValue_(initialOptions_.values[0]));
    eDate = new Date(this.getClosestValue_(initialOptions_.values[1]));
    wmstime = {
      start: sDate.getTime(),
      end: eDate.getTime()
    };
  } else {
    sDate = new Date(this.getClosestValue_(initialOptions_.values));
    wmstime = { start: sDate.getTime() };
  }
  this.onDateSelected({time: wmstime});
};

/**
 * TimeSliderController.prototype.getTimeValueList_ - Get a list of time value instead
 * of using the wmstime interval as a list of possibles values
 * @private
 * @return {Array<number>}  - List of timestamp representing possible values
 */
exports.Controller_.prototype.getTimeValueList_ = function() {
  // maxValue == null means the UI shall use the current date
  if (this.time.maxValue === null) {
    this.time.maxValue = new Date(Date.now())
  }
  const wmsTime = this.time;
  let timeValueList = null;
  const minDate = new Date(wmsTime.minValue);
  const maxDate = new Date(wmsTime.maxValue);

  if (wmsTime.values) {
    timeValueList = [];
    wmsTime.values.forEach((date) => {
      timeValueList.push(new Date(date).getTime());
    });
  } else {
    const maxNbValues = 1024;
    const endDate = new Date(minDate.getTime());
    endDate.setFullYear(minDate.getFullYear() + maxNbValues * wmsTime.interval[0]);
    endDate.setMonth(minDate.getMonth() + maxNbValues * wmsTime.interval[1],
      minDate.getDate() + maxNbValues * wmsTime.interval[2]);
    endDate.setSeconds(minDate.getSeconds() + maxNbValues * wmsTime.interval[3]);

    if (endDate > maxDate) {
      // Transform interval to a list of values when the number
      // of values is below a threshold (maxNbValues)
      timeValueList = [];
      for (let i = 0; ; i++) {
        const nextDate = new Date(minDate.getTime());
        nextDate.setFullYear(minDate.getFullYear() + i * wmsTime.interval[0]);
        nextDate.setMonth(minDate.getMonth() + i * wmsTime.interval[1],
          minDate.getDate() + i * wmsTime.interval[2]);
        nextDate.setSeconds(minDate.getSeconds() + i * wmsTime.interval[3]);
        if (nextDate <= maxDate) {
          timeValueList.push(nextDate.getTime());
        } else {
          break;
        }
      }
    }
  }
  return timeValueList;
};


/**
 * Compute the closest available date from the given timestamp
 * @param  {number} timestamp selected datetime (in ms format)
 * @return {number} the closest available datetime (in ms format) from the timestamp
 * @private
 */
exports.Controller_.prototype.getClosestValue_ = function(timestamp) {
  if (timestamp <= this.minValue) {
    return this.minValue;
  }

  if (timestamp >= this.maxValue) {
    return this.maxValue;
  }

  if (this.timeValueList) {
    // Time stops are defined as a list of values
    let index;
    let leftIndex = 0;
    let rightIndex = this.timeValueList.length - 1;

    while ((rightIndex - leftIndex) > 1) {
      index = Math.floor((leftIndex + rightIndex) / 2);
      if (this.timeValueList[index] >= timestamp) {
        rightIndex = index;
      } else {
        leftIndex = index;
      }
    }

    const leftDistance = Math.abs(this.timeValueList[leftIndex] - timestamp);
    const rightDistance = Math.abs(this.timeValueList[rightIndex] - timestamp);

    return this.timeValueList[leftDistance < rightDistance ? leftIndex : rightIndex];
  } else {
    // Time stops are defined by a start date plus an interval
    const targetDate = new Date(timestamp);
    const startDate = new Date(this.minValue);
    let bestDate = new Date(this.minValue);
    const maxDate = new Date(this.maxValue);
    let bestDistance = Math.abs(targetDate - bestDate);

    for (let i = 1; ; i++) {
      // The start date should always be used as a reference
      // because adding a month twice could differ from adding
      // two months at once
      const next = new Date(startDate.getTime());
      next.setFullYear(startDate.getFullYear() + i * this.time.interval[0]);
      next.setMonth(startDate.getMonth() + i *  this.time.interval[1],
        startDate.getDate() + i * this.time.interval[2]);
      next.setSeconds(startDate.getSeconds() + i * this.time.interval[3]);

      if (next > maxDate) {
        break;
      }

      const distance = Math.abs(targetDate - next);
      if (distance <= bestDistance) {
        bestDate = next;
        bestDistance = distance;
      } else {
        break;
      }
    }

    return bestDate.getTime();
  }
};


/**
 * Format and localize time regarding a resolution.
 * @param {number} time (in ms format) timestamp to format and localize.
 * @return {string} Localized date string regarding the resolution.
 * @export
 */
exports.Controller_.prototype.getLocalizedDate = function(time) {
  return this.ngeoWMSTime_.formatTimeValue(time, this.time.resolution);
};


exports.controller('gmfTimeSliderController',
  exports.Controller_);


export default exports;
