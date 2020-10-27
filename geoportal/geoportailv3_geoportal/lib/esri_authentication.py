from typing import Dict
import json
from datetime import datetime, timedelta
import requests
import urllib


def get_arcgis_token(rest_url: str, request, log, force_renew=False) -> Dict:
    session = request.session
    config = request.registry.settings
    auth_token = {}
    if force_renew:
        log.info('force renew token')
        auth_token = _renew_arcgis_token(rest_url, session, config, log)
    elif 'auth_token' not in session:
        log.info('could not find token in session - request new token')
        auth_token = _renew_arcgis_token(rest_url, session, config, log)
    else:
        auth_token = session['auth_token']
        token_expire = datetime.fromtimestamp(float(auth_token['expires'])/1000)
        # check if token is expired in the next 30s.
        is_expired = token_expire < (datetime.now() + timedelta(seconds=30))
        if is_expired:
            log.info('token expired - request new token')
            auth_token = _renew_arcgis_token(rest_url, session, config, log)
        else:
            log.info('token still valid')
            # TODO: disable systematic token check below in prod, enable only in dev
            token_check_data = urllib.parse.urlencode({'f': 'json', 'token': auth_token['token']}).encode()
            token_check_request = urllib.request.Request(rest_url, data=token_check_data)
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


def _renew_arcgis_token(rest_url: str, session, config, log):
    token_data = {
        'f': 'json',
        'username': config["arcgis_token_username"],
        'password': config["arcgis_token_password"],
        'referer': 'x',
        'expiration': 600
    }
    generate_token_url = urllib.parse.urljoin(f"{rest_url}/", "generateToken")
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
