# Language provided by the application
LANGUAGES ?= en fr de lb
NGEO_INTERFACES ?= main
NGEO_API ?= TRUE
CI ?= TRUE

MO_FILES = $(foreach I18_TYPE, client server tooltips legends, $(addprefix geoportailv3_geoportal/locale/,$(addsuffix /LC_MESSAGES/geoportailv3_geoportal-$(I18_TYPE).mo, $(LANGUAGES))))

include CONST_Makefile
