/**
 * @fileoverview Application entry point.
 *
 * This file defines the "app_main" Closure namespace, which is be used as the
 * Closure entry point (see "entry_point" in the "build.json" file).
 *
 * This file includes `goog.require`'s for all the components/directives used
 * by the HTML page.
 */
goog.provide('app.main');

goog.require('app.ImguploadDirective');
goog.require('app.MainController');
goog.require('app.askredirectDirective');
goog.require('app.authenticationDirective');
goog.require('app.backgroundlayerDirective');
goog.require('app.catalogDirective');
goog.require('app.drawDirective');
goog.require('app.elevationDirective');
goog.require('app.externalDataDirective');
goog.require('app.feedbackDirective');
goog.require('app.filereaderDirective');
goog.require('app.layerinfoDirective');
goog.require('app.layermanagerDirective');
goog.require('app.layerlegendsDirective');
goog.require('app.locationinfoDirective');
goog.require('app.mapDirective');
goog.require('app.measureDirective');
goog.require('app.mymapsDirective');
goog.require('app.pagreportDirective');
goog.require('app.printDirective');
goog.require('app.projections');
goog.require('app.projectionselectorDirective');
goog.require('app.queryDirective');
goog.require('app.resizemapDirective');
goog.require('app.routingDirective');
goog.require('app.scalelineDirective');
goog.require('app.scaleselectorDirective');
goog.require('app.searchDirective');
goog.require('app.shareDirective');
goog.require('app.shorturlDirective');
goog.require('app.symbolSelectorDirective');
goog.require('app.themeswitcherDirective');
