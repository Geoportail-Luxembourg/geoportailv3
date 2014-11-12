from pyramid.view import view_config


@view_config(route_name='ngeo',
             renderer='geoportailv3:templates/ngeo.html')
def ngeo(request):
    return {'debug': 'debug' in request.params}

class My:
    def __init__(self,request):
        self.request = request

    @view_config(route_name='my_route',renderer='my_template.html')
    def my_view(self):
        return {'text': 'Hello world'}

    @view_config(route_name='my_json_route',renderer='json')
    def my_json_view(self):
        return {'text': 'Hello world'}
