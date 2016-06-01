from pyramid.view import view_config
import logging

log = logging.getLogger(__name__)


@view_config(route_name='jsapiloader',
             renderer='geoportailv3:templates/api/apiv3loader.js')
def apiloader(request):
    return {}
