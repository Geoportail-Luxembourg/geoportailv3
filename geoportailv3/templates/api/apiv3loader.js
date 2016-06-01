## -*- coding: utf-8 -*-
<%
    settings = request.registry.settings
    proxy_wms_url = settings.get('proxy_wms_url')
    node_modules_path = settings.get('node_modules_path')
    closure_library_path = settings.get('closure_library_path')
%>\

(function() {
  document.write('<link rel="stylesheet" type="text/css" href="'
          + "${request.static_url('geoportailv3:static/build/apiv3.css')}" + '" />');
  document.write('<scr' + 'ipt type="text/javascript" src="'
          + "${request.static_url('geoportailv3:static/build/apiv3.js')}" + '"></scr' + 'ipt>');
})();
