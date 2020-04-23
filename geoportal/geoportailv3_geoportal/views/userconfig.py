from pyramid.response import Response
from pyramid.view import view_config
from c2cgeoportal_commons.models import DBSession
from geoportailv3_geoportal.userconfig import UserConfig

import json

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
