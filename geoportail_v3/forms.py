# -*- coding: utf-8 -*-
import logging
import os

from pyramid.i18n import TranslationStringFactory
from formalchemy import fields
from formalchemy import FieldSet, Grid

from geoportail_v3 import models
from c2cgeoportal.forms import *

_ = TranslationStringFactory('geoportail_v3')
log = logging.getLogger(__name__)
