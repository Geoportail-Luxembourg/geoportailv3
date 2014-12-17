from pyramid.paster import get_app
import os
os.environ['http_proxy'] = 'http://proxy:3128'
os.environ['https_proxy'] = 'http://proxy:3128'

# test configure the loggin system
from paste.script.util.logging_config import fileConfig
fileConfig('${directory}/production.ini')


application = get_app('${directory}/production.ini', 'main')
