ifdef VARS_FILE
VARS_FILES += ${VARS_FILE} vars.yaml
else
VARS_FILE = vars.yaml
VARS_FILES += ${VARS_FILE}
endif
API_LESS_FILES = $(shell find $(PACKAGE)/static/less -type f -name '*.api.less' 2> /dev/null)
API_JS_FILES = $(shell find jsapi/src/ -type f -name '*.js')

DOCKER_WEB_HOST = localhost:8042
DOCKER_WEB_PROTOCOL = http

TEMPLATE_EXCLUDE += LUX_alembic/script.py.mako node_modules

# FIXME add lb language
LANGUAGES = en fr de
CGXP = FALSE
CGXP_API = FALSE
MOBILE = FALSE
NGEO = TRUE
TILECLOUD_CHAIN = FALSE

NGEO_INTERFACES = main

DISABLE_BUILD_RULES += test-packages test-packages-ngeo

CONFIG_VARS += ldap
CONFIG_VARS += dbsessions
CONFIG_VARS += proxy_wms_url
CONFIG_VARS += mailer
CONFIG_VARS += authorized_ips
CONFIG_VARS += pag
CONFIG_VARS += casipo
CONFIG_VARS += exclude_theme_layer_search
CONFIG_VARS += overview_map
CONFIG_VARS += modify_notification
CONFIG_VARS += https_proxy
CONFIG_VARS += print_urls
CONFIG_VARS += no_proxy
CONFIG_VARS += lidar
CONFIG_VARS += routing
CONFIG_VARS += referrer
CONFIG_VARS += excluded_themes_from_search
APACHE_VHOST ?= luxembourg-geomapfish

NGEO_LIBS_JS_FILES += node_modules/fuse.js/src/fuse.min.js
NGEO_LIBS_JS_FILES += node_modules/jszip/dist/jszip.min.js
NGEO_LIBS_JS_FILES += node_modules/babel-polyfill/dist/polyfill.min.js
NGEO_LIBS_JS_FILES += node_modules/url-polyfill/url-polyfill.min.js

UTILITY_HELP = 	-e "- update-translations	Synchronize the translations with Transifex" \
        "\n- recreate-search-poi	Recreate the ElasticSearch POI Index" \
        "\n- recreate-search-layers	Recreate the ElasticSearch Layers Index" \
        "\n- update-search-layers	Update the ElasticSearch Layers Index" \
        "\n- update-tooltips	Update the automatic generated tooltips fields" \
        "\n- pull-translations	Pull the translation" \
# Add rule that copies the font-awesome fonts to the static/build directory.
POST_RULES = .build/fonts.timestamp

SERVER_LOCALISATION_SOURCES_FILES += $(PACKAGE)/views/pag.py $(PACKAGE)/views/luxprintproxy.py

TOOLTIPS_LOCALISATION_FILES = $(addprefix $(PACKAGE)/locale/, $(addsuffix /LC_MESSAGES/$(PACKAGE)-tooltips.mo, $(LANGUAGES)))

# Add JS API target to "help" target
SECONDARY_HELP = -e ""
SECONDARY_HELP += "\n"
SECONDARY_HELP += "JS API targets:\n"
SECONDARY_HELP += "\n"
SECONDARY_HELP += "- build-api			Build CSS & JS for the API.\n"
SECONDARY_HELP += "- build-js-api		Build the JS API project.\n"
SECONDARY_HELP += "- build-css-api		Build the CSS API project.\n"
SECONDARY_HELP += "- lint-js-api		Run the linter on the JS API code.\n"
SECONDARY_HELP += "- clean-js-api		Remove generated files of the JS API project.\n"
SECONDARY_HELP += "- serve-js-api		Start a development server for the JS API project."

include CONST_Makefile

build-server: template-generate compile-py-catalog $(SERVER_LOCALISATION_FILES) $(CLIENT_LOCALISATION_FILES) $(TOOLTIPS_LOCALISATION_FILES)

# targets related to the JS API
API_OUTPUT_DIR =  $(OUTPUT_DIR)
API_DIR = jsapi
API_TOOLS_DIR = $(API_DIR)/tools
API_SRC_JS_FILES := $(shell find jsapi -type f -name '*.js')

REQUIREMENTS += "suds>=0.4"
REQUIREMENTS += "ipaddr==2.1.11"
REQUIREMENTS += "pyocclient==0.2"
# DEV_REQUIREMENTS += git+https://github.com/transifex/transifex-client.git@fix-proxies#egg=transifex-client-proxies
# DEV_REQUIREMENTS += git+https://github.com/petzlux/transifex-client.git
PRINT_VERSION = NONE

.PHONY: update-translations
update-translations: $(PACKAGE)/locale/$(PACKAGE)-server.pot $(PACKAGE)/locale/$(PACKAGE)-client.pot $(PACKAGE)/locale/$(PACKAGE)-tooltips.pot
	$(VENV_BIN)/tx push -s
	$(VENV_BIN)/tx pull -f

.PHONY: pull-translations
pull-translations:
	$(VENV_BIN)/tx pull -f

.build/fonts.timestamp: .build/node_modules.timestamp
	mkdir -p $(PACKAGE)/static/build/fonts
	cp node_modules/font-awesome/fonts/* $(PACKAGE)/static/build/fonts/
	touch $@

.PHONY: update-search-layers
update-search-layers:
	$(VENV_BIN)/layers2es --interfaces desktop --no-themes --no-blocks --no-folders

.PHONY: recreate-search-layers
recreate-search-layers:
	$(VENV_BIN)/layers2es --interfaces desktop --no-themes --no-blocks --no-folders --recreate-index

.PHONY: recreate-search-poi
recreate-search-poi:
	$(VENV_BIN)/db2es --reset --index

update-tooltips:
	$(VENV_BIN)/tooltips2pot

.PHONY: $(PACKAGE)/locale/$(PACKAGE)-tooltips.pot
$(PACKAGE)/locale/$(PACKAGE)-tooltips.pot:
	mkdir -p $(dir $@)
	$(VENV_BIN)/tooltips2pot
	msguniq $@ -o $@

.PHONY: build-api
build-api: \
	# lint-js-api \
	# build-js-api \
	# build-css-api \
	# build-js-apidoc \
	# create-xx-lang

.PHONY: create-xx-lang
create-xx-lang:
	mkdir -p $(OUTPUT_DIR)/locale/xx
	cp -rf $(OUTPUT_DIR)/locale/fr/$(PACKAGE).json $(OUTPUT_DIR)/locale/xx/$(PACKAGE).json

# Add new dependency to build target
build: build-api

.PHONY: build-js-api
build-js-api: \
	$(API_OUTPUT_DIR)/apiv3.js

.PHONY: build-css-api
build-css-api: \
	$(API_OUTPUT_DIR)/apiv3.css

$(API_OUTPUT_DIR)/apiv3.css: $(API_LESS_FILES) .build/node_modules.timestamp
	mkdir -p $(dir $@)
	./node_modules/.bin/lessc --clean-css $(PACKAGE)/static/less/$(PACKAGE).api.less $@

$(API_OUTPUT_DIR)/apiv3.js: $(API_DIR)/config.json \
		$(API_SRC_JS_FILES) \
		.build/node_modules.timestamp
	mkdir -p $(dir $@)
	node node_modules/openlayers/tasks/build.js $< $@
	cat node_modules/proj4/dist/proj4.js node_modules/whatwg-fetch/fetch.js node_modules/d3/build/d3.min.js \
	node_modules/js-autocomplete/auto-complete.min.js \
	node_modules/promise-polyfill/promise.min.js \
	node_modules/url-polyfill/url-polyfill.min.js \
	$@ > concatenated.js
	mv concatenated.js $@

.build/jsdocOl3.js: jsapi/jsdoc/get-ol3-doc-ref.js
	node $< > $@.tmp
	mv $@.tmp $@

# .PHONY: build-js-apidoc
# build-js-apidoc: node_modules/openlayers/config/jsdoc/api/index.md \
# 			jsapi/jsdoc/api/conf.json $(API_SRC_JS_FILES) \
# 			$(shell find node_modules/openlayers/config/jsdoc/api/template -type f) \
# 			.build/node_modules.timestamp \
# 			.build/jsdocOl3.js \
# 			jsapi/examples/index.html
# 	@mkdir -p $(@D)
# 	@rm -rf $(API_OUTPUT_DIR)/apidoc
# 	node_modules/.bin/jsdoc jsapi/jsdoc/api/index.md -c jsapi/jsdoc/api/conf.json  -d $(API_OUTPUT_DIR)/apidoc
# 	cp -rf jsapi/examples $(API_OUTPUT_DIR)/apidoc

.PHONY: serve-js-api
serve-js-api: .build/node_modules.timestamp
	node $(API_TOOLS_DIR)/serve.js

.PHONY: lint-js-api
lint-js-api: ./node_modules/.bin/eslint .build/node_modules.timestamp .build/api.eslint.timestamp

.build/api.eslint.timestamp: $(API_JS_FILES)
	mkdir -p $(dir $@)
	./node_modules/.bin/eslint $(filter-out .build/node_modules.timestamp, $?)
	touch $@

# Add new dependency to clean target
clean: clean-js-api

.PHONY: clean-js-api
clean-js-api:
	rm -rf $(API_OUTPUT_DIR)/apiv3.*

# REMOVE ME ? (Was added to pass upgrade)
.PRECIOUS: .build/locale/%/LC_MESSAGES/gmf.po
.build/locale/%/LC_MESSAGES/gmf.po: $(TX_DEPENDENCIES)
	$(PRERULE_CMD)

# REMOVE ME ? (Was added to pass upgrade)
.PRECIOUS: .build/locale/%/LC_MESSAGES/ngeo.po
.build/locale/%/LC_MESSAGES/ngeo.po: $(TX_DEPENDENCIES)
	$(PRERULE_CMD)
