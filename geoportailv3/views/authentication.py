# -*- coding: utf-8 -*-


def ldap_user_validator(request, username, password):
    from pyramid_ldap import get_ldap_connector
    connector = get_ldap_connector(request)
    data = connector.authenticate(username, password)
    if data is not None:
        return data[0]
    return None
