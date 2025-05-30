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
    op.execute(
        "do language plpgsql $$ "
        "begin "
        "execute 'create sequence casipo_seq_day start with ' || (current_date - '1900-01-01')::varchar; "
        "end; $$; "
        "select nextval('casipo_seq_day'); "
        "create sequence casipo_seq; "
        "create or replace function nextval_casipo_daily(in p_seq varchar) returns bigint as $$ "
        "declare "
        "dd bigint; "
        "lv bigint; "
        "begin "
        "select (current_timestamp at time zone 'Europe/Paris')::date - '1900-01-01'::date into dd; "
        "execute 'select last_value from '||p_seq||'_day' into lv; "
        "if dd - lv > 0 then "
        "execute 'alter sequence '||p_seq||' restart'; "
        "execute 'alter sequence '||p_seq||'_day restart with '||dd::varchar; "
        "execute 'select nextval('''||p_seq||'_day'')' into lv; "
        "end if; "
        "return nextval(p_seq); "
        "end; $$ language plpgsql;")

def downgrade():
    schema = context.get_context().config.get_main_option("schema")
    op.drop_table("lux_userconfig", schema=schema)
