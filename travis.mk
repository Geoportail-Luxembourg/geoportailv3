INSTANCE_ID = travis

include geoportailv3.mk

$(PACKAGE)/locale/$(PACKAGE)-db.pot:
	mkdir -p $(dir $@)
	touch $@

update-translations:
	@echo desabled
