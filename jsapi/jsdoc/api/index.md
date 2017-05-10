<p>The Geoportail.lu V3 API is a web delivered service platform delivering both data and functionality, enabling geographical information to be shown on a map.
The Geoportail.lu V3 API enables the integration in external web pages of  geoportail functionalities.
Although the options for data processing are limited compared with “real” office GIS software, some targeted queries and analyses are possible.</p>
<p><i>Important Note: For access to the Geoportail.lu V3 API on your own servers, you will need to request access to the ACT, specifying the server address you wish to grant access too.</i>
For any assistance as well as for request access, please contact our support here : <a href="mailto:support.geoportail@act.etat.lu">support.geoportail@act.etat.lu</a></p>
<p>To help the developers, some examples and use cases are available on our <a href="./examples/">demo page</a></p>
<p>The catalog of public layers is available on the <a href="./examples/iterate_layers_api.html">List of layers page.</a></p>
<p>The Geoportail.lu V3 API is built on top of the <a href="//openlayers.org/en/latest/apidoc/">OpenLayers 3 API</a>.
The Geoportail.lu V3 offers classes, methods, and properties to ease the build of geographical applications using luxembourg data.</p>
<p>All the needed resources are loaded by including the following js script.</p>
<pre>
&lt;script src="//apiv3.geoportail.lu/apiv3loader.js"  type="text/javascript"&gt;&lt;/script&gt;
</pre>
<p>The script automaticaly includes the Geoportail v3 libraries as well as the OpenLayers V3.x libraries. Thus there is no need to include it again.</p>
<p>
  The core API object is a [lux.Map](lux.Map.html) that extends an OpenLayers [ol.Map](//openlayers.org/en/master/apidoc/ol.Map.html). This is the main entry point to create a basic map.
</p>
<p>
The main properties of a [lux.Map](lux.Map.html) are : 
</p>
<ul>
<li><i>target</i> : The id or the html element where the map is displayed</li>
<li><i>bgLayer</i> : The Id of the background layer.</li>
<li><i>zoom</i> : The starting zoom level.</li>
<li><i>position</i> : The central point of the map.</li>
</ul>
<p>Displaying a map is simple as shown by the following code : </p>
<pre><code>
var map = new lux.Map({
  target: 'map1',
  bgLayer: 'basemap_2015_global',
  zoom: 18,
  position: [75977, 75099]
});
</code></pre>
<div id="map1" style="width:250px"></div>
<script src="//apiv3.geoportail.lu/apiv3loader.js"  type="text/javascript"></script>
<script>
var map = new lux.Map({
  target: 'map1',
  bgLayer: 'basemap_2015_global',
  zoom: 18,
  position: [75977, 75099]
});</script>

