"""Add vector style table

Revision ID: 19e97a222003
Revises: 1cb8168b89d8
Create Date: 2020-01-09 09:37:25.499564

"""
from alembic import op, context
from sqlalchemy import Column
from sqlalchemy.types import INTEGER, Unicode, VARCHAR


# revision identifiers, used by Alembic.
revision = '19e97a222003'
down_revision = '1cb8168b89d8'
branch_labels = None
depends_on = None


def upgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.create_table(
        "lux_userconfig",
        Column("id", INTEGER, primary_key=True),
        Column("key", Unicode, nullable=False),
        Column("style", VARCHAR, nullable=False),
        Column("user_login", Unicode, nullable=False),
        schema=schema,
    )


def downgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.drop_table("lux_userconfig", schema=schema)
