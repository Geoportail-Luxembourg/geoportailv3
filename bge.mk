INSTANCE_ID = bge
VARS_FILE = vars_geoportailv3.yaml

APACHE_CONF_DIR = /var/www/conf
PRINT_OUTPUT = /usr/share/tomcat8/webapps
TOMCAT_SERVICE_COMMAND ?= sudo /etc/init.d/tomcat8

include geoportailv3.mk
