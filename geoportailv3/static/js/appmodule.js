/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
goog.provide('app');

goog.require('goog.dom.classlist');
goog.require('ngeo');
goog.require('ngeo.MockLocationProvider');
goog.require('ol.has');


/**
 * @type {!angular.Module}
 */
app.module = angular.module('app', [ngeoModule.name, 'gettext'])
    .run(function() {
      if (!ol.has.TOUCH) {
        goog.dom.classlist.add(document.body, 'no-touch');
      }
    });


// Use ngeo's mockLocationProvider to work around a problem in Angular
// and avoid problems when using both ngeoLocation and ng-include in
// the application.
app.module.config(ngeo.mockLocationProvider);
