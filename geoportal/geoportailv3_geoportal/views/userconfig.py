from pyramid.response import Response
from pyramid.view import view_config
from c2cgeoportal_commons.models import DBSession
from geoportailv3_geoportal.userconfig import UserConfig

import json
import urllib.request
import re

import logging
log = logging.getLogger(__name__)


class Config(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings
        self.db_userconfig = DBSession

    @view_config(route_name="get_userconfig", renderer='json')
    def get_userconfig(self):
        user = self.request.user
        key = self.request.params['key']
        if user is None:
            return HTTPUnauthorized()

        username = user.username
        user_config = self.db_userconfig.query(UserConfig) \
            .filter(UserConfig.user_login == username, UserConfig.key == key).all()

        output = [ { 'key': conf.key, 'value': conf.style} for conf in user_config]
        return output


    @view_config(route_name="save_userconfig")
    def save_userconfig(self):
        user = self.request.user
        if user is None:
            return HTTPUnauthorized()

        json_body = json.loads(self.request.body)
        key = json_body['key']

        self.delete_if_existing(user, key)

        userConfig = UserConfig()
        userConfig.key = key
        userConfig.style = json_body['value']
        userConfig.user_login = user.username

        self.db_userconfig.add(userConfig)

        return self.request.response


    @view_config(route_name="delete_userconfig")
    def delete_userconfig(self):
        user = self.request.user
        key = self.request.params['key']
        if user is None:
            return HTTPUnauthorized()

        self.delete_if_existing(user, key)

        return self.request.response


    def delete_if_existing(self, user, key):
        username = user.username
        existing_user_config = self.db_userconfig.query(UserConfig) \
            .filter(UserConfig.user_login == username).all()

        if len(existing_user_config) > 0:
            for config in existing_user_config:
                self.db_userconfig.query(UserConfig).filter(
                    UserConfig.id == config.id,
                    UserConfig.key == key
                ).delete()

    @view_config(route_name="apply_mvt_config", renderer='json')
    def apply_mvt_config(self):
        # Parse and make a dict from the styles config to apply
        config = json.loads(self.request.params['config'])
        paint_conf_dict = {}
        layout_conf_dict = {}
        keys = ['background', 'line', 'fill', 'fill-extrusion', 'symbol']
        for conf in json.loads(config):
            # Roadmap layer
            if 'color' in conf:
                color = conf['color']
                if 'opacity' in conf:
                    opacity = conf['opacity']
                for key in keys:
                    if 'fill-extrusion' in key:
                        prop = 'fillExtrusions'
                    else:
                        prop = key + 's'

                    if prop in conf:
                        for layer in conf[prop]:
                            paint_conf_dict.setdefault(layer, {})[key + '-color'] = color
                            if 'opacity' in conf:
                                paint_conf_dict.setdefault(layer, {})[key + '-opacity'] = int(opacity)
                            if 'visible' in conf:
                                layout_conf_dict.setdefault(layer, {})['visibility'] = 'visible' if conf['visible'] else 'none'
            # Topo layers
            else:
                for key in keys:
                    if 'fill-extrusion' in key:
                        prop = 'fillExtrusions'
                    else:
                        prop = key + 's'

                    if prop in conf:
                        for layer in conf[prop]:
                            layout_conf_dict.setdefault(layer, {})['visibility'] = 'visible' if conf['visible'] else 'none'

            for layer in conf.get('hillshades', []):
                layout_conf_dict.setdefault(layer, {})['visibility'] = 'visible' if conf['visible'] else 'none'


        # Parse and modify the default config with the styles to apply
        style_url = self.request.params['style_url']
        with urllib.request.urlopen(style_url) as file:
            default_styles = file.read().decode('utf-8')
            myjson = json.loads(default_styles)

            for layer in myjson['layers']:
                for key, value in paint_conf_dict.get(layer['id'], {}).items():
                    layer['paint'][key] = value
                for key, value in layout_conf_dict.get(layer['id'], {}).items():
                    layer.setdefault('layout', {})[key] = value

        return myjson
