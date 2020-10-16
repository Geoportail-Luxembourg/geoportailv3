"""add auth for arcgis layers

Revision ID: 6143111b020b
Revises: 19e97a222003
Create Date: 2020-10-15 11:52:42.076090

"""

# revision identifiers, used by Alembic.
revision = '6143111b020b'
down_revision = '19e97a222003'
branch_labels = None
depends_on = None

from alembic import op, context
import sqlalchemy as sa


def upgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.add_column('lux_layer_internal_wms',
                  sa.Column('use_auth',
                            sa.BOOLEAN,
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_column('lux_layer_internal_wms', 'use_auth', schema=schema)
