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

[filter:raven]
use = egg:raven#raven
dsn = https://ef76db542ae94bab8aedf9236cbcee55:08f7933d733346ae85725af5318b445c@sentry.geoportail.lu/3
include_paths = app

[pipeline:main]
pipeline =
    raven
    egg:WebError#evalerror
    fanstatic
    app

[server:main]
use = egg:waitress#main
host = 0.0.0.0
port = ${waitress_port}

# Begin logging configuration

[loggers]
keys = root, sentry, c2cgeoportal, geoportailv3

[handlers]
keys = console, sentry

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console, sentry

[logger_sentry]
level = WARN
handlers = console
qualname = sentry.errors
propagate = 0

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

[handler_sentry]
class = raven.handlers.logging.SentryHandler
args = ('https://ef76db542ae94bab8aedf9236cbcee55:08f7933d733346ae85725af5318b445c@sentry.geoportail.lu/3',)
level = WARNING
formatter = generic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(asctime)s %(levelname)-5.5s [%(name)s][%(threadName)s] %(message)s

# End logging configuration
