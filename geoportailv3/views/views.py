from pyramid.view import view_config


@view_config(route_name='ngeo',
             renderer='geoportailv3:templates/ngeo.html')
def ngeo(request):
    return {'debug': 'debug' in request.params}
