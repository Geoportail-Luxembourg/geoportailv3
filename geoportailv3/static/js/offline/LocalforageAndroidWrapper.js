goog.module('app.offline.LocalforageAndroidWrapper');
goog.module.declareLegacyNamespace();

const AbstractWrapper = goog.require('app.offline.AbstractLocalforageWrapper');


exports = class AndroidWrapper extends AbstractWrapper {
  constructor() {
    super();
    window['androidWrapper'] = this;
  }

  /**
   * @override
   */
  postToBackend(action) {
    const stringified = JSON.stringify(action);
    window['luxHost']['postMessageToAndroid'](stringified);
  }

  /**
   * @export
   * @param {string} actionString .
   */
  receiveFromAndroid(actionString) {
    const action = JSON.parse(actionString);
    this.receiveMessage({
      'data': action
    });
  }
};
