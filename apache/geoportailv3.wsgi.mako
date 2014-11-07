from pyramid.paster import get_app
application = get_app('${directory}/production.ini', 'main')
