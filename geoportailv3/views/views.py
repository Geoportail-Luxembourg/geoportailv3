from pyramid.view import view_config


@view_config(route_name='index',
             renderer='geoportailv3:templates/index.html')
def index(request):
    return {'debug': 'debug' in request.params}
