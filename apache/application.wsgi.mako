import site
import sys
import re

site.addsitedir("${python_path}")

# Remove site packages
regex = re.compile("^/usr/lib/python.\../dist-packages$")
sys.path = [p for p in sys.path if regex.match(p) is None]

from pyramid.paster import get_app, setup_logging

%if http_proxy:
import os
os.environ['http_proxy'] = '${http_proxy}'
os.environ['https_proxy'] = '${http_proxy}'
% endif

configfile = "${directory}/${'development' if development == 'TRUE' else 'production'}.ini"
setup_logging(configfile)
application = get_app(configfile, 'main')
