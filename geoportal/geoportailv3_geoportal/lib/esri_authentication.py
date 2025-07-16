from typing import Optional, Dict
import json
from datetime import datetime, timedelta
import requests
import urllib
from collections import namedtuple


class ESRITokenException(Exception):
    pass


class ESRIServerException(Exception):
    pass


ResultTuple = namedtuple('ResultTuple', ['data', 'content_type'])


def read_request_with_token(url_request, parent_request, log, timeout=15, renew_token=True):
    result = urllib.request.urlopen(url_request, None, timeout)
    data = result.read()
    try:
        resp = json.loads(data)
    except Exception as e:
        resp = {}
        # log.info(f"Response is no valid json, {type(e)}: {str(e)}")
    error = resp.get("error")
    if error is None:
        return ResultTuple(data, result.info()['Content-Type'])
    elif error.get("code") not in (498, 499):
        # not a token error
        raise ESRIServerException(f'Original server error: {resp}')
    else:
        log.warning(f"Token refused in ESRI lib by: {urllib.parse.splitquery(url_request.full_url)[0]} - "
                  f"server answered {resp['error']}")
        if not renew_token:
            raise ESRITokenException(f'Original server error: {resp}')
        else:
            log.info("Try to get new token")
            auth_token = get_arcgis_token(parent_request, log, force_renew=True, service_url=url_request.full_url)
            if 'token' in auth_token:
                (scheme, netloc, path, query, fragment) = urllib.parse.urlsplit(url_request.full_url)
                query_params = dict(urllib.parse.parse_qsl(query))
                query_params["token"] = auth_token['token']
                url_tuple = (scheme, netloc, path, urllib.parse.urlencode(query_params), fragment)
                url = urllib.parse.urlunsplit(url_tuple)
                url_request.full_url = url

                # Try to re-read with new token
                result = urllib.request.urlopen(url_request, None, timeout)
                data = result.read()

            try:
                resp = json.loads(data)
            except Exception as e:
                resp = {}
                log.info(f"Response is no valid json, {type(e)}: {str(e)}")
            if 'error' in resp:
                raise ESRITokenException(f'Original server error: {resp}')
            return ResultTuple(data, result.info()['Content-Type'])

def get_arcgis_token(request, log, force_renew=False, token_check_url: Optional[str] = None, service_url: Optional[str] = None) -> Dict:
    session = request.session
    config = request.registry.settings
    auth_token = {}
    if force_renew:
        log.info('force renew token')
        auth_token = _renew_arcgis_token(session, config, log, service_url=service_url)
    elif 'auth_token' not in session:
        log.info('could not find token in session - request new token')
        auth_token = _renew_arcgis_token(session, config, log, service_url=service_url)
    else:
        auth_token = session['auth_token']
        token_expire = datetime.fromtimestamp(float(auth_token['expires'])/1000)
        # check if token is expired in the next 30s.
        is_expired = token_expire < (datetime.now() + timedelta(seconds=30))
        if is_expired:
            log.info('token expired - request new token')
            auth_token = _renew_arcgis_token(session, config, log, service_url=service_url)
        else:
            log.info('token still valid')
            # the parameter token_check_url allows to check the token directly on the
            # destination url, by default the check is performed on the token issuing url
            # TODO: disable systematic token check below in prod, enable only in dev
            if False:
                token_check_data = urllib.parse.urlencode({'f': 'json', 'token': auth_token['token']}).encode()
                if token_check_url is None:
                    token_check_request = urllib.request.Request(config['arcgis_token_url'], data=token_check_data)
                else:
                    token_check_request = urllib.request.Request(token_check_url, data=token_check_data)
                try:
                    log.info(f"Check token at: {token_check_request.full_url}")
                    rep = urllib.request.urlopen(token_check_request, timeout=15)
                    check = json.load(rep)
                    if 'error' in check:
                        log.error(f"Token refused by: {token_check_request.full_url} - "
                                  f"server answered {check['error']}")
                    else:
                        log.info(f"Token OK, answer: {check}")
                except:
                    log.error(f"Failed token check at: {token_check_request.full_url}")
                assert 'error' not in check

    return auth_token


def _renew_arcgis_token(session, config, log, service_url=None):
    token_data = {
        'f': 'json',
        'username': config["arcgis_token_username"],
        'password': config["arcgis_token_password"],
        'referer': config.get('arcgis_token_referer', 'x'),
        'expiration': config.get('arcgis_token_validity', 600)
    }
    #/portal/sharing/rest/generateToken
    # The token url is no more read from config.
    # As we could have more than one token url, we decided to use the request url to find out the token url
    if service_url is None:
        generate_token_url = urllib.parse.urljoin(f"{config['arcgis_token_url']}/", "generateToken")
    else:
        parsed_url = urllib.parse.urlparse(service_url)
        # Reconstruction du protocole et du host
        generate_token_url = f"{parsed_url.scheme}://{parsed_url.netloc}/portal/sharing/rest/generateToken"
    response = requests.post(generate_token_url, data=token_data, timeout=15)
    response.raise_for_status()
    auth_token = response.json()
    if 'error' in auth_token:
        log.error(f"Failed getting token from: {generate_token_url} - "
                  f"server answered {auth_token['error']}")
        auth_token = {}
        session.pop('auth_token', None)
    else:
        log.info("Success: token valid until "
                 f"{datetime.fromtimestamp(float(auth_token.get('expires', 0)) / 1000)}")
        session['auth_token'] = auth_token
    return auth_token
