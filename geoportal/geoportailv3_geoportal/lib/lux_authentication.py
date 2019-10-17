from pyramid.authentication import CallbackAuthenticationPolicy, AuthTktCookieHelper, \
    BasicAuthAuthenticationPolicy, AuthTktAuthenticationPolicy

from pyramid_multiauth import MultiAuthenticationPolicy
from pyramid.interfaces import IAuthenticationPolicy

from c2cgeoportal_geoportal.resources import defaultgroupsfinder
from zope.interface import implementer
import time
import math

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
    cookie_authentication_policy = AppAwareAuthTktAuthenticationPolicy(
        settings["authtkt_secret"],
        callback=defaultgroupsfinder,
        cookie_name=settings["authtkt_cookie_name"],
        timeout=timeout, max_age=timeout, reissue_time=reissue_time,
        hashalg="sha512", http_only=http_only, secure=secure,
        parent_domain=True
    )
    basic_authentication_policy = BasicAuthAuthenticationPolicy(c2cgeoportal_check)
    policies = [cookie_authentication_policy, basic_authentication_policy]
    return MultiAuthenticationPolicy(policies)


def c2cgeoportal_check(username, password, request):  # pragma: no cover
    if request.registry.validate_user(request, username, password):
        return defaultgroupsfinder(username, request)
    return None


@implementer(IAuthenticationPolicy)
class AppAwareAuthTktAuthenticationPolicy(AuthTktAuthenticationPolicy):
    def remember(self, request, userid, **kw):
        """ Accepts the following kw args: ``max_age=<int-seconds>,
        ``tokens=<sequence-of-ascii-strings>``.

        Return a list of headers which will set appropriate cookies on
        the response.

        """
        is_app = request.params.get('app', 'false').lower() == 'true'
        if is_app:
            # Force any cookie to be set with a big expiration time
            # when login is done from the Android or iOS apps
            kw['max_age'] = math.ceil(time.time() + (10 * 365 * 24 * 60 * 60))

        return super().remember(request, userid, **kw)
