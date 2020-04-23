
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
build: docker-build-geoportal docker-build-config docker-build-ldap

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

OUTPUT_DIR = geoportal/geoportailv3_geoportal/static/build

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
	echo 'Removing internal layers and fixing old db'
	psql -p 5433 -U www-data -h 127.0.0.1 lux -c 'delete from geov3.lux_layer_internal_wms'
	docker-compose exec geoportal finalize23DataAdaptations

.PHONY: reload
reload:
	docker-compose exec geoportal pkill --signal HUP gunicorn

.PHONY: rebuild-js-api
rebuild-js-api:
	docker-compose exec geoportal /app/apiv3/jsapi/rebuild_api.sh
