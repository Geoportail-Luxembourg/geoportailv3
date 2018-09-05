# -*- coding: utf-8 -*-

import logging

from pyramid.i18n import TranslationStringFactory

from c2cgeoportal.models import *  # noqa

_ = TranslationStringFactory("geoportailv3-server")
log = logging.getLogger(__name__)
