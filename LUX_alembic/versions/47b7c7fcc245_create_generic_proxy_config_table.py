"""create generic proxy config table

Revision ID: 47b7c7fcc245
Revises: 3e50ad660e39
Create Date: 2017-07-19 09:30:11.700701

"""

# revision identifiers, used by Alembic.
revision = '47b7c7fcc245'
down_revision = '3e50ad660e39'
branch_labels = None
depends_on = None

from alembic import op, context
from sqlalchemy import Column
from sqlalchemy.types import Unicode, Boolean, Integer


def upgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.create_table(
        "lux_download_url",
        Column("id", Integer, primary_key=True, autoincrement=True, nullable=False),
        Column("url", Unicode, nullable=False),
        Column('protected', Boolean,
               autoincrement=False, nullable=False, default=False),
        schema=schema,
    )

def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_table('lux_download_url', schema=schema)

