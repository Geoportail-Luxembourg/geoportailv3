/**
 * @module ngeo.message.Notification
 */
import 'bootstrap/js/alert.js';
import googAsserts from 'goog/asserts.js';

import ngeoMessageMessage from 'ngeo/message/Message.js';
import * as olBase from 'ol/index.js';


const DEFAULT_DELAY = 7000
class Notification extends ngeoMessageMessage {
  /**
   * Provides methods to display any sort of messages, notifications, errors,
   * etc. Requires Bootstrap library (both CSS and JS) to display the alerts
   * properly.
   *
   * @constructor
   * @struct
   * @extends {ngeo.message.Message}
   * @param {angular.$timeout} $timeout Angular timeout service.
   * @ngdoc service
   * @ngname ngeoNotification
   * @abstract
   * @ngInject
   */
  constructor($timeout) {

    super();

    /**
     * @type {angular.$timeout}
     * @private
     */
    this.timeout_ = $timeout;

    const container = angular.element('<div class="ngeo-notification"></div>');
    angular.element(document.body).append(container);

    /**
     * @type {angular.JQLite}
     * @private
     */
    this.container_ = container;

    /**
     * @type {Object.<number, ngeo.message.Notification.CacheItem>}
     * @private
     */
    this.cache_ = {};

  };


  // MAIN API METHODS


  /**
   * Display the given message string or object or list of message strings or
   * objects.
   * @param {string|Array.<string>|ngeox.Message|Array.<ngeox.Message>}
   *     object A message or list of messages as text or configuration objects.
   * @export
   */
  notify(object) {
    this.show(object);
  };


  /**
   * Clears all messages that are currently being shown.
   * @export
   */
  clear() {
    for (const uid in this.cache_) {
      this.clearMessageByCacheItem_(this.cache_[parseInt(uid, 10)]);
    }
  };


  /**
   * @override
   */
  showMessage(message) {
    const type = message.type;
    googAsserts.assertString(type, 'Type should be set.');

    const classNames = ['alert', 'fade'];
    switch (type) {
      case ngeoMessageMessage.Type.ERROR:
        classNames.push('alert-danger');
        break;
      case ngeoMessageMessage.Type.INFORMATION:
        classNames.push('alert-info');
        break;
      case ngeoMessageMessage.Type.SUCCESS:
        classNames.push('alert-success');
        break;
      case ngeoMessageMessage.Type.WARNING:
        classNames.push('alert-warning');
        break;
      default:
        break;
    }

    const el = angular.element(`<div class="${classNames.join(' ')}"></div>`);
    let container;

    if (message.target) {
      container = angular.element(message.target);
    } else {
      container = this.container_;
    }

    container.append(el);
    el.html(message.msg).addClass('in');

    const delay = message.delay !== undefined ? message.delay :
      DEFAULT_DELAY;

    const item = /** @type {ngeo.message.Notification.CacheItem} */ ({
      el
    });

    // Keep a reference to the promise, in case we want to manually cancel it
    // before the delay
    const uid = olBase.getUid(el);
    item.promise = this.timeout_(() => {
      el.alert('close');
      delete this.cache_[uid];
    }, delay);

    this.cache_[uid] = item;
  };


  /**
   * Clear a message using its cache item.
   * @param {ngeo.message.Notification.CacheItem} item Cache item.
   * @private
   */
  clearMessageByCacheItem_(item) {
    const el = item.el;
    const promise = item.promise;
    const uid = olBase.getUid(el);

    // Close the message
    el.alert('close');

    // Cancel timeout in case we want to stop before delay. If called by the
    // timeout itself, then this has no consequence.
    this.timeout_.cancel(promise);

    // Delete the cache item
    delete this.cache_[uid];
  };
}

/**
 * Default delay (in milliseconds) a message should be displayed.
 * @type {number}
 * @private
 */
 Notification.DEFAULT_DELAY_ = DEFAULT_DELAY;
  
/**
 * @typedef {{
 *     el: angular.JQLite,
 *     promise: angular.$q.Promise
 * }}
 */
//CacheItem;


/**
 * @type {angular.Module}
 */
module = angular.module('ngeoNotification', [
]);

module.service('ngeoNotification', Notification);

Notification.module = module;




export default Notification;
