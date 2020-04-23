from pyramid.view import view_config
import logging

log = logging.getLogger(__name__)


@view_config(route_name='sw', http_cache=0, renderer='../templates/sw.js')
def appcache(request):
    request.response.content_type = 'application/javascript'
    return {}
