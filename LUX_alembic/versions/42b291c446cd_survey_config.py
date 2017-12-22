"""survey config

Revision ID: 42b291c446cd
Revises: 42b291c446cd
Create Date: 2017-12-21 15:45:00.575759
"""

# revision identifiers, used by Alembic.
revision = '42b291c446cd'
down_revision = '44d0e2c403b0'
branch_labels = None
depends_on = None

import datetime
from alembic import op, context
import sqlalchemy as sa
from sqlalchemy import Column
from sqlalchemy.types import Unicode, Integer

def upgrade():
    schema = context.get_context().config.get_main_option("schema")

    op.create_table(
        "lux_measurement_directory",
        Column("id", Integer, primary_key=True, autoincrement=True, nullable=False),
        Column("name", Unicode, nullable=False),
        Column('town_code', Integer, nullable=False),
        Column('path', Unicode, nullable=False),
        schema=schema,
    )

def downgrade():
    schema = context.get_context().config.get_main_option('schema')

    op.drop_table('routing', schema=schema)