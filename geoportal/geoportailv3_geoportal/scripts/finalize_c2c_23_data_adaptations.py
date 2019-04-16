# -*- coding: utf-8 -*-

import os
import os.path
import argparse
import warnings
import transaction

from sqlalchemy import text
from . import get_session


def main():
    app_config = "production.ini"
    app_name = "app"

    if not os.path.isfile(app_config):
        "Cannot find config file: {0!s}".format(app_config) + 0

    # Ignores pyramid deprecation warnings
    warnings.simplefilter("ignore", DeprecationWarning)

    session = get_session(app_config, app_name)
    from c2cgeoportal_commons.models import DBSession, main, static
    from c2cgeoportal_commons.models.main import OGCSERVER_TYPE_MAPSERVER, \
        OGCSERVER_TYPE_GEOSERVER,OGCSERVER_AUTH_NOAUTH, OGCServer, Metadata, \
        TreeItem, TreeGroup, LayerGroup, LayerWMS, RestrictionArea, Interface
    from geoportailv3_geoportal.models import LuxLayerInternalWMS



    # Restriction area must have a name.
    for r_area in session.query(RestrictionArea).all():
      if r_area.name is None:
        r_area.name = 'restrictionarea-{}'.format(r_area.id)
        session.add(r_area)
    ###### select * from geov3.restrictionarea where name is null or name = '';
    ###### do we need a unique name?


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
