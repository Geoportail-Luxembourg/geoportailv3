/**
 * @fileoverview Provides a flash message service. That service helps
 * displaying general messages.
 */

goog.provide('app.Notify');


/**
 * @typedef {function(string)}
 */
app.Notify;


/**
 * @return {app.Notify} The notify function.
 */
app.notifyFactory = function() {

  var container = angular.element('<div class="notify"></div>');
  angular.element(document.body).append(container);

  return notify;

  /**
   * @param {string} msg Message to show.
   */
  function notify(msg) {
    var el = angular.element('<div class="alert alert-warning fade"></div>');
    container.append(el);
    el.html(msg).addClass('in');

    window.setTimeout(function() {
      el.alert('close');
    }, 5000);
  }
};

app.module.factory('appNotify', app.notifyFactory);
