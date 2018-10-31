include Makefile

DOCKER_WEB_PROTOCOL = http


# Override aim: add alembic LUX upgrade.
.PHONY: upgrade-db
upgrade-db: geoportal/alembic.ini geoportal/alembic.yaml
	alembic --config=$< --name=main upgrade head
	alembic --config=$< --name=static upgrade head
	alembic --config=$< --name=lux upgrade head
	finalize23DataAdaptations
