[DEFAULT]
project = geoportailv3

[main]
hookdir = %(here)s/hooks/
# to update the static schema, we need to deploy the code first
restore_order = code,database,files

[files]
active = false

[databases]
names = ${db}.${schema}
use_schema = true
psql = sudo -u postgres psql
dump = sudo -u postgres pg_dump -Fc
createdb = sudo -u postgres createdb
restore_tmp = sudo -u postgres pg_restore -Fc -d

[code]
src = ${deploy["code_source"]}
dest = ${deploy["code_destination"]}

[apache]
active = false

[remote_hosts]
demo = c2cpc.camptocamp.com
prod = c2cpc.camptocamp.com
