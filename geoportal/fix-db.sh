#!/bin/bash -ex
alembic --name=main --config=/app/alembic.ini upgrade head;
alembic --name=static --config=/app/alembic.ini upgrade head;
alembic --name=lux --config=/app/alembic.ini upgrade head;
finalize23DataAdaptations;

#manage-users --create -i production.ini -r role_admin -p c2c -e mail@c2c.ch admin

echo "These are layers appearing in several subclasses"
psql <<EOF
delete from geov3.layer_wms where id = 737; -- WMS and WMTS
delete from geov3.layer_wms where id in (163, 215, 255, 259, 310, 326); -- WMS and Group
EOF
