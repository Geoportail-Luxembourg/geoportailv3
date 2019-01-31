goog.module('app.offline.LocalforageCordovaWrapper');
goog.module.declareLegacyNamespace();


const AbstractWrapper = goog.require('app.offline.AbstractLocalforageWrapper');


exports = class CordovaWrapper extends AbstractWrapper {
  constructor() {
    super();
    window.addEventListener('message', this.receiveMessage.bind(this), false);
  }

  /**
   * @override
   */
  postToBackend(action) {
    window['parent'].postMessage(action, '*');
  }
};
