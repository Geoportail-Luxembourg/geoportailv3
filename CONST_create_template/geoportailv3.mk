ifdef VARS_FILE
VARS_FILES += ${VARS_FILE} vars_geoportailv3.yaml
else
VARS_FILE = vars_geoportailv3.yaml
VARS_FILES += ${VARS_FILE}
endif

# The hostname use in the browser to open the application
APACHE_VHOST ?= geoportailv3
INSTANCE_ID ?= geoportailv3
TILECLOUD_CHAIN ?= FALSE
VISIBLE_WEB_HOST ?= example.com

# Deploy branch
DEPLOY_BRANCH_DIR ?= /var/www/vhosts/$(APACHE_VHOST)/private/deploybranch
GIT_REMOTE_URL ?= git@github.com:camptocamp/geoportailv3.git
DEPLOY_BRANCH_BASE_URL ?= $(VISIBLE_PROTOCOL)://$(VISIBLE_HOST)
DEPLOY_BRANCH_MAKEFILE ?= geoportailv3.mk

include CONST_Makefile
