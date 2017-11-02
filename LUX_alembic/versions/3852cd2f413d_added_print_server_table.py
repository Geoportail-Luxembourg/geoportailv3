"""added print server table

Revision ID: 3852cd2f413d
Revises: 47b7c7fcc245
Create Date: 2017-11-02 09:41:23.507599

"""

# revision identifiers, used by Alembic.
revision = '3852cd2f413d'
down_revision = '47b7c7fcc245'
branch_labels = None
depends_on = None

import sqlalchemy as sa
from alembic import op, context
from sqlalchemy import Column
from sqlalchemy.types import String, Unicode, DateTime

def upgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.create_table(
        "lux_print_servers",
        Column("id", String(100), primary_key=True),
        Column("name", Unicode),
        Column("creation", DateTime),
        schema=schema,
    )


def downgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.drop_table("lux_print_servers", schema=schema)
