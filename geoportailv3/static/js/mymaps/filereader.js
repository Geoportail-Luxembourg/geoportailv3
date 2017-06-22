goog.provide('app.filereaderDirective');


/**
 * @htmlAttribute {string} app-filereader The content of the file read.
 * @htmlAttribute {boolean=} app-filereader-supported Whether the FileReader API is supported.
 * @htmlAttribute {string=} app-filereader-filetype The file type (binary or text).
 * @param {angular.$window} $window The Angular $window service.
 * @return {angular.Directive} Directive Definition Object.
 * @ngInject
 * @ngdoc directive
 * @ngname appFilereader
 */
app.filereaderDirective = function($window) {
  return {
    restrict: 'A',
    scope: {
      'fileContent': '=appFilereader',
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
        /** @type {!FileReader} */
        var fileReader = new $window.FileReader();
        fileReader.onload = (
                /**
                 * @param {!ProgressEvent} evt Event.
                 */
                function(evt) {
                  scope.$apply(function() {
                    scope['fileContent'] = evt.target.result;
                    angular.element(element).val(undefined);
                  }.bind(this));
                });
        if (attrs['appFilereaderFiletype'] === undefined || attrs['appFilereaderFiletype'] === 'text') {
          fileReader.readAsText(changeEvent.target.files[0]);
        } else {
          fileReader.readAsBinaryString(changeEvent.target.files[0]);
        }
      }.bind(this));
    }
  };
};


ngeo.module.directive('appFilereader', app.filereaderDirective);
