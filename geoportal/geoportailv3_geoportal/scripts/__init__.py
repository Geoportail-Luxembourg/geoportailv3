from pyramid.paster import get_app
from logging.config import fileConfig
import os


def escape_variables(environ):
    """
    Escape environment variables so that they can be interpreted correctly by python configparser.
    """
    return {key: environ[key].replace('%', '%%') for key in environ}


def lux_get_app(app_config, app_name):
    environ = escape_variables(os.environ)
    return get_app(app_config, app_name, options=environ)


def get_session(app_config, app_name):
    environ = escape_variables(os.environ)
    fileConfig(app_config, defaults=environ)
    lux_get_app(app_config, app_name)

    # must be done afterwe have loaded the project config
    from c2cgeoportal_commons.models import DBSession
    return DBSession()
