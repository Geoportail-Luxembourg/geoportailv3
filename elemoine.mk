INSTANCE_ID = elemoine
VARS_FILE = vars_${INSTANCE_ID}.yaml

DISABLE_BUILD_RULES = apache

PRINT_OUTPUT = tomcat
TOMCAT_STOP_COMMAND =
TOMCAT_START_COMMAND =

include geoportailv3.mk

.PHONY: dbtunnel
dbtunnel:
	@echo "Opening tunnel…"
	ssh -N -L 9999:localhost:5432 luxembourg-geomapfish.infra.internal

.PHONY: watchless
watchless:
	@echo "Watching changes to less files…"
	nosier -p geoportailv3/static/less "make -f elemoine.mk geoportailv3/static/build/build.css"

.PHONY: tomcat
tomcat:
	@echo "Running Tomcat…"
	docker run --rm -it -p 8080:8080 -e Xmx=2048m -v /home/elemoine/src/geoportailv3/tomcat:/deployment maluuba/tomcat7
