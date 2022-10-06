## -*- coding: utf-8 -*-
<%
    settings = request.registry.settings
    proxy_wms_url = settings.get('proxy_wms_url')
    hasSC = ('sc' in request.params)
%>\

(function() {
  function writeScript(src) {
    document.write('<script src="' + src + '"></script>');
  }
  document.write('<link rel="stylesheet" type="text/css" href="'
          + "${request.static_url('geoportailv3_geoportal:static-ngeo/build/apiv4.css')}" + '" />');
  writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/ol.js')}");
  writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/proj4.js')}");
  document.write("<script>");
  document.write("proj4.defs('EPSG:2169', '+proj=tmerc +lat_0=49.83333333333334 +lon_0=6.166666666666667 +k=1 +x_0=80000 +y_0=100000 +ellps=intl +towgs84=-189.681,18.3463,-42.7695,-0.33746,-3.09264,2.53861,0.4598 +units=m +no_defs');")
  document.write("ol.proj.proj4.register(proj4);");
  document.write("</script>");
  writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/auto-complete.min.js')}");
  writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/apiv4.js')}");

  document.write('<script type="text/javascript">'
          + "lux.setBaseUrl('${request.route_url('base')}', '${request.scheme}');" + '</script>');
  document.write('<script type="text/javascript">'
          + "lux.setI18nUrl('${request.static_url('geoportailv3_geoportal:static-ngeo/build/fr.json')}');" + '</script>');
% if hasSC:
  document.write('<script type="text/javascript">'
          + "lux.setWmtsCrossOrigin(null);" + '</script>');
% endif
})();
