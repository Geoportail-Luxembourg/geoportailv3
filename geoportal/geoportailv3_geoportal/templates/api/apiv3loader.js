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
          + "${request.static_url('geoportailv3_geoportal:static-ngeo/build/apiv3.css')}" + '" />');
  if (document.location.search.indexOf('debug') !== -1) {
    writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/base.js')}");
    writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/deps.js')}");
    writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/vendor.js')}");
    writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/apiv3.js')}");
    document.write(
      '<script>' +
      '  goog.define("goog.DEBUG", true);' +
      '  goog.define("goog.SEAL_MODULE_EXPORTS", false);' +
      '  goog.require("lux.Map");' +
      '</script>');
  } else {
    writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/vendor.js')}");
    writeScript("${request.static_url('geoportailv3_geoportal:static-ngeo/build/apiv3.js')}");
  }

  document.write('<script type="text/javascript">'
          + "lux.setBaseUrl('${request.route_url('base')}', '${request.scheme}');" + '</script>');
  document.write('<script type="text/javascript">'
          + "lux.setI18nUrl('${request.static_url('geoportailv3_geoportal:static-ngeo/build/fr.json')}');" + '</script>');
% if hasSC:
  document.write('<script type="text/javascript">'
          + "lux.setWmtsCrossOrigin(null);" + '</script>');
% endif
})();
