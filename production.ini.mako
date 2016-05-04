[app:app]
use = egg:geoportailv3
project = geoportailv3
reload_templates = false
debug_authorization = false
debug_notfound = false
debug_routematch = false
debug_templates = false
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

[filter:weberror]
use = egg:WebError#error_catcher
debug = false
;error_log = 
;show_exceptions_in_wsgi_errors = true
;smtp_server = localhost
;error_email = janitor@example.com
;smtp_username = janitor
;smtp_password = "janitor's password"
;from_address = paste@localhost
;error_subject_prefix = "Pyramid Error"
;smtp_use_tls =
;error_message =

[filter:fanstatic]
use = egg:fanstatic#fanstatic
publisher_signature = fanstatic
base_url = /${instanceid}/wsgi
recompute_hashes = false
versioning = false
bottom = true
minified = true

[pipeline:main]
pipeline = weberror fanstatic app

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

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(asctime)s %(levelname)-5.5s [%(name)s][%(threadName)s] %(message)s

# End logging configuration
