goog.provide('app_print_directive');

goog.require('app');

(function() {
  var module = angular.module('app');

  module.directive('appPrint', [
    /**
     */
    function() {
      return {
        restrict: 'E',
        templateUrl: '/proj/partials/print.html'
      };
    }]);
})();
