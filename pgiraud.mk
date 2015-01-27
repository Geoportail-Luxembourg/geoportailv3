INSTANCE_ID = pgiraud
VARS_FILE = vars_${INSTANCE_ID}.yaml

include geoportailv3.mk

.PHONY: dbtunnel
dbtunnel:
	@echo "Opening tunnel…"
	ssh -N -L 9999:localhost:5432 luxembourg-geomapfish.infra.internal

.PHONY: watchless
watchless:
	@echo "Watching changes to less files…"
	watchmedo shell-command --patterns="*.less" --recursive --command="make -f pgiraud.mk geoportailv3/static/build/build.css"
