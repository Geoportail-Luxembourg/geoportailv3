ifdef VARS_FILE
VARS_FILES += ${VARS_FILE} vars_geoportailv3.yaml
else
VARS_FILE = vars_geoportailv3.yaml
VARS_FILES += ${VARS_FILE}
endif
API_LESS_FILES = $(shell find $(PACKAGE)/static/less -type f -name '*.api.less' 2> /dev/null)
API_JS_FILES = $(shell find jsapi/src/ -type f -name '*.js')

TEMPLATE_EXCLUDE += LUX_alembic/script.py.mako node_modules

LANGUAGES = en fr de lb
CGXP = FALSE
MOBILE = FALSE
NGEO = TRUE
TILECLOUD_CHAIN = FALSE

DISABLE_BUILD_RULES += test-packages test-packages-ngeo

CONFIG_VARS += ldap
CONFIG_VARS += sqlalchemy_engines
CONFIG_VARS += proxy_wms_url
CONFIG_VARS += turbomail
CONFIG_VARS += authorized_ips
CONFIG_VARS += pag
CONFIG_VARS += exclude_theme_layer_search
CONFIG_VARS += overview_map
CONFIG_VARS += modify_notification
CONFIG_VARS += https_proxy

APACHE_VHOST ?= luxembourg-geomapfish

NGEO_LIBS_JS_FILES += node_modules/fuse.js/src/fuse.min.js

UTILITY_HELP = 	-e "- update-translations	Synchronize the translations with Transifex" \
        "\n- recreate-search-poi	Recreate the ElasticSearch POI Index" \
        "\n- recreate-search-layers	Recreate the ElasticSearch Layers Index" \
        "\n- update-search-layers	Update the ElasticSearch Layers Index" \
        "\n- update-tooltips	Update the automatic generated tooltips fields" \
        "\n- pull-translations	Pull the translation" \
# Add rule that copies the font-awesome fonts to the static/build directory.
POST_RULES = .build/fonts.timestamp

SERVER_LOCALISATION_SOURCES_FILES += $(PACKAGE)/views/pag.py $(PACKAGE)/views/luxprintproxy.py

# Add JS API target to "help" target
SECONDARY_HELP = ""
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

# targets related to the JS API
API_OUTPUT_DIR =  $(OUTPUT_DIR)
API_DIR = jsapi
API_TOOLS_DIR = $(API_DIR)/tools
API_SRC_JS_FILES := $(shell find jsapi -type f -name '*.js')

REQUIREMENTS += "suds>=0.4"
REQUIREMENTS += "ipaddr==2.1.11"
REQUIREMENTS += "pyocclient==0.2"
# DEV_REQUIREMENTS += git+https://github.com/transifex/transifex-client.git@fix-proxies#egg=transifex-client-proxies
DEV_REQUIREMENTS += git+https://github.com/petzlux/transifex-client.git
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
	lint-js-api \
	build-js-api \
	build-css-api

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
