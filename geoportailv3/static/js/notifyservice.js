/**
 * @fileoverview Provides a flash message service. That service helps
 * displaying general messages.
 */


goog.provide('app.Notify');
goog.provide('app.NotifyNotificationType');

/**
 * @typedef {function(string, app.NotifyNotificationType)}
 */
app.Notify;

/**
 * @enum {string}
 */
app.NotifyNotificationType = {
  INFO: 'alert-info',
  WARNING: 'alert-warning',
  ERROR: 'alert-danger'
};

/**
 * @return {app.Notify} The notify function.
 */
app.notifyFactory = function() {

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
    if (notificationType === app.NotifyNotificationType.WARNING) {
      notifyDuration = 4000;
    }

    window.setTimeout(function() {
      el.alert('close');
    }, notifyDuration);
  }
};

app.module.factory('appNotify', app.notifyFactory);
