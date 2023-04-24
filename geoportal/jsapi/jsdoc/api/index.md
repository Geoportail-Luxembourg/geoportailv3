The Geoportail.lu V4 API is a web delivered service platform delivering both data and functionality, enabling geographical information to be shown on a map.
The Geoportail.lu V4 API enables the integration of geoportail functionalities in external web pages.
Although the options for data processing are limited compared with “real” office GIS software, some targeted queries and analyses are possible.


*Important Note: For access to the Geoportail.lu V4 API on your own servers, you will need to request access to the ACT, specifying the server address you wish to grant access too.*

For any assistance as well as for request access, please contact our support here : <support@geoportail.lu>

To help the developers, some examples and use cases are available on our [demo page](./examples)

A catalog of public layers is available on the [List of layers page](./examples/iterate_layers_api.html).

A catalog of public mymaps is available on the [List of public Mymaps page](./examples/public_mymaps.html).

The Geoportail.lu V4 API is built on top of the [OpenLayers API](https://openlayers.org/en/v6.9.0/apidoc/)
The Geoportail.lu V4 offers classes, methods, and properties to ease the build of geographical applications using luxembourg data.

Feel free to visit our [GitHub repository](https://github.com/Geoportail-Luxembourg/geoportailv3/tree/master/geoportal/jsapi) to have a look on our source code.

All the needed resources are loaded by including the following js script.
```html
<script src="https://apiv4.geoportail.lu/apiv4loader.js" type="text/javascript"></script>
```

The script automatically includes the Geoportail V4 libraries as well as the OpenLayers and proj4js libraries. Thus there is no need to include them again.

The core API object is a [lux.Map](module-map-Map.html) that extends an OpenLayers [ol.Map](https://openlayers.org/en/v6.9.0/apidoc/module-ol_Map-Map.html). This is the main entry point to create a basic map.

The main properties of a [lux.Map](module-map-Map.html) are:
 - *target* : The id or the html element where the map is displayed
 - *bgLayer* : The Id of the background layer.
 - *zoom* : The starting zoom level.
 - *position* : The central point of the map.

Displaying a map is simple as shown by the following code:
<pre><code>
var map = new lux.Map({
  target: 'map1',
  bgLayer: 'basemap_2015_global',
  zoom: 18,
  position: [76771, 72205]
});
</code></pre>
<div id="map1" style="width:250px; height:250px;"></div>
<script src="/apiv4loader.js"  type="text/javascript"></script>
<script>
var map = new lux.Map({
  target: 'map1',
  bgLayer: 'basemap_2015_global',
  zoom: 18,
  position: [76771, 72205]
});</script>
