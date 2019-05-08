"""survey config

Revision ID: 84b558deac2
Revises: 84b558deac2
Create Date: 2017-12-21 15:45:00.575759
"""
import sqlalchemy as sa
from alembic import op, context

# revision identifiers, used by Alembic.
revision = '84b558deac2'
down_revision = '42b291c446cd'
branch_labels = None
depends_on = None

import datetime
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy import Column
from sqlalchemy.types import Unicode, Integer

def upgrade():
    schema = context.get_context().config.get_main_option('schema')

    op.add_column('lux_getfeature_definition',
                  sa.Column('query_limit',
                            sa.INTEGER(),
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )


def downgrade():
    schema = context.get_context().config.get_main_option('schema')

    op.drop_column('lux_getfeature_definition',
               'query_limit',
               schema=schema
               )