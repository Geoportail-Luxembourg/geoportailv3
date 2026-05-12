(function () {
  function writeScript(src) {
    document.write('<script src="' + src + '"><\/script>');
  }

  function writeStyle(href) {
    document.write('<link rel="stylesheet" type="text/css" href="' + href + '" />');
  }

  var buildRoot = '/dist/build';

  writeStyle(buildRoot + '/apiv4.css');
  writeScript(buildRoot + '/ol.js');
  writeScript(buildRoot + '/proj4.js');

  document.write('<script>');
  document.write("proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');");
  document.write('ol.proj.proj4.register(proj4);');
  document.write('<\/script>');

  writeScript(buildRoot + '/auto-complete.min.js');
  writeScript(buildRoot + '/apiv4.js');

  document.write('<script type="text/javascript">lux.setBaseUrl(window.location.origin + "/", window.location.protocol.replace(":", ""));<\/script>');
  document.write('<script type="text/javascript">lux.setI18nUrl("/static-ngeo/build/fr.json");<\/script>');

  var hasSC = new URLSearchParams(window.location.search).has('sc');
  if (hasSC) {
    document.write('<script type="text/javascript">lux.setWmtsCrossOrigin(null);<\/script>');
  }
})();
