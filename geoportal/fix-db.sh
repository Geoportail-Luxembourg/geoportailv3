#!/bin/bash -ex
alembic --name=main --config=/app/alembic.ini upgrade head;
alembic --name=static --config=/app/alembic.ini upgrade head;
alembic --name=lux --config=/app/alembic.ini upgrade head;
finalize23DataAdaptations;
manage-users --create -i production.ini -r role_admin -p c2c -e mail@c2c.ch admin
