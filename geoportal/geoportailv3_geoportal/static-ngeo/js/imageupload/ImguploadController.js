/**
 * @module app.imageupload.ImguploadController
 */
/**
 * @fileoverview This file provides a "mymaps" directive. This directive is
 * used to insert a MyMaps block  into the HTML page.
 * Example:
 *
 * <app-mymaps></app-mymaps>
 *
 */

import appModule from '../module.js';

import appNotifyNotificationType from '../NotifyNotificationType.js';

/**
 * @param {angular.$parse} $parse The parse service.
 * @param {angular.$http} $http The http service.
 * @param {app.Notify} appNotify Notify service.
 * @param {angularGettext.Catalog} gettextCatalog Gettext service.
 * @param {string} mymapsUrl URL to "mymaps" Feature service.
 * @param {ngeo.offline.Mode} ngeoOfflineMode The offline mode service.
 * @constructor
 * @ngInject
 */
const exports = function($parse, $http, appNotify, gettextCatalog,
    mymapsUrl, ngeoOfflineMode) {
  /**
   * @private
   */
  this.ngeoOfflineMode_ = ngeoOfflineMode;

  /**
   * @type {angular.$parse}
   * @private
   */
  this.parse_ = $parse;

  /**
   * @type {angular.$http}
   * @private
   */
  this.$http_ = $http;

  /**
   * @type {app.Notify}
   * @private
   */
  this.notify_ = appNotify;

  /**
   * @type {angularGettext.Catalog}
   */
  this.gettextCatalog = gettextCatalog;

  /**
   * @type {string}
   * @private
   */
  this.mymapsUrl_ = mymapsUrl;
};


/**
 * Inits the attributes form (ie. gets the name and description from feature).
 * @param {Blob} file the file to upload
 * @param {!angular.Scope} scope Scope.
 * @param {angular.Attributes} attrs Attributes.
 */
exports.prototype.uploadFileToUrl = function(file, scope,
    attrs) {
  var path = '/upload_image';
  if ('appSymbolupload' in attrs) {
    path = '/upload_symbol';
  }
  var model = this.parse_(attrs['appImgupload']);
  var modelSetter = model.assign;
  if (!file) {
    modelSetter(scope, undefined);
  } else {
    if (this.ngeoOfflineMode_.isEnabled()) {
      const reader  = new FileReader();
      reader.addEventListener('load', () => {
        modelSetter(scope, {
          'image': reader.result,
          'thumbnail': reader.result
        });
      }, false);
      reader.readAsDataURL(file);
    } else {
      var fd = new FormData();
      fd.append('file', file);
      this.$http_.post(this.mymapsUrl_ + path, fd, {
        transformRequest: angular.identity,
        headers: {'Content-Type': undefined}
      })
      .then(response => {
        modelSetter(scope, response.data);
      }, () => {
        var msg = this.gettextCatalog.getString(
                'Ce format d\'image n\'est as supporté.');
        this.notify_(msg, appNotifyNotificationType.ERROR);
      });
    }
  }
};

appModule.controller('AppImguploadController', exports);


export default exports;
