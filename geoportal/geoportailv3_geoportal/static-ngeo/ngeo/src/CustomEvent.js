/**
 * @module ngeo.CustomEvent
 */
import * as olBase from 'ol/index.js';
import olEventsEvent from 'ol/events/Event.js';

/**
 * @constructor
 * @extends {ol.events.Event}
 * @param {string} type Event type.
 * @param {T} detail Event Detail.
 * @template T
 */
class CustomEvent extends olEventsEvent{

  constructor(type, detail = {}) {

    super(type)

    /**
     * @type {T}
     */
    this.detail = detail;

  };

}


export default CustomEvent;
