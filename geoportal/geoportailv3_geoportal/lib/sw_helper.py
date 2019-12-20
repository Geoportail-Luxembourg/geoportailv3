import os
import glob
import time

UNUSED = '/static-ngeo/UNUSED_CACHE_VERSION/build/'
BUILD_PATH = '/app/geoportailv3_geoportal/static-ngeo/build'


def get_built_filenames(pattern):
    return [os.path.basename(name) for name in glob.glob(BUILD_PATH + '/' + pattern)]


def get_urls(request):
    main_js_url = UNUSED + get_built_filenames('main.*.js')[0]
    main_css_url = UNUSED + get_built_filenames('main.*.css')[0]
    gov_light_url = UNUSED + get_built_filenames('gov-light.*.png')[0]

    urls = [
        '/',
        '/dynamic.js?interface=main',
        '/getuserinfo',
        '/themes?version=2&background=background&interface=main&catalogue=true&min_levels=1',
        request.static_path('geoportailv3_geoportal:static-ngeo/images/arrow.png'),
        main_js_url,
        main_css_url,
        gov_light_url
    ]

    if 'dev' in request.params:
        urls.append('/dev/main.html')
        urls.append('/dev/main.css')
        urls.append('/dev/main.js')

    woffs = glob.glob('/app/geoportailv3_geoportal/static-ngeo/build/*.woff')
    for stuff in get_built_filenames('*.woff'):
        urls.append(UNUSED + stuff)

    for lang in ['fr', 'en', 'lb', 'de']:
        urls.append(request.static_path('geoportailv3_geoportal:static-ngeo/build/' + lang + '.json'))

    return urls
