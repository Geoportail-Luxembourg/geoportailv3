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
