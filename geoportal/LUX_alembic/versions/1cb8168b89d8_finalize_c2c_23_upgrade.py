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
Revises: 42b291c446cd
Create Date: 2018-10-18 09:48:12.655466
"""

from alembic import op
from c2cgeoportal_commons.config import config

# revision identifiers, used by Alembic.
revision = '1cb8168b89d8'
down_revision = '42b291c446cd'
branch_labels = None
depends_on = None


def upgrade():
    schema = config['schema']
    staticschema = config['schema_static']

    # Operation on data, because sqlalchemy can't modify inconsistent table
    # (The model define that 'none' should not exist for auth, so
    # sqlalchemy can't do anything for us).
    # Use 'No auth' instead if 'none' as auth for GMF ogc_server;
    op.execute(
      "UPDATE {schema}.ogc_server SET auth = 'No auth' WHERE auth = 'none';".format(schema=schema)
    )

    # End note:
    # Some other data movement are done by:
    # geoportal/geoportailv3_geoportal/scripts/finalize_c2c_23_data_adaptations.py


def downgrade():

    # Do nothing, as the upgrade is only on wrong data or not problematic additions.
    pass
