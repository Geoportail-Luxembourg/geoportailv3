/**
 * @module app.offline.Bar
 */
 import appModule from '../module.js';

 const exports = class {

  constructor() {
    this.barOpen_ = false;
  }

  isBarOpen() {
    return this.barOpen_;
  }

  toggleBar() {
    this.barOpen_ = !this.barOpen_;
  }

};

/**
 * @type {!angular.Module}
 */
 appModule.service('appOfflineBar', exports);

export default exports;
