from pyramid.view import view_config
from pyramid.response import Response
from pyramid.renderers import render

@view_config(route_name='appcache', http_cache=0)
def appcache(request):
    response = Response(render('../templates/geoportailv3.appcache', {'request': request}))
    response.content_type = 'text/cache-manifest'
    return response
