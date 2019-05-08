/**
 * @module app.NotifyFactory
 */
let exports = {};

/**
 * @fileoverview Provides a flash message service. That service helps
 * displaying general messages.
 */

import appModule from './module.js';
import appNotifyNotificationType from './NotifyNotificationType.js';

/**
 * @return {app.Notify} The notify function.
 */
function factory() {

  var container = angular.element('<div class="notify"></div>');
  angular.element(document.body).append(container);

  return notify;

  /**
   * @param {string} msg Message to show.
   * @param {app.NotifyNotificationType} notificationType The notification
   * type.
   */
  function notify(msg, notificationType) {

    var el = angular.element('<div class="alert ' + notificationType +
      ' fade"></div>');
    container.append(el);
    el.html(msg).addClass('in');
    var notifyDuration = 7000;
    if (notificationType === appNotifyNotificationType.WARNING) {
      notifyDuration = 4000;
    }

    window.setTimeout(function() {
      el.alert('close');
    }, notifyDuration);
  }
}

appModule.factory('appNotify', factory);


export default exports;
