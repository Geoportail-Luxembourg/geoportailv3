[app:app]
use = egg:geoportailv3
project = geoportailv3
reload_templates = true
debug_authorization = false
debug_notfound = false
debug_routematch = false
debug_templates = true
mako.directories = geoportailv3:templates
    c2cgeoportal:templates

authtkt_secret = ${authtkt["secret"]}
authtkt_cookie_name = ${authtkt["cookie_name"]}
% if "timeout" in authtkt:
authtkt_timeout = ${authtkt["timeout"]}
% endif

app.cfg = %(here)s/.build/config.yaml

elastic.servers = ${search_host}
elastic.index = ${search_index}

[filter:fanstatic]
use = egg:fanstatic#fanstatic
publisher_signature = fanstatic
base_url = /${instanceid}/wsgi
recompute_hashes = false
versioning = false
bottom = true
minified = true

[pipeline:main]
pipeline =
    egg:WebError#evalerror
    fanstatic
    app

[server:main]
use = egg:waitress#main
host = 0.0.0.0
port = ${waitress_port}

# Begin logging configuration

[loggers]
keys = root, c2cgeoportal, geoportailv3

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[logger_c2cgeoportal]
level = WARN
handlers =
qualname = c2cgeoportal

[logger_geoportailv3]
level = WARN
handlers =
qualname = geoportailv3

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine
# "level = INFO" logs SQL queries.
# "level = DEBUG" logs SQL queries and results.
# "level = WARN" logs neither.  (Recommended for production systems.)

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(asctime)s %(levelname)-5.5s [%(name)s][%(threadName)s] %(message)s

# End logging configuration
