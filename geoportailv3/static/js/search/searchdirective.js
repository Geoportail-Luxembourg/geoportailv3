/**
 * @fileoverview This file provides a "search" directive. This directive is
 * used to insert a Search bar into a HTML page.
 * Example:
 *
 * <app-search app-search-map="::mainCtrl.map"></app-search>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.provide('app.search.searchDirective');

goog.require('app.module');
goog.require('ngeo.search.createGeoJSONBloodhound');


// Add dependency into Angular module
app.module.requires.push(ngeo.search.createGeoJSONBloodhound.module.name);


/**
 * @return {angular.Directive} The Directive Object Definition
 * @param {string} appSearchTemplateUrl The template url.
 * @ngInject
 */
app.search.searchDirective = function(appSearchTemplateUrl) {
  return {
    restrict: 'E',
    scope: {
      'map': '=appSearchMap',
      'language': '=appSearchLanguage',
      'mobileActive': '=appSearchMobileactive',
      'routingOpen': '=appSearchRoutingOpen'
    },
    controller: 'AppSearchController',
    controllerAs: 'ctrl',
    bindToController: true,
    templateUrl: appSearchTemplateUrl,
    link:
        /**
         * @param {angular.Scope} scope Scope
         * @param {angular.JQLite} element Element
         * @param {angular.Attributes} attrs Atttributes
         */
        function(scope, element, attrs) {
          element.find('input').on('keypress', function(e) {
            if (e.keyCode == 13) {
              e.preventDefault();
              var downE = $.Event('keydown');
              downE.which = 40;
              $(this).trigger(downE);
            }
          });
          // Empty the search field on focus
          element.find('input').one('focus', function() {
            $(this).addClass('placeholder-text');
          });
          element.find('input').on(
              'input propertyChange focus blur', function() {
                var clearButton =
                    $(this).parents('.form-group').find('span.clear-button');
                if ($(this).val() === '') {
                  clearButton.css('display', 'none');
                } else {
                  clearButton.css('display', 'block');
                }
              });
          element.find('span.clear-button').on('click',
              goog.bind(function(scope) {
                $(this).find('input').val('').trigger('input');
                var ctrl = /** @type {app.search.SearchController} */
                    (scope['ctrl']);
                ctrl.featureOverlay.clear();
                ctrl.lastSelectedSuggestion = null;
                $(this).find('input').focus();
              }, element, scope));
        }
  };
};


app.module.directive('appSearch', app.search.searchDirective);
