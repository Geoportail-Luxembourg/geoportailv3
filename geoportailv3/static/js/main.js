/**
 * @fileoverview Application entry point.
 *
 * This file defines the "app_main" Closure namespace, which is be used as the
 * Closure entry point (see "closure_entry_point" in the "build.json" file).
 *
 * This file includes `goog.require`'s for all the components/directives used
 * by the HTML page.
 */
goog.provide('app_main');

goog.require('app.MainController');
goog.require('app.authenticationDirective');
goog.require('app.backgroundlayerDirective');
goog.require('app.catalogDirective');
goog.require('app.elevationDirective');
goog.require('app.interrogationDirective');
goog.require('app.layerinfoDirective');
goog.require('app.layermanagerDirective');
goog.require('app.mapDirective');
goog.require('app.measureDirective');
goog.require('app.printDirective');
goog.require('app.projections');
goog.require('app.projectionselectorDirective');
goog.require('app.scalelineDirective');
goog.require('app.scaleselectorDirective');
goog.require('app.searchDirective');
goog.require('app.shareDirective');
goog.require('app.shorturlDirective');
goog.require('app.themeswitcherDirective');
goog.require('ngeo.btngroupDirective');
goog.require('ngeo.resizemapDirective');
