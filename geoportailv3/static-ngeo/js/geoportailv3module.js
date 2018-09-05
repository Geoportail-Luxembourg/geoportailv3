/**
 * @fileoverview This file provides the "geoportailv3" namespace, which is the
 * application's main namespace. And it defines the application's Angular
 * module.
 */
goog.provide('geoportailv3');

/** @suppress {extraRequire} */
goog.require('gmf');


/**
 * @type {!angular.Module}
 */
geoportailv3.module = angular.module('geoportailv3', [gmf.module.name]);

/**
 * The components template based URL, used as is by the template cache.
 * @type {string}
 * @export
 */
geoportailv3.componentsBaseTemplateUrl = 'geoportailv3_components';

/**
 * The template based URL, used to overwrite template from ngeo, used as is by the template cache.
 * @type {string}
 * @export
 */
geoportailv3.partialsBaseTemplateUrl = 'geoportailv3_partials';

/**
 * The default template based URL, used as is by the template cache.
 * @type {string}
 * @export
 */
geoportailv3.baseTemplateUrl = 'geoportailv3_js';
