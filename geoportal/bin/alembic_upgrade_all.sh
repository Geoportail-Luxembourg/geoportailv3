#!/bin/bash -ex
alembic --name=main upgrade head;
alembic --name=static upgrade head;
alembic --name=lux upgrade head;
