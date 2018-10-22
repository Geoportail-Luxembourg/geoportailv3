"""create measurement restriction table

Revision ID: 3b7de32aebed
Revises: 34e77893d2fa
Create Date: 2015-09-16 11:29:43.651105

"""

# revision identifiers, used by Alembic.
revision = '3b7de32aebed'
down_revision = '34e77893d2fa'
branch_labels = None
depends_on = None

from alembic import op, context
import sqlalchemy as sa


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_table('lux_measurement_login_commune', schema=schema)


def upgrade():
    schema = context.get_context().config.get_main_option('schema')

    op.create_table(
        'lux_measurement_login_commune',
        sa.Column(
            'login', sa.VARCHAR(), autoincrement=False,
            nullable=False),
        sa.Column(
            'num_commune', sa.VARCHAR(), autoincrement=False,
            nullable=False),
        schema=schema
    )
    op.create_primary_key(
        "lux_measurement_login_commune_pkey", "lux_measurement_login_commune",
        ['login', 'num_commune'],
        schema=schema
    )
