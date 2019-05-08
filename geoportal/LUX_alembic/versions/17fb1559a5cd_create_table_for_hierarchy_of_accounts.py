"""create table for hierarchy of accounts

Revision ID: 17fb1559a5cd
Revises: 3b7de32aebed
Create Date: 2015-09-16 14:20:30.972593

"""

# revision identifiers, used by Alembic.
revision = '17fb1559a5cd'
down_revision = '3b7de32aebed'
branch_labels = None
depends_on = None

from alembic import op, context
import sqlalchemy as sa


def downgrade():
    schema = context.get_context().config.get_main_option('schema')
    op.drop_table('lux_user_inheritance', schema=schema)
    op.execute("DROP FUNCTION IF EXISTS "
               "%(schema)s.getMainAccount(VARCHAR)"
               % {"schema": schema})


def upgrade():
    schema = context.get_context().config.get_main_option('schema')

    op.create_table(
        'lux_user_inheritance',
        sa.Column(
            'login', sa.VARCHAR(), autoincrement=False,
            nullable=False),
        sa.Column(
            'login_father', sa.VARCHAR(), autoincrement=False,
            nullable=False),
        schema=schema
    )
    op.create_primary_key(
        "lux_user_inheritance_pkey", "lux_user_inheritance",
        ['login', 'login_father'],
        schema=schema
    )
    op.execute(
        "CREATE OR REPLACE FUNCTION %(schema)s.getMainAccount "
        "(child_login VARCHAR)"
        "RETURNS VARCHAR AS "
        "$$ "
        "DECLARE "
        "cur_login_father VARCHAR;"
        "res_login_father VARCHAR;"
        "c_father Cursor  (p_login VARCHAR) FOR "
        "Select login_father From %(schema)s.lux_user_inheritance Where "
        "login = p_login;"
        "BEGIN "
        "cur_login_father := child_login;"
        "LOOP "
        "OPEN c_father(cur_login_father);"
        "FETCH FIRST FROM c_father into res_login_father;"
        "IF FOUND THEN "
        "cur_login_father := res_login_father;"
        "END IF;"
        "CLOSE c_father;"
        "IF NOT FOUND THEN "
        "RETURN cur_login_father;"
        "END IF;"
        "END LOOP;"
        "END;"
        "$$"
        "LANGUAGE plpgsql;" % {"schema": schema})
