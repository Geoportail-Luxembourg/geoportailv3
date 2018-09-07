goog.module('app.offline.LocalforageCordovaWrapper');
goog.module.declareLegacyNamespace();


/**
 * @typedef {{
 *   id: number,
 *   plugin: string,
 *   command: string,
 *   args: !Array<*>,
 *   context: (*|undefined)
 * }}
 */
// eslint-disable-next-line no-unused-vars
let CordovaAction;

exports = class {
  constructor() {
    window.addEventListener('message', this.receiveMessage_.bind(this), false);
    this.waitingPromises_ = new window.Map();
  }

  setItem(...args) {
    return this.createAction_('setItem', ...args);
  }

  getItem(...args) {
    return this.createAction_('getItem', ...args);
  }

  clear() {
    return this.createAction_('clear');
  }

  config(...args) {
    return this.createAction_('config', ...args);
  }

  createAction_(command, ...args) {
    /**
     * @type {CordovaAction}
     */
    const action = {
      'plugin': 'localforage',
      'command': command,
      'args': args,
      'id': Math.random()
    };
    console.log('sending action', action.command, action.id);
    const waitingPromise = {};
    const promise = new Promise(function(resolve, reject) {
      waitingPromise['resolve'] = resolve;
      waitingPromise['reject'] = reject;
    });
    this.waitingPromises_.set(action.id, waitingPromise);
    this.postToCordova_(action);
    return promise;
  }

  receiveMessage_(event) {
    /**
     * @type {CordovaAction}
     */
    const action = event['data'];
    const id = action.id;
    console.log('received action', action.command, id);

    const waitingPromise = this.waitingPromises_.get(id);
    if (action.command === 'error') {
      console.error(action.args, action.context);
      if (waitingPromise) {
        waitingPromise.reject(action.args, action.context);
        this.waitingPromises_.delete(id);
      }
    } else if (action.command === 'response') {
      console.log('Received response message from cordova');
      waitingPromise.resolve(...action.args);
      this.waitingPromises_.delete(id);
    } else {
      console.error('Unhandled command', action);
    }
  }

  postToCordova_(action) {
    window['parent'].postMessage(action, '*');
  }
};
