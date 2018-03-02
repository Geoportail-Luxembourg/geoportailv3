# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid_ldap import get_ldap_connector
from pyramid.security import unauthenticated_userid
from geoportailv3.portail import Connections
from geoportailv3.portail import PortailSession
import ldap
import logging

log = logging.getLogger(__name__)

"""
Validates the user against the ldap server
"""


def ldap_user_validator(request, username, password):
    connector = get_ldap_connector(request)
    data = connector.authenticate(username, password)
    connection = Connections()
    connection.login = username
    connection.application = request.host

    if data is not None:
        connection.action = "CONNECT"
        PortailSession.add(connection)
        PortailSession.commit()
        return data[0]
    else:
        connection.action = "CONNECT ERROR"
        PortailSession.add(connection)
        PortailSession.commit()

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
        user.email = None
        user.is_admin = False
        user.mymaps_role = 999
        user.ogc_role = -1
        user.sn = None

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
                else:
                    user.sn = user.mail
                if 'isMymapsAdmin' in result[0][1]:
                    user.is_admin =\
                        "TRUE" == (result[0][1]['isMymapsAdmin'][0]).upper()
                if 'roleMymaps' in result[0][1]:
                    user.mymaps_role = int(result[0][1]['roleMymaps'][0])
                if 'roleOGC' in result[0][1]:
                    user.ogc_role = result[0][1]['roleOGC'][0]
        try:
            user.role = DBSession.query(Role).filter_by(id=roletheme).one()
        except Exception as e:
            user.role = DBSession.query(Role).filter_by(id=0).one()
            log.exception(e)

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
                    "mymaps_role": getattr(
                        self.request.user,
                        'mymaps_role', self.request.user.role.id),
                    "mail": getattr(
                        self.request.user, 'mail',
                        self.request.user.email),
                    "sn": getattr(
                        self.request.user, 'sn',
                        self.request.user.username),
                    "is_admin": getattr(self.request.user, 'is_admin', False)}
        return {}
