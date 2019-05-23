# -*- coding: utf-8 -*-

# Copyright (c) 2017-2018, Camptocamp SA
# All rights reserved.

# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:

# 1. Redistributions of source code must retain the above copyright notice, this
#    list of conditions and the following disclaimer.
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.

# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

# The views and conclusions contained in the software and documentation are those
# of the authors and should not be interpreted as representing official policies,
# either expressed or implied, of the FreeBSD Project.

"""finalize_c2c_23_upgrade

Revision ID: 1cb8168b89d8
Revises: 84b558deac2
Create Date: 2018-10-18 09:48:12.655466
"""

from alembic import op
from c2cgeoportal_commons.config import config

# revision identifiers, used by Alembic.
revision = '1cb8168b89d8'
down_revision = '84b558deac2'
branch_labels = None
depends_on = None

def upgrade():

    op.execute("""
        UPDATE geov3.treeitem SET name = 'background' WHERE name = 'bglayers';
        UPDATE geov3.interface SET name='main' WHERE name = 'desktop';
        ALTER TABLE geov3.lux_print_job ALTER COLUMN id TYPE VARCHAR(120);
    """)

    # Auth is now an enum.
    op.execute(
        "UPDATE geov3.ogc_server SET auth = 'No auth' WHERE auth = 'none';"
    )

    # Internal WMS layers need to have a no-url ogc server to go through the lux proxy.
    op.execute("""
        INSERT
        INTO geov3.ogc_server (name, description, url, type, image_type, auth)
        VALUES ('Internal WMS', 'Use Luxembourg proxy', '', 'mapserver', 'image/png', 'No auth');
        UPDATE geov3.layer_wms
        SET ogc_server_id = (SELECT id FROM geov3.ogc_server WHERE url = '' limit 1)
        WHERE id IN (SELECT id FROM geov3.lux_layer_internal_wms);
    """)


def downgrade():

    # We are not planning to come back from 2.3 et 1.6.
    # Please do some backups and restore these if needed.
    pass
