
DOCKER_BASE ?= camptocamp/geoportailv3
DOCKER_TAG ?= latest
GIT_HASH ?= $(shell git rev-parse HEAD)


UTILITY_HELP = -e "- update-translations	Synchronize the translations with Transifex" \
        "\n- recreate-search-poi	Recreate the ElasticSearch POI Index" \
        "\n- recreate-search-layers	Recreate the ElasticSearch Layers Index" \
        "\n- update-search-layers	Update the ElasticSearch Layers Index" \
        "\n- update-tooltips	Update the automatic generated tooltips fields" \
        "\n- pull-translations	Pull the translation"

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

.PHONY: help
help:
	@echo "Usage: make <target>"
	@echo
	@echo "Main targets:"
	@echo
	@echo  "- build		Build the porject"
	@echo
	@echo "Utility targets:"
	@echo
	@echo $(UTILITY_HELP)
	@echo
	@echo "Secondary targets:"
	@echo
	@echo $(SECONDARY_HELP)


.PHONY: build
build: docker-build-geoportal docker-build-config

.PHONY: docker-build-geoportal
docker-build-geoportal:
	docker build --tag=$(DOCKER_BASE)-geoportal:$(DOCKER_TAG) --build-arg=GIT_HASH=$(GIT_HASH) geoportal

.PHONY: docker-build-config
docker-build-config:
	docker build --tag=$(DOCKER_BASE)-config:$(DOCKER_TAG) .

DOCKER_COMPOSE_PROJECT ?= geoportalv3
DOCKER_CONTAINER = $(DOCKER_COMPOSE_PROJECT)_geoportal_1
PACKAGE ?= geoportalv3
NGEO_INTERFACES ?= main
APP_JS_FILES = $(shell find geoportal/$(PACKAGE)_geoportal/static-ngeo/js -type f -name '*.js' 2> /dev/null)
APP_HTML_FILES += $(addprefix geoportal/$(PACKAGE)_geoportal/static-ngeo/js/apps/, $(addsuffix .html.ejs, $(NGEO_INTERFACES)))
APP_DIRECTIVES_PARTIALS_FILES += $(shell find geoportal/$(PACKAGE)_geoportal/static-ngeo/js -type f -name '*.html' 2> /dev/null)
PRINT_CONFIG_FILE ?= print/print-apps/$(PACKAGE)/config.yaml.tmpl
I18N_SOURCE_FILES += $(APP_HTML_FILES) \
	$(APP_JS_FILES) \
	$(APP_DIRECTIVES_PARTIALS_FILES) \
	geoportal/config.yaml \
	geoportal/development.ini \
	$(PRINT_CONFIG_FILE)


.PHONY: update-po
update-po:
	docker cp geoportal/geoportailv3_geoportal/locale/en/LC_MESSAGES/geoportailv3_geoportal-client.po $(DOCKER_CONTAINER):/tmp/en.po
	docker cp geoportal/geoportailv3_geoportal/locale/fr/LC_MESSAGES/geoportailv3_geoportal-client.po $(DOCKER_CONTAINER):/tmp/fr.po
	docker cp geoportal/geoportailv3_geoportal/locale/de/LC_MESSAGES/geoportailv3_geoportal-client.po $(DOCKER_CONTAINER):/tmp/de.po
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-client.cfg --output /tmp/geoportailv3_geoportal-client.pot $(I18N_SOURCE_FILES)
	docker exec $(DOCKER_CONTAINER) msgmerge --backup=none --update --sort-output --no-location /tmp/en.po /tmp/geoportailv3_geoportal-client.pot
	docker exec $(DOCKER_CONTAINER) msgmerge --backup=none --update --sort-output --no-location /tmp/fr.po /tmp/geoportailv3_geoportal-client.pot
	docker exec $(DOCKER_CONTAINER) msgmerge --backup=none --update --sort-output --no-location /tmp/de.po /tmp/geoportailv3_geoportal-client.pot
	docker cp $(DOCKER_CONTAINER):/tmp/en.po geoportal/geoportailv3_geoportal/locale/en/LC_MESSAGES/geoportailv3_geoportal-client.po
	docker cp $(DOCKER_CONTAINER):/tmp/fr.po geoportal/geoportailv3_geoportal/locale/fr/LC_MESSAGES/geoportailv3_geoportal-client.po
	docker cp $(DOCKER_CONTAINER):/tmp/de.po geoportal/geoportailv3_geoportal/locale/de/LC_MESSAGES/geoportailv3_geoportal-client.po

# Targets related to the JS API
OUTPUT_DIR = geoportal/geoportailv3_geoportal/static/build
API_OUTPUT_DIR =  $(OUTPUT_DIR)
API_DIR = jsapi
API_TOOLS_DIR = $(API_DIR)/tools
API_SRC_JS_FILES := $(shell find jsapi -type f -name '*.js')

.PHONY: update-translations
update-translations: $(PACKAGE)/locale/$(PACKAGE)-server.pot $(PACKAGE)/locale/$(PACKAGE)-client.pot $(PACKAGE)/locale/$(PACKAGE)-tooltips.pot
	$(VENV_BIN)/tx push -s
	$(VENV_BIN)/tx pull -f

.PHONY: pull-translations
pull-translations:
	$(VENV_BIN)/tx pull -f

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

.PHONY: run
run: build
	docker-compose up

.PHONY: dev
dev: build
	docker-compose -f docker-compose.yaml -f docker-compose-dev.yaml up

.PHONY: attach
attach:
	docker-compose exec geoportal bash
