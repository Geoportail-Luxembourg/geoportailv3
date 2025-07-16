import appModule from '../module.js';
appModule.directive('featureid', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        scope.$watch(attrs.featureid, function(value) {
          element.attr('featureid', value);
        });
      }
    };
  });