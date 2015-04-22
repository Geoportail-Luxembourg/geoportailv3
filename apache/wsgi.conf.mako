#
# The Apache mod_wsgi configuration file.
#
# We use mod_wsgi's daemon mode. And we assign a specific process
# group to the WSGI application.
#
# Note: once we use mod_wsgi 3 we'll be able to get rid of the
# Location block by passing process-group and application-group
# options to the WSGIScriptAlias directive.
#

RewriteEngine on

# uncomment this if you need HTTP authentication/authorization to work (with
# repoze.who or any other security toolkit), see the Apache mod_wsgi FAQ to
# understand why mod_wsgi doesn't pass the user credentials to the WSGI
# application by default.
# http://code.google.com/p/modwsgi/wiki/FrequentlyAskedQuestions#Access_Control_Mechanisms
WSGIPassAuthorization On

RewriteRule ^${apache_entry_point}?$ /${instanceid}/wsgi/ [PT]
RewriteRule ^${apache_entry_point}api.js$ /${instanceid}/wsgi/api.js [PT]
RewriteRule ^${apache_entry_point}xapi.js$ /${instanceid}/wsgi/xapi.js [PT]
RewriteRule ^${apache_entry_point}apihelp.html$ /${instanceid}/wsgi/apihelp.html [PT]
RewriteRule ^${apache_entry_point}xapihelp.html$ /${instanceid}/wsgi/xapihelp.html [PT]
RewriteRule ^${apache_entry_point}theme/(.+)$ /${instanceid}/wsgi/theme/$1 [PT]
RewriteRule ^${apache_entry_point}routing/?$ /${instanceid}/wsgi/routing [PT]
RewriteRule ^${apache_entry_point}edit/?$ /${instanceid}/wsgi/edit [PT]
RewriteRule ^${apache_entry_point}mobile$ ${apache_entry_point}mobile/ [R]
RewriteRule ^${apache_entry_point}mobile/(.*)$ /${instanceid}/wsgi/mobile/$1 [PT]
RewriteRule ^${apache_entry_point}admin/?$ /${instanceid}/wsgi/admin/ [PT]
RewriteRule ^${apache_entry_point}search$ /${instanceid}/wsgi/fulltextsearch [PT]
RewriteRule ^${apache_entry_point}s/(.*)$ /${instanceid}/wsgi/short/$1 [PT]

% for theme in themes:
RewriteRule /${instanceid}/wsgi/${theme}$ /${instanceid}/wsgi/theme/${theme} [PT]
% endfor

# define a process group
# WSGIDaemonProcess must be commented/removed when running the project on windows
WSGIDaemonProcess c2cgeoportal:${instanceid} display-name=%{GROUP} user=${modwsgi_user} python-path=${python_path}

# define the path to the WSGI app
WSGIScriptAlias /${instanceid}/wsgi ${directory}/apache/geoportailv3.wsgi

# assign the WSGI app instance the process group defined aboven, we put the WSGI
# app instance in the global application group so it is always executed within
# the main interpreter
<Location /${instanceid}/wsgi>
    # WSGIProcessGroup must be commented/removed when running the project on windows
    WSGIProcessGroup c2cgeoportal:${instanceid}
    WSGIApplicationGroup %{GLOBAL}
</Location>
