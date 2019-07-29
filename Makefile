
DOCKER_BASE ?= camptocamp/geoportailv3
DOCKER_TAG ?= latest
GIT_HASH ?= $(shell git rev-parse HEAD)
PACKAGE ?= geoportailv3


UTILITY_HELP = -e "- update-translations	Synchronize the translations with Transifex (host)" \
        "\n- pull-translations	Pull the translation (host)" \
        "\n- recreate-search-poi	Recreate the ElasticSearch POI Index (docker)" \
        "\n- recreate-search-layers	Recreate the ElasticSearch Layers Index (docker)" \
        "\n- update-search-layers	Update the ElasticSearch Layers Index (docker)" \
        "\n- update-pots	Update client, server and tooltips pots (docker, to be run from internal network)"

SERVER_LOCALISATION_SOURCES_FILES = \
  geoportal/$(PACKAGE)_geoportal/models.py \
  $(shell find geoportal/$(PACKAGE)_geoportal/templates -type f -name '*.html') \
  $(shell find geoportal/$(PACKAGE)_geoportal/views -type f -name '*.py') \
  geoportal/$(PACKAGE)_geoportal/views/pag.py \
  geoportal/$(PACKAGE)_geoportal/views/luxprintproxy.py

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
	@echo  "- build		Build the project"
	@echo  "- run		  Run the project"
	@echo
	@echo "Utility targets:"
	@echo
	@echo $(UTILITY_HELP)


.PHONY: build
build: docker-build-geoportal docker-build-config

.PHONY: docker-build-geoportal
docker-build-geoportal:
	docker build --tag=$(DOCKER_BASE)-geoportal:$(DOCKER_TAG) --build-arg=GIT_HASH=$(GIT_HASH) --build-arg=HTTP_PROXY_URL=$(http_proxy) --build-arg=HTTPS_PROXY_URL=$(https_proxy) geoportal

.PHONY: docker-build-config
docker-build-config:
	cd config && docker build --tag=$(DOCKER_BASE)-config:$(DOCKER_TAG) --build-arg=HTTP_PROXY_URL=$(http_proxy) --build-arg=HTTPS_PROXY_URL=$(https_proxy) .

.PHONY: docker-build-ldap
docker-build-ldap:
	cd ldap && docker build --tag=lux-dev-ldap --build-arg=HTTP_PROXY_URL=$(http_proxy) --build-arg=HTTPS_PROXY_URL=$(https_proxy) .

DOCKER_COMPOSE_PROJECT ?= luxembourg
DOCKER_CONTAINER ?= $(DOCKER_COMPOSE_PROJECT)_geoportal_1
APP_JS_FILES = $(shell find geoportal/$(PACKAGE)_geoportal/static-ngeo/js -type f -name '*.js' 2> /dev/null)
APP_HTML_FILES += $(shell find geoportal/$(PACKAGE)_geoportal/static-ngeo/js -type f -name '*.html' 2> /dev/null)
APP_HTML_FILES += geoportal/$(PACKAGE)_geoportal/static-ngeo/js/apps/main.html.ejs
PRINT_CONFIG_FILE ?= print/print-apps/$(PACKAGE)/config.yaml.tmpl

I18N_SOURCE_FILES += \
    geoportal/development.ini \
	geoportal/print-config.yaml.tmpl \
  $(APP_HTML_FILES) \
	$(APP_JS_FILES)


.PHONY: update-pots
update-pots:
	echo "This target must be run inside Luxembourg internal network"
	# Handle client.pot
	docker cp ./config/print/print-apps/geoportailv3/config.yaml.tmpl $(DOCKER_CONTAINER):/app/geoportal/print-config.yaml.tmpl
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-client.cfg --output /tmp/client.pot $(I18N_SOURCE_FILES)
	docker cp $(DOCKER_CONTAINER):/tmp/client.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-client.pot
	# Handle server.pot
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-server.cfg --output /tmp/server.pot $(SERVER_LOCALISATION_SOURCES_FILES)
	docker cp $(DOCKER_CONTAINER):/tmp/server.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-server.pot
	# Handle tooltips.pot
	docker exec $(DOCKER_CONTAINER) tooltips2pot
	docker exec $(DOCKER_CONTAINER) msguniq /tmp/tooltips.pot -o /tmp/tooltips.pot
	docker cp $(DOCKER_CONTAINER):/tmp/tooltips.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-tooltips.pot

# Targets related to the JS API
OUTPUT_DIR = geoportal/geoportailv3_geoportal/static/build
API_OUTPUT_DIR =  $(OUTPUT_DIR)
API_DIR = jsapi
API_TOOLS_DIR = $(API_DIR)/tools
API_SRC_JS_FILES := $(shell find jsapi -type f -name '*.js')

.PHONY: update-translations
update-translations:
	tx push --source
	tx pull --force

.PHONY: pull-translations
pull-translations:
	tx pull --force

.PHONY: update-search-layers
update-search-layers:
	docker exec $(DOCKER_CONTAINER) layers2es --interfaces main --no-themes --no-blocks --no-folders

.PHONY: recreate-search-layers
recreate-search-layers:
	docker exec $(DOCKER_CONTAINER) layers2es --interfaces main --no-themes --no-blocks --no-folders --recreate-index

.PHONY: recreate-search-poi
recreate-search-poi:
	docker exec $(DOCKER_CONTAINER) db2es --reset --index

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
	docker-compose down; docker-compose up

.PHONY: dev
dev: build
	echo "Once the composition is up open the following URL:"
	echo "browse http://localhost:8080/dev/main.html"
	docker-compose down; docker-compose -f docker-compose.yaml -f docker-compose-dev.yaml up

.PHONY: attach
attach:
	docker-compose exec geoportal bash

.PHONY: fix-db
fix-db:
	docker-compose exec geoportal finalize23DataAdaptations

.PHONY: reload
reload:
	docker-compose exec geoportal pkill --signal HUP gunicorn
