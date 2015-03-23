INSTANCE_ID = elemoine
VARS_FILE = vars_${INSTANCE_ID}.yaml
PRINT_OUTPUT = /tmp
DISABLE_BUILD_RULES = apache

include geoportailv3.mk

.PHONY: dbtunnel
dbtunnel:
	@echo "Opening tunnel…"
	ssh -N -L 9999:localhost:5432 luxembourg-geomapfish.infra.internal

.PHONY: watchless
watchless:
	@echo "Watching changes to less files…"
	nosier -p geoportailv3/static/less "make -f elemoine.mk geoportailv3/static/build/build.css"
