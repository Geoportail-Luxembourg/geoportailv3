ifdef VARS_FILE
VARS_FILES += ${VARS_FILE} vars_geoportailv3.yaml
else
VARS_FILE = vars_geoportailv3.yaml
VARS_FILES += ${VARS_FILE}
endif

TEMPLATE_EXCLUDE += LUX_alembic/script.py.mako

LANGUAGES = en fr de lb
CGXP = FALSE
MOBILE = FALSE
NGEO = TRUE
TILECLOUD_CHAIN = FALSE

DISABLE_BUILD_RULES = test-packages test-packages-ngeo

CONFIG_VARS += ldap

include CONST_Makefile

DEV_REQUIREMENTS += git+https://github.com/transifex/transifex-client.git@fix-proxies#egg=transifex-client-proxies

.PHONY: update-translations
update-translations: $(PACKAGE)/locale/$(PACKAGE)-server.pot $(PACKAGE)/locale/$(PACKAGE)-client.pot
	.build/venv/bin/tx push -s
	.build/venv/bin/tx pull -l en
	.build/venv/bin/tx pull -l fr
	.build/venv/bin/tx pull -l de
	.build/venv/bin/tx pull -l lb
