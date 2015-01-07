from pyramid.paster import get_app

%if http_proxy:
import os
os.environ['http_proxy'] = '${http_proxy}'
os.environ['https_proxy'] = '${http_proxy}'
% endif

# test configure the loggin system
from paste.script.util.logging_config import fileConfig
fileConfig('${directory}/production.ini')

application = get_app('${directory}/production.ini', 'main')
