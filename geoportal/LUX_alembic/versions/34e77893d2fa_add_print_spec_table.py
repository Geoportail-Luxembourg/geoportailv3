"""Add Print spec table

Revision ID: 34e77893d2fa
Revises: 8764d58e895
Create Date: 2015-07-01 15:26:38.716961

"""

# revision identifiers, used by Alembic.
revision = '34e77893d2fa'
down_revision = '8764d58e895'
branch_labels = None
depends_on = None

from alembic import op, context
from sqlalchemy import Column
from sqlalchemy.types import String, Unicode, DateTime


def upgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.create_table(
        "lux_print_job",
        Column("id", String(100), primary_key=True),
        Column("spec", Unicode),
        Column("creation", DateTime),
        schema=schema,
    )


def downgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.drop_table("lux_print_job", schema=schema)
