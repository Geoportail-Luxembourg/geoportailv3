# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid_ldap3 import get_ldap_connector
from pyramid.security import unauthenticated_userid, remember
from geoportailv3_geoportal.portail import Connections
from c2cgeoportal_commons.models import DBSession
import ldap3 as ldap
from ldap3.core.exceptions import LDAPResponseTimeoutError
import logging
from pyramid.httpexceptions import HTTPFound, HTTPUnauthorized, HTTPBadRequest
from sqlalchemy import func
import time

log = logging.getLogger(__name__)

"""
Validates the user against the ldap server
"""


def ldap_user_validator(request, username, password):
    connector = get_ldap_connector(request)
    cm = connector.manager
    data = None
    with cm.connection() as conn:
        try:
            ldap_settings = request.registry.settings['ldap']
            base_dn = ldap_settings['base_dn']
            filter_tmpl = ldap_settings['filter_tmpl'].replace('%(login)s', username)
            message_id = conn.search(
                base_dn, filter_tmpl, ldap.SUBTREE,
                ldap.DEREF_ALWAYS)
            result = conn.get_response(message_id)[0]
            if len(result) > 0:
                data = result[0]['dn']
            conn.unbind()
        except Exception as e:
            log.exception(e)
            conn.unbind()
    conn = None
    try:
        conn = cm.connection(data, password)
        conn.unbind()
    except Exception as e:
        log.exception(e)
        if conn is not None:
            conn.unbind()
        data = None

    connection = Connections()
    connection.login = username
    connection.application = request.host

    if data is not None:
        connection.action = "CONNECT"
        DBSession.add(connection)
        return username
    else:
        connection.action = "CONNECT ERROR"
        DBSession.add(connection)

    return None


"""
Get the user information not from c2cgeoportal user table
but from ldap
"""


def get_user_from_request(request):
    username = unauthenticated_userid(request)
    if username is not None:
        return get_user(request, username)

def get_compte_pere(username):
    return DBSession.query(func.lower(func.geov3.getMainAccount(username))).one()[0]

def get_user(request, username):
    from c2cgeoportal_commons.models import DBSession
    from c2cgeoportal_commons.models.main import Role

    class O(object):
        pass
    default_mymaps_role = int(request.registry.settings['default_mymaps_role'])
    user = O()
    user.id = 0
    user.username = username
    user.email = None
    user.is_mymaps_admin = False
    user.mymaps_role = default_mymaps_role
    user.ogc_role = -1
    user.sn = None
    user.is_password_changed = None
    user.role_name = None
    user.typeUtilisateur = "prive"
    connector = get_ldap_connector(request)
    cm = connector.manager

    # 0 means 'Tous publics'
    roletheme = 0
    MAX_RETRIES = 3
    RETRY_DELAY = 5  # seconds
    for attempt in range(MAX_RETRIES):
        try:
            with cm.connection() as conn:
                ldap_settings = request.registry.settings['ldap']
                base_dn = ldap_settings['base_dn']
                filter_tmpl = ldap_settings['filter_tmpl'].replace('%(login)s', username)
                message_id = conn.search(
                    base_dn, filter_tmpl, ldap.SUBTREE,
                    ldap.DEREF_ALWAYS, ldap.ALL_ATTRIBUTES)
                result = conn.get_response(message_id)[0]

                if len(result) == 1:
                    obj = result[0]['raw_attributes']
                    if 'roleTheme' in obj:
                        # This is the plain c2cgeoportal role used for authentication.
                        # Notably in the admin interface.
                        # The role with name role_admin has id 645.
                        roletheme = obj['roleTheme'][0].decode()
                    if 'mail' in obj:
                        user.mail = obj['mail'][0].decode()
                    if 'sn' in obj:
                        user.sn = obj['sn'][0].decode()
                    else:
                        user.sn = user.mail
                    if 'isMymapsAdmin' in obj:
                        user.is_mymaps_admin = "TRUE" == obj['isMymapsAdmin'][0].upper().decode()
                    if 'roleMymaps' in obj:
                        # This role is used for myMaps.
                        user.mymaps_role = int(obj['roleMymaps'][0])
                    if 'roleOGC' in obj:
                        # This role is used by the print proxy and internal WMS proxy.
                        user.ogc_role = int(obj['roleOGC'][0])
                    if 'typeUtilisateur' in obj:
                        user.typeUtilisateur = obj['typeUtilisateur'][0].lower().decode()

                    login_pere = get_compte_pere(username)
                    # If an ascendant user exist, use his user type
                    if login_pere != username:
                        user_pere = get_user(request, login_pere)
                        if 'typeUtilisateur' in obj:
                            user.typeUtilisateur = user_pere.typeUtilisateur
                conn.unbind()
                break  # Exit the loop if successful
        except LDAPResponseTimeoutError as e:
            log.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                log.error("Max retries reached. LDAP server is not responding.")
                return None
    try:
        # Loading the plain c2cgeoportal role used for authentication.
        user.roles = DBSession.query(Role).filter_by(id=roletheme).all()
    except Exception as e:
        log.exception(e)
    if len(user.roles) == 0:
        # Fallback to the "Tous publics" role
        user.roles = DBSession.query(Role).filter_by(id=0).all()
    # todo: check if this is sufficiently precise or if a request in static."User" is needed ?
    user.settings_role = user.roles[0]

    user.functionalities = []
    return user

class Authentication(object):
    def __init__(self, request):
        self.request = request

    @view_config(route_name='getuserinfo', renderer='json')
    def get_user_info(self):
        if self.request.user is not None:
            return {"login": self.request.user.username,
                    "role": self.request.user.settings_role.name,
                    "role_id": self.request.user.settings_role.id,
                    "mymaps_role": getattr(
                        self.request.user,
                        'mymaps_role', self.request.user.settings_role.id),
                    "mail": getattr(
                        self.request.user, 'mail',
                        self.request.user.email),
                    "sn": getattr(
                        self.request.user, 'sn',
                        self.request.user.username),
                    "typeUtilisateur":  getattr(
                        self.request.user, 'typeUtilisateur',
                        self.request.user.typeUtilisateur),
                    "is_admin": getattr(self.request.user, 'is_mymaps_admin', False)}
        return {}

    @view_config(route_name="login", renderer='json')
    def login(self):
        login = self.request.POST.get("login")
        password = self.request.POST.get("password")
        if login is None or password is None:  # pragma nocover
            raise HTTPBadRequest("'login' and 'password' should be available in request params.")
        username = self.request.registry.validate_user(self.request, login, password)
        if username is None:
            raise HTTPUnauthorized("See server logs for details")
        came_from = self.request.params.get("came_from")
        if came_from:
            return HTTPFound(location=came_from, headers=remember(self.request, username))
        self.request.response.headers = remember(self.request, username)
        self.request.user = get_user(self.request, username)
        origin = self.request.headers.get('Origin')
        if origin:
            self.request.response.headers['Access-Control-Allow-Origin'] = origin
            self.request.response.headers['Access-Control-Allow-Credentials'] = 'true'
        return self.get_user_info()
