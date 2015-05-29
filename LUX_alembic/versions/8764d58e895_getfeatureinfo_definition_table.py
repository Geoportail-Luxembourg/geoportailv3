"""getfeatureinfo definition table

Revision ID: 8764d58e895
Revises: 46cb4ef6fd45
Create Date: 2015-05-29 09:40:14.608156

"""

# revision identifiers, used by Alembic.
revision = '8764d58e895'
down_revision = '46cb4ef6fd45'
branch_labels = None
depends_on = None

from alembic import op, context
import sqlalchemy as sa


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_table('lux_getfeature_definition', schema=schema)


def upgrade():
    schema = context.get_context().config.get_main_option('schema')

    op.create_table(
        'lux_getfeature_definition',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column(
            'engine', sa.VARCHAR(), autoincrement=False,
            nullable=False),
        sa.Column(
            'query', sa.VARCHAR(), autoincrement=False,
            nullable=True),
        sa.Column(
            'template', sa.VARCHAR(), autoincrement=False,
            nullable=False, server_default="default.html"),
        sa.Column(
            'layer', sa.VARCHAR(), autoincrement=False,
            nullable=True),
        sa.Column(
            'additional_info_function', sa.VARCHAR(), autoincrement=False,
            nullable=True),
        sa.Column(
            'role', sa.INTEGER(), autoincrement=False,
            nullable=True),
        sa.Column(
            'rest_url', sa.VARCHAR(), autoincrement=False,
            nullable=True),
        sa.Column(
            'attributes_to_remove', sa.VARCHAR(), autoincrement=False,
            nullable=True),
        sa.Column(
            'remote_template', sa.BOOLEAN(), autoincrement=False,
            nullable=True, server_default="false"),
        sa.Column(
            'poi_id_collection', sa.INTEGER(), autoincrement=False,
            nullable=True),
        sa.Column(
            'geometry_column', sa.VARCHAR(), autoincrement=False,
            nullable=True, server_default="geom"),
        sa.PrimaryKeyConstraint('id', name=u'lux_getfeature_definition_pkey'),
        schema=schema
    )
