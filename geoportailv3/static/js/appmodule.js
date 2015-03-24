/**
 * @fileoverview This file provides the "app" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
goog.provide('app');

goog.require('ngeo');
goog.require('ngeo.MockLocationProvider');


/**
 * @type {!angular.Module}
 */
app.module = angular.module('app', [ngeoModule.name, 'gettext', 'ngAnimate']);


// Use ngeo's mockLocationProvider to work around a problem in Angular
// and avoid problems when using both ngeoLocation and ng-include in
// the application.
app.module.config(ngeo.mockLocationProvider);
