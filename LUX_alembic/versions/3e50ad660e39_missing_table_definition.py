"""Missing table definition

Revision ID: 3e50ad660e39
Revises: 17fb1559a5cd
Create Date: 2016-07-29 16:12:19.497075

"""
import sqlalchemy as sa
from alembic import op, context

# revision identifiers, used by Alembic.
revision = '3e50ad660e39'
down_revision = '17fb1559a5cd'
branch_labels = None
depends_on = None


def upgrade():
    schema = context.get_context().config.get_main_option('schema')
    schema_stats = schema + '_stats'
    op.create_table(
        'lux_predefined_wms',
        sa.Column('url', sa.VARCHAR(), nullable=False),
        sa.Column('label', sa.VARCHAR(), nullable=False),
        sa.PrimaryKeyConstraint('url'),
        schema=schema
    )

    op.add_column('lux_print_job',
                  sa.Column('is_error',
                            sa.BOOLEAN(),
                            autoincrement=False,
                            nullable=True,
                            default=False
                            ),
                  schema=schema
                  )

    op.add_column('lux_print_job',
                  sa.Column('print_url',
                            sa.VARCHAR(),
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )
    op.add_column('lux_getfeature_definition',
                  sa.Column('has_profile',
                            sa.BOOLEAN(),
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )
    
    op.add_column('lux_getfeature_definition',
                  sa.Column('columns_order',
                            sa.VARCHAR(),
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )
    op.add_column('lux_getfeature_definition',
                  sa.Column('id_column',
                            sa.VARCHAR(),
                            autoincrement=False,
                            nullable=True
                            ),
                  schema=schema
                  )
    op.create_table(
        'connections',
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('ip', sa.VARCHAR(), nullable=True),
        sa.Column('action', sa.VARCHAR(), nullable=True),
        sa.Column('login', sa.VARCHAR(), nullable=True),
        sa.Column('application', sa.VARCHAR(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        schema=schema_stats
    )
    op.create_table(
        'measurement_download',
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('login', sa.VARCHAR(), nullable=True),
        sa.Column('filename', sa.VARCHAR(), nullable=True),
        sa.Column('download_date', sa.DateTime(), nullable=True),
        sa.Column('commune', sa.VARCHAR(), nullable=True),
        sa.Column('parcelle', sa.VARCHAR(), nullable=True),
        sa.Column('application', sa.VARCHAR(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        schema=schema_stats
    )
    op.create_table(
        'sketch_download',
        sa.Column('id', sa.INTEGER(), nullable=False),
        sa.Column('login', sa.VARCHAR(), nullable=True),
        sa.Column('filename', sa.VARCHAR(), nullable=True),
        sa.Column('download_date', sa.DateTime(), nullable=True),
        sa.Column('application', sa.VARCHAR(), nullable=True),
        sa.Column('directory', sa.VARCHAR(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        schema=schema_stats
    )
    op.create_table(
        'pag_download',
        sa.Column('objectids', sa.VARCHAR(), nullable=False),
        sa.Column('download_date', sa.DateTime(), nullable=False),
        sa.Column('download_link', sa.VARCHAR(), nullable=False),
        sa.PrimaryKeyConstraint('objectids', 'download_date', 'download_link'),
        schema=schema_stats
    )


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    schema_stats = schema + '_stats'
    op.drop_column('lux_print_job',
                   'is_error',
                   schema=schema
                   )
    op.drop_column('lux_print_job',
                   'print_url',
                   schema=schema
                   )
    op.drop_column('lux_getfeature_definition',
                   'has_profile',
                   schema=schema
                   )
    op.drop_column('lux_getfeature_definition',
                   'columns_order',
                   schema=schema
                   )
    op.drop_column('lux_getfeature_definition',
                   'id_column',
                   schema=schema
                   )
    op.drop_table('lux_predefined_wms', schema=schema)
    op.drop_table('pag_download', schema=schema_stats)
    op.drop_table('sketch_download', schema=schema_stats)
    op.drop_table('measurement_download', schema=schema_stats)
    op.drop_table('connections', schema=schema_stats)
