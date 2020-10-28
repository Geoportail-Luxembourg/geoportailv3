"""Set url to config://wmsproxy in OGCServer Internal WMS

Revision ID: 6f66f0579702
Revises: 19e97a222003
Create Date: 2020-10-28 16:59:09.383314
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '6f66f0579702'
down_revision = '19e97a222003'
branch_labels = None
depends_on = None


def upgrade():
    # OGCServer needs an real URL
    op.execute(
        "UPDATE geov3.ogc_server SET url = 'config://proxywms' WHERE url = '';"
    )


def downgrade():
    op.execute(
        "UPDATE geov3.ogc_server SET url = '' WHERE url = 'config://proxywms';"
    )
