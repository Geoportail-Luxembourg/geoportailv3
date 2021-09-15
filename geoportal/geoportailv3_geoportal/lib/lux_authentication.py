from pyramid.authentication import BasicAuthAuthenticationPolicy, AuthTktAuthenticationPolicy

from pyramid_multiauth import MultiAuthenticationPolicy
from pyramid.interfaces import IAuthenticationPolicy

from c2cgeoportal_geoportal.resources import defaultgroupsfinder
from zope.interface import implementer

import logging

LOG = logging.getLogger(__name__)

def create_authentication(settings):
    timeout = settings.get("authtkt_timeout")
    timeout = None if timeout is None else int(timeout)
    reissue_time = settings.get("reissue_time")
    reissue_time = None if reissue_time is None else int(reissue_time)
    http_only = settings.get("authtkt_http_only", "True")
    http_only = http_only.lower() in ("true", "yes", "1")
    secure = settings.get("authtkt_secure", "True")
    secure = secure.lower() in ("true", "yes", "1")

    # AuthenticationPolicy for login via the mobile app ('app=true' in the request params)
    app_authentication_policy = ConditionalAuthTktAuthenticationPolicy(
        settings["authtkt_secret"],
        callback=defaultgroupsfinder,
        cookie_name=settings["authtkt_cookie_name"] + "_app",
        timeout=None, max_age=None, reissue_time=None,
        hashalg="sha512", http_only=http_only, secure=secure,
        parent_domain=True,
        condition=lambda params: params.get('app', 'false').lower() == 'true'
    )

    # AuthenticationPolicy for login not via the mobile app ('app=false' in the request params)
    non_app_authentication_policy = ConditionalAuthTktAuthenticationPolicy(
        settings["authtkt_secret"],
        callback=defaultgroupsfinder,
        cookie_name=settings["authtkt_cookie_name"],
        timeout=timeout, max_age=timeout, reissue_time=reissue_time,
        hashalg="sha512", http_only=http_only, secure=secure,
        parent_domain=True,
        condition=lambda params: params.get('app', 'false').lower() == 'false'
    )
    basic_authentication_policy = BasicAuthAuthenticationPolicy(c2cgeoportal_check)
    policies = [app_authentication_policy, non_app_authentication_policy, basic_authentication_policy]
    return MultiAuthenticationPolicy(policies)


def c2cgeoportal_check(username, password, request):  # pragma: no cover
    if request.registry.validate_user(request, username, password):
        return defaultgroupsfinder(username, request)
    return None


@implementer(IAuthenticationPolicy)
class ConditionalAuthTktAuthenticationPolicy(AuthTktAuthenticationPolicy):
    def __init__(self, *args, **kwargs):
        self.condition = kwargs['condition']
        del kwargs['condition']
        super().__init__(*args, **kwargs)

    def remember(self, request, userid, **kw):
        if self.condition(request.params):
            return super().remember(request, userid, **kw)
        else:
            return []
