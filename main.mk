INSTANCE_ID = main
VARS_FILE = vars_main.yaml
PRINT_OUTPUT = /var/lib/tomcat/webapps
PRINT_VERSION = 3
APACHE_VHOST=geoportailv3
APACHE_GRACEFUL=apachectl graceful
TOMCAT_STOP_COMMAND= systemctl stop tomcat.service
TOMCAT_START_COMMAND= systemctl start tomcat.service

include geoportailv3.mk
