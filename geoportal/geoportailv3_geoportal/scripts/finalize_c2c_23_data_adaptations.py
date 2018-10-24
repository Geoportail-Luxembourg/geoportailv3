# -*- coding: utf-8 -*-

import os
import os.path
import argparse
import warnings
import transaction

from pyramid.paster import get_app
from logging.config import fileConfig
from sqlalchemy import text


def main():
    """
    Manage data right after the migration to c2cgeoportal 2.3.
    Don't run it after that (It will do nothing)
    """
    parser = argparse.ArgumentParser(
        description="Manage data right after the migration to c2cgeoportal 2.3."
    )
    parser.add_argument(
        "-i", "--app-config",
        default="production.ini", dest="app_config",
        help="The application .ini config file (optional, default is "
        "'production.ini')"
    )
    parser.add_argument(
        "-n", "--app-name",
        default="app", dest="app_name",
        help="The application name (optional, default is 'app')"
    )
    
    options = parser.parse_args()
    app_config = options.app_config
    app_name = options.app_name

    if app_name is None and "#" in app_config:
        app_config, app_name = app_config.split("#", 1)
    if not os.path.isfile(app_config):
        parser.error("Cannot find config file: {0!s}".format(app_config))

    # loading schema name from config and setting its value to the
    # corresponding global variable from c2cgeoportal_geoportal

    # Ignores pyramid deprecation warnings
    warnings.simplefilter("ignore", DeprecationWarning)

    fileConfig(app_config, defaults=os.environ)
    get_app(app_config, options.app_name, options=os.environ)

    # must be done only once we have loaded the project config
    from c2cgeoportal_commons.models import DBSession, main, static
    from c2cgeoportal_commons.models.main import OGCSERVER_TYPE_MAPSERVER, OGCSERVER_TYPE_GEOSERVER, OGCSERVER_AUTH_NOAUTH, OGCServer, Metadata, TreeItem, TreeGroup, LayerGroup, LayerWMS;
    from geoportailv3_geoportal.models import LuxLayerInternalWMS;

    session = DBSession()

    # Column link can't be NULL in GMF metadata. Fill it.
    for metadata in session.query(Metadata).filter(Metadata.name == 'link' and Metadata.value == '').all():
      metadata.value = 'http://example.com'
      session.add(metadata)

    # Insert group background (in GMF) if it not already exists.
    treeitem = session.query(TreeItem).filter(TreeItem.name == 'background').one_or_none()
    if treeitem is None:
      layergroup = LayerGroup(
        name='background',
        is_expanded=False,
        is_internal_wms=True,
        is_base_layer=False
      )
      session.add(layergroup)

    transaction.commit()

    # Create new ogc_server if not already exists based on url in LuxLayerInternalWMS.
    for luxwms in session.query(LuxLayerInternalWMS).distinct(LuxLayerInternalWMS.url).all():
      url = luxwms.url
      if url is not None:
        type = OGCSERVER_TYPE_GEOSERVER if 'arcgis' in url else OGCSERVER_TYPE_MAPSERVER
        already_exists = session.query(OGCServer).filter(OGCServer.url == url).one_or_none()
        if already_exists is None:
          ogc_server = OGCServer(
            name=url,
            description='Generated during migration to GMF 2.3',
            url=url,
            type_=type,
            image_type='image/png',
            auth=OGCSERVER_AUTH_NOAUTH,
          )
          session.add(ogc_server)

    transaction.commit()

    # Set correct ogc_server for LuxLayerInternalWMS with url.
    for luxwms in session.query(LuxLayerInternalWMS).all():
      url = luxwms.url
      if url is not None:
        ogc_server = session.query(OGCServer).filter(OGCServer.url == url).one()
        layer_wms = session.query(LayerWMS).filter(LayerWMS.id == luxwms.id).one()
        layer_wms.ogc_server_id = ogc_server.id
        session.add(layer_wms)

    transaction.commit()

    # End note:
    # Now the the column 'url' in LuxLayerInternalWMS must be manually removed.
      

if __name__ == "__main__":
    main()
