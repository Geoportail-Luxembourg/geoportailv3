ifdef VARS_FILE
VARS_FILES += ${VARS_FILE} vars_geoportailv3.yaml
else
VARS_FILE = vars_geoportailv3.yaml
VARS_FILES += ${VARS_FILE}
endif

TEMPLATE_EXCLUDE += LUX_alembic/script.py.mako

include CONST_Makefile
