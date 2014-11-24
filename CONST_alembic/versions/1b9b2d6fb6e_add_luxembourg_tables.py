"""Add luxembourg tables

Revision ID: 1b9b2d6fb6e
Revises: 415746eb9f6
Create Date: 2014-11-24 15:45:03.798619

"""

# revision identifiers, used by Alembic.
revision = '1b9b2d6fb6e'
down_revision = '415746eb9f6'

from alembic import op, context
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_table('lux_layer_external_wms', schema=schema)
    op.drop_table('lux_role_theme', schema=schema)
    op.drop_table('lux_layer_internal_wms', schema=schema)
    op.drop_table('lux_layer_wmts', schema=schema)


def upgrade():
    schema = context.get_context().config.get_main_option('schema')

    
    op.create_table('lux_layer_wmts',
    sa.Column('id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('server_resolutions', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('use_client_zoom', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['id'], [schema +'.layer_wmts.id'], name=u'lux_layer_wmts_fk1', onupdate=u'CASCADE', ondelete=u'CASCADE'),
    sa.PrimaryKeyConstraint('id', name=u'lux_layer_wmts_pkey'),
    schema=schema
    )
    op.create_table('lux_layer_internal_wms',
    sa.Column('id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('url', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['id'], [schema +'.layer_internal_wms.id'], name=u'lux_layer_internal_wms_fk1', onupdate=u'CASCADE', ondelete=u'CASCADE'),
    sa.PrimaryKeyConstraint('id', name=u'lux_layer_internal_wms_pkey'),
    schema=schema
    )
    op.create_table('lux_role_theme',
    sa.Column('role_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('theme_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['role_id'], [schema +'.role.id'], name=u'lux_role_theme_fk1', onupdate=u'CASCADE', ondelete=u'CASCADE'),
    sa.ForeignKeyConstraint(['theme_id'], [schema +'.theme.id'], name=u'lux_role_theme_fk2', onupdate=u'CASCADE', ondelete=u'CASCADE'),
    schema=schema
    )
    op.create_table('lux_layer_external_wms',
    sa.Column('id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('category_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('is_poi', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('collection_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['id'], [schema +'.layer_external_wms.id'], name=u'lux_layer_external_wms_fk1', onupdate=u'CASCADE', ondelete=u'CASCADE'),
    sa.PrimaryKeyConstraint('id', name=u'lux_layer_external_wms_pkey'),
    schema=schema
    )