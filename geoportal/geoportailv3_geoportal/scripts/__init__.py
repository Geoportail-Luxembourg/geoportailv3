from pyramid.paster import get_app
from logging.config import fileConfig
import os


def get_session(app_config, app_name):
    fileConfig(app_config, defaults=os.environ)
    get_app(app_config, app_name, options=os.environ)

    # must be done afterwe have loaded the project config
    from c2cgeoportal_commons.models import DBSession
    return DBSession()
