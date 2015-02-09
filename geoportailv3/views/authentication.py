# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid_ldap import get_ldap_connector
from pyramid.security import unauthenticated_userid
import ldap

"""
Validates the user against the ldap server
"""


def ldap_user_validator(request, username, password):
    connector = get_ldap_connector(request)
    data = connector.authenticate(username, password)
    if data is not None:
        return data[0]

    return None

"""
Get the user information not from c2cgeoportal user table
but from ldap
"""


def get_user_from_request(request):
    from c2cgeoportal.models import DBSession, Role
    class O(object):
        pass
    username = unauthenticated_userid(request)
    if username is not None:
        user = O()
        user.id = 0
        user.username = username
        connector = get_ldap_connector(request)
        cm = connector.manager

        # 0 means 'Tous publics'
        roletheme = 0
        with cm.connection() as conn:
            result = conn.search_s('ou=portail,dc=act,dc=lu',
                                   ldap.SCOPE_SUBTREE, '(login=%s)' % username)
            if len(result) == 1:
                if 'roleTheme' in result[0][1]:
                    roletheme = result[0][1]['roleTheme'][0]
                if 'mail' in result[0][1]:
                    user.mail = result[0][1]['mail'][0]
                if 'sn' in result[0][1]:
                    user.sn = result[0][1]['sn'][0]

        user.role = DBSession.query(Role).filter_by(id=roletheme).one()

        user.functionalities = []
        return user


class Authentication(object):
    def __init__(self, request):
        self.request = request

    @view_config(route_name='getuserinfo', renderer='json')
    def get_user_info(self):
        if self.request.user is not None:
            return {"login": self.request.user.username,
                    "role": self.request.user.role.name,
                    "role_id": self.request.user.role.id,
                    "mail": self.request.user.mail,
                    "sn": self.request.user.sn}
        return {}
