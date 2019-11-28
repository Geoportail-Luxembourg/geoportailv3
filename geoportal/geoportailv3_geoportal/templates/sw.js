<%
  from geoportailv3_geoportal.lib.sw_helper import get_urls
  urls = get_urls(request)
%>
% if 'no_service_worker' in request.registry.settings:
  self.registration.unregister();
  return;
% endif

const urls = [
  // '/dev/main.html',
  // '/dev/main.css',
  // '/dev/main.js',
% for url in urls:
  '${url}',
% endfor
];

<%include file="sw_content.js" />
