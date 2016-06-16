goog.provide('lux');
goog.provide('lux.Map');

goog.require('goog.dom');
goog.require('ol.events');
goog.require('ol.Map');
goog.require('ol.Overlay');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.source.OSM');

/**
 * @classdesc
 * The map is the core component of the Geoportail V3 API.
 *
 * @constructor
 * @extends {ol.Map}
 * @param {olx.MapOptions} options Map options.
 * @export
 */
lux.Map = function(options) {
  options.view = new ol.View({
    zoom: 5,
    center: [0, 0]
  });
  options.layers = [new ol.layer.Tile({
    source: new ol.source.OSM()
  })];
  goog.base(this, options);
};
goog.inherits(lux.Map, ol.Map);

/**
 * Show a marker on the map at the given location.
 * @param {luxx.MarkerOptions} options Config options
 * @export
 */
lux.Map.prototype.showMarker = function(options) {
  var element = goog.dom.createDom(goog.dom.TagName.DIV);
  var image = goog.dom.createDom(goog.dom.TagName.IMG);
  image.src = options.iconURL ||
      'http://openlayers.org/en/master/examples/data/icon.png';
  element.appendChild(image);
  var position = options.position || this.getView().getCenter();
  this.addOverlay(new ol.Overlay({
    element: element,
    position: position,
    positioning: options.positioning || 'center-center'
  }));

  if (options.autoCenter) {
    this.getView().setCenter(position);
  }

  if (options.html) {
    var popup;
    var showPopupEvent = options.hover ?
        ol.events.EventType.MOUSEMOVE : ol.events.EventType.CLICK;
    ol.events.listen(element, showPopupEvent, (function() {
      if (!popup) {
        var element = buildPopupLayout_(options.html, !options.hover);
        popup = new ol.Overlay({
          element: element,
          position: position,
          positioning: 'bottom-center',
          offset: [0, -20],
          insertFirst: false
        });

        if (!options.hover) {
          var closeBtn = element.querySelectorAll('.lux-popup-close')[0];
          ol.events.listen(closeBtn, ol.events.EventType.CLICK, function() {
            this.removeOverlay(popup);
          }.bind(this));
        }
      }
      this.addOverlay(popup);
      this.renderSync();
    }).bind(this));

    if (options.hover) {
      ol.events.listen(element, ol.events.EventType.MOUSEOUT, function() {
        this.removeOverlay(popup);
      }.bind(this));
    }
  }

};


/**
 * Builds the popup layout.
 * @param {string} html The HTML/text to put into the popup.
 * @param {boolean} addCloseBtn Whether to add a close button or not.
 * @return {Element} The created element.
 * @private
 */
function buildPopupLayout_(html, addCloseBtn) {
  var container = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup'
  });
  var arrow = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup-arrow'
  });
  var content = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': 'lux-popup-content'
  });
  content.innerHTML = html;

  if (addCloseBtn) {
    var closeBtn = goog.dom.createDom(goog.dom.TagName.BUTTON, {
      'class': 'lux-popup-close'
    });
    closeBtn.innerHTML = '&times;';
    goog.dom.insertChildAt(content, closeBtn, 0);
  }

  goog.dom.append(container, [arrow, content]);
  return container;
}
