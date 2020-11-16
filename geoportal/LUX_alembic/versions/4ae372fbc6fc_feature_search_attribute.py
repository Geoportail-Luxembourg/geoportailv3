"""Feature Search attribute

Revision ID: 4ae372fbc6fc
Revises: 6143111b020b
Create Date: 2020-11-16 13:37:42.253399

"""

# revision identifiers, used by Alembic.
revision = '4ae372fbc6fc'
down_revision = '6143111b020b'
branch_labels = None
depends_on = None

from alembic import op, context
import sqlalchemy as sa


def upgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.add_column('lux_getfeature_definition',
                  sa.Column('search_column',
                            sa.VARCHAR,
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_column('lux_layer_internal_wms', 'search_column', schema=schema)
