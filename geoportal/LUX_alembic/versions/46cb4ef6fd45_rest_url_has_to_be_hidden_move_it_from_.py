"""rest_url has to be hidden. Move it from ui_metadata
to the lux_layer_internal_wms

Revision ID: 46cb4ef6fd45
Revises: 1b9b2d6fb6e
Create Date: 2015-01-07 11:32:20.615816

"""

# revision identifiers, used by Alembic.
revision = '46cb4ef6fd45'
down_revision = '1b9b2d6fb6e'
branch_labels = None
depends_on = None

from alembic import op, context
import sqlalchemy as sa


def upgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.add_column('lux_layer_internal_wms',
                  sa.Column('rest_url',
                            sa.VARCHAR(length=255),
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_column('lux_layer_internal_wms',
                   'rest_url',
                   schema=schema
                   )
