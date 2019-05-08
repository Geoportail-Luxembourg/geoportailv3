"""Routing stats

Revision ID: 44d0e2c403b0
Revises: 3852cd2f413d
Create Date: 2017-11-27 11:53:14.575759

"""

# revision identifiers, used by Alembic.
revision = '44d0e2c403b0'
down_revision = '3852cd2f413d'
branch_labels = None
depends_on = None

import datetime
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy import Column
from sqlalchemy.types import Unicode, Integer

def upgrade():
    schema = context.get_context().config.get_main_option("schema")
    schema_stats = schema + '_stats'
    op.create_table(
        "routing",
        Column("id", Integer, primary_key=True, autoincrement=True, nullable=False),
        Column("transport_criteria", Integer, nullable=False),
        Column('transport_mode', Integer, nullable=False),
        Column('date', sa.DateTime(), nullable=False, default=datetime.datetime.now),
        schema=schema_stats,
    )

def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    schema_stats = schema + '_stats'
    op.drop_table('routing', schema=schema_stats)