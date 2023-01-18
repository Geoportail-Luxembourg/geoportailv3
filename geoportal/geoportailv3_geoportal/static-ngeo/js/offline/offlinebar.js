/**
 * @module app.offline.Bar
 */
 import appModule from '../module.js';

 const exports = class {

  constructor() {
    this.barOpen_ = false;
    this.ngeoOffline_ = false;
    this.fullOffline_ = false;
  }

  isBarOpen() {
    return this.barOpen_;
  }
  isNgeoOfflineActive() {
    return this.ngeoOffline_;
  }
  isFullOfflineActive() {
    return this.fullOffline_;
  }

  toggleBar() {
    this.barOpen_ = !this.barOpen_;
  }

  toggleNgeoOffline() {
    if (!this.isFullOfflineActive()) {
      this.ngeoOffline_ = !this.ngeoOffline_;
    }
  }

  toggleFullOffline() {
    if (!this.isNgeoOfflineActive()) {
      this.fullOffline_ = !this.fullOffline_;
    }
  }
};

/**
 * @type {!angular.Module}
 */
 appModule.service('appOfflineBar', exports);

export default exports;
