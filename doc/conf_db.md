Database configuration
======================

The database can be managed via SQL commands or via the GMF admin interface. The admin interface can be opened at the address  http://localhost:8080/admin/ with the credentials c2c/test1234


General comments
----------------

The luxembourg features can be found in some custom types for luxembourg. These have dedicated custom tabs in the admin interface (ex: internal WMS vs. external WMS).

Other feature are configured via some specific metadata, which is added for an object in the data catalog (ex: 3D WMTS layers)


Useful Metadata
---------------

- display_in_switcher: false for themes to hide the them in the switcher interface
- is_expanded: true for groups to open the group in the layer tree by default


Legend configuration
--------------------

Metadata legend_name


Timelayer configuration
-----------------------

There can be 2 types of time layers:
- WMS-T: the time information is provided by the server and must conform to the format:

- WMTS layers which are swappable by a time widget:

in this case, the layers must be added into a group which shall have the metadata:
time_config = "time_group"

each child layer must have information in the metadata about its time stamp in the following form:
time_config = {"time": "2010"}

the time stamp may be specified by a simple year or a more precise date.


Background layers
-----------------

Allowable background layers must be registered in the special layer group named `background`. Some hardcoded layer names activate mapbox vector tiles.


Layer exclusion
---------------

One can configure mutual exclusion of several layers via the metadata `exclusion`.

The metadata `exclusion` contains a list of equivalence class ids which shall be mutually exclusive. Each id is ether an integer or a string.

Example: exclusion = [2, 55, "woods", 4]


Two layers (background, 3D or regular layers) cannot be displayed simultaneously if they contain the same equivalence class in their metadata.

Example:
- layer1 : exclusion = [2, 55, "road_layer", 4]
- layer2 : exclusion = [8, "road_layer", 41]
- layer3 : exclusion = [41]

layer1 cannot be displayed with layer2 ("road_layer") and layer2 cannot be displayed with layer3 (41). However layer1 can be displayed with layer3.

If an exclusion is detected when selecting a new layer, all excluded existing layers are deselected with a warning message.


3D layers
---------

3d layers are registered as regular WMTS layers with special hierarchy and metadata. There can be 3 types of 3d layers:
- data : 3d shapes such as buildings to be displayed in 3d terrain view
- meshes : 3d meshes calculated from point clouds
- terrain : provision for terrain data (currently not configurable, but hard-coded)

metadata useful for 3d setup:
- ol3d_type
- ol3d_defaultlayer
- ol3d_options

3d data shall be put into a theme with metadata ol3d_type = data. There can be layer groups which will be reproduced in the catalog tree.

3d meshes shall be put into a theme with metadata ol3d_type = mesh. By default, meshes are not mutually exclusive, but the [exclusion mecanism](#layer-exclusion) may be used, for example use the metadata ["3d_meshes"] for all meshes and they will be mutually exclusive.

Layers displayed by default on first activation of 3D mode can be defined via the metadata `ol3d_defaultlayer = true`. All default layers will be selected on initial activation of 3D mode.

`ol3d_options` can hand over options to the creation of the Cesium 3d tileset. The parameters are defined as a JSON dict.

There are 3 luxembourg custom parameters:
- heightOffset
- latOffset
- longOffset

The other parameters can be any parameters accepted by [Cesium tilesets](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html)

For example for use of a mesh with vertical offset of 47.8m, you can define the following metadata: `ol3d_options: {"heightOffset": -47.8}`

To configure a 3D terrain definition, add a new WMTS layer with the metadata `ol3d_type:terrain` The complete root URL for the terrain tile server will be concatenated from the fields `GetCapabilities URL` and `WMTS layer name` with an additional slash (/) if needed.
There shall be one terrain defition per interface (eg. desktop, main) otherwise the request to the DB fails (the query checks for `one()` object, if several layers are found, the query will fail.
