
DOCKER_BASE ?= camptocamp/geoportailv3
DOCKER_TAG ?= latest
GIT_HASH ?= $(shell git rev-parse HEAD)
PACKAGE ?= geoportailv3

UTILITY_HELP = -e "- update-translations	Synchronize the translations with Transifex (host)" \
        "\n- pull-translations	Pull the translation (host)" \
        "\n- recreate-search-poi	Recreate the ElasticSearch POI Index (docker)" \
        "\n- recreate-search-layers	Recreate the ElasticSearch Layers Index (docker)" \
        "\n- update-search-layers	Update the ElasticSearch Layers Index (docker)" \
        "\n- update-pots	Update client, server, tooltips and legends pots (docker, to be run from internal network)"

SERVER_LOCALISATION_SOURCES_FILES = \
  geoportal/$(PACKAGE)_geoportal/models.py \
  $(shell find geoportal/$(PACKAGE)_geoportal/templates -type f -name '*.html') \
  $(shell find geoportal/$(PACKAGE)_geoportal/views -type f -name '*.py') \
  geoportal/$(PACKAGE)_geoportal/views/pag.py \
  geoportal/$(PACKAGE)_geoportal/views/luxprintproxy.py

TOOLTIPS_LOCALISATION_FILES = $(addprefix $(PACKAGE)/locale/, $(addsuffix /LC_MESSAGES/$(PACKAGE)-tooltips.mo, $(LANGUAGES)))

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
build: docker-build-ldap
	./build

.PHONY: build-geoportal
build-geoportal:
	./build --geoportal

.PHONY: build-config
build-config:
	./build --config

.PHONY: build-dev
build-dev:
	./build --dev

.PHONY: docker-build-print
docker-build-print:
	cd print && docker build --tag=$(DOCKER_BASE)-print:$(DOCKER_TAG) .

.PHONY: docker-build-ldap
docker-build-ldap:
	cd ldap && docker build --tag=lux-dev-ldap --build-arg=HTTP_PROXY_URL=$(http_proxy) --build-arg=HTTPS_PROXY_URL=$(https_proxy) .

DOCKER_COMPOSE_PROJECT ?= geoportailv3
DOCKER_CONTAINER ?= $(DOCKER_COMPOSE_PROJECT)_geoportal_1
DOCKER_WEBPACK_DEV_CONTAINER ?= $(DOCKER_COMPOSE_PROJECT)_webpack_dev_server_1
APP_JS_FILES = $(shell find $(PACKAGE)_geoportal/static-ngeo/js -type f -name '*.js' 2> /dev/null)
APP_HTML_FILES += $(shell find $(PACKAGE)_geoportal/static-ngeo/js -type f -name '*.html' 2> /dev/null)
APP_HTML_FILES += $(shell find $(PACKAGE)_geoportal/static-ngeo/ngeo/src/misc -type f -name '*.html' 2> /dev/null)
APP_HTML_FILES += $(PACKAGE)_geoportal/static-ngeo/js/apps/main.html.ejs
PRINT_CONFIG_FILE ?= print/print-apps/$(PACKAGE)/config.yaml.tmpl

I18N_SOURCE_FILES += \
    pot-create.ini \
  $(APP_HTML_FILES) \
	$(APP_JS_FILES)


.PHONY: update-pots
update-pots: update-pots-client update-pots-server update-pots-legends update-pots-tooltips
	echo "This target must be run inside Luxembourg internal network"

.PHONY: update-pots-client
update-pots-client:
	# Handle client.pot
	#docker cp ./config/print/print-apps/geoportailv3/config.yaml.tmpl $(DOCKER_CONTAINER):/app/geoportal/print-config.yaml.tmpl
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-client.cfg --output /tmp/client.pot $(I18N_SOURCE_FILES)
	docker cp $(DOCKER_CONTAINER):/tmp/client.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-client.pot

.PHONY: update-pots-server
update-pots-server:
	# Handle server.pot
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-server.cfg --output /tmp/server.pot $(SERVER_LOCALISATION_SOURCES_FILES)
	docker cp $(DOCKER_CONTAINER):/tmp/server.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-server.pot

.PHONY: update-pots-legends
update-pots-legends:
	# Handle legends.pot
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-legends.cfg --output /tmp/legends.pot geoportal/pot-create.ini
	docker cp $(DOCKER_CONTAINER):/tmp/legends.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-legends.pot

.PHONY: update-pots-tooltips
update-pots-tooltips:
	# Handle tooltips.pot
	docker exec $(DOCKER_CONTAINER) pot-create --config lingua-tooltips.cfg --output /tmp/tooltips.pot geoportal/pot-create.ini
	docker cp $(DOCKER_CONTAINER):/tmp/tooltips.pot geoportal/geoportailv3_geoportal/locale/geoportailv3_geoportal-tooltips.pot

.PHONY: update-web-component-translations
update-web-component-translations:
	# Parse web component templates and extract i18next strings to translation files
	# make sure $(DOCKER_WEBPACK_DEV_CONTAINER) (from docker-compose.override) is running for npm dependencies
	docker exec $(DOCKER_WEBPACK_DEV_CONTAINER) bash -c "npm run i18next-parse --prefix geoportailv3_geoportal/static-ngeo/ngeo;"

.PHONY: load-web-component-translations
load-web-component-translations:
	# Copy updated translation files to app during dev (translations are also copied during build process)
	docker cp geoportal/geoportailv3_geoportal/static-ngeo/ngeo/locales $(DOCKER_CONTAINER):/etc/static-ngeo/

OUTPUT_DIR = geoportal/geoportailv3_geoportal/static/build

.PHONY: update-translations
update-translations:
	tx push --source
	tx pull --force
	tx pull -s --force

.PHONY: pull-translations
pull-translations:
	tx pull --force
	tx pull -s --force

.PHONY: update-search-layers
update-search-layers:
	docker exec $(DOCKER_CONTAINER) layers2es --interfaces main --no-themes --no-blocks --no-folders

.PHONY: recreate-search-layers
recreate-search-layers:
	docker exec $(DOCKER_CONTAINER) layers2es --interfaces main --no-themes --no-blocks --no-folders --recreate-index

.PHONY: recreate-search-poi
recreate-search-poi:
	docker exec $(DOCKER_CONTAINER) db2es --reset --index

.PHONY: run
run: build
	docker-compose down; docker-compose up

.PHONY: dev
dev: build-config build-dev
	echo "Once the composition is up open the following URL:"
	echo "browse http://localhost:8080/dev/main.html"
	docker-compose down; docker-compose up

.PHONY: attach
attach:
	docker-compose exec geoportal bash

.PHONY: fix-db
fix-db:
	echo 'Removing internal layers and fixing old db'
	psql -p 5433 -U www-data -h 127.0.0.1 lux -c 'delete from geov3.lux_layer_internal_wms'
	docker-compose exec geoportal finalize23DataAdaptations

.PHONY: reload
reload:
	docker-compose exec geoportal pkill --signal HUP gunicorn

.PHONY: rebuild-js-api
rebuild-js-api:
	docker exec -w /app/jsapi/ geoportailv3_geoportal_1 /app/jsapi/rebuild_api.sh
