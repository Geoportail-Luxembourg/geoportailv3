/**
 * @module app.mymaps.filereaderDirective
 */
import appModule from '../module.js';

/**
 * @param {angular.$window} $window The Angular $window service.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 * @ngdoc directive
 * @ngname appFilereader
 */
const exports = function($window) {
  return {
    restrict: 'A',
    scope: {
      'kmzfileContent': '=appKmzFilereader',
      'kmlfileContent': '=appKmlFilereader',
      'gpxfileContent': '=appGpxFilereader',
      'supported': '=?appFilereaderSupported',
      'fileType': '=?appFilereaderFiletype'
    },
    link: function(scope, element, attrs) {
      var supported = 'FileReader' in $window;
      scope['supported'] = supported;
      if (!supported) {
        return;
      }

      element.on('change', function(changeEvent) {
        var fileType = 'GPX';
        /** @type {!FileReader} */
        var fileReader = new $window.FileReader();
        fileReader.onload = (
                /**
                 * @param {!ProgressEvent} evt Event.
                 */
                function(evt) {
                  scope.$apply(function() {
                    if (fileType === 'GPX') {
                      scope['gpxfileContent'] = evt.target.result;
                    } else if (fileType === 'KML') {
                      scope['kmlfileContent'] = evt.target.result;
                    } else if (fileType === 'KMZ') {
                      scope['kmzfileContent'] = evt.target.result;
                    }
                    angular.element(element).val(undefined);
                  }.bind(this));
                });
        if (changeEvent.target.files[0].name.toUpperCase().endsWith('.KML')) {
          fileReader.readAsText(changeEvent.target.files[0]);
          fileType = 'KML';
        } else if (changeEvent.target.files[0].name.toUpperCase().endsWith('.GPX')) {
          fileReader.readAsText(changeEvent.target.files[0]);
          fileType = 'GPX';
        } else if (changeEvent.target.files[0].name.toUpperCase().endsWith('.KMZ')) {
          fileReader.readAsBinaryString(changeEvent.target.files[0]);
          fileType = 'KMZ';
        }
      }.bind(this));
    }
  };
};


appModule.directive('appFilereader', exports);


export default exports;
