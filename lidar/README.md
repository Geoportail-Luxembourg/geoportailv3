This folder contains all config for the [pytree](https://github.com/sitn/pytree) service, eventually it's data.

## Docker

* Build image for Pytree `docker build -t pytree .`

## Dev

* Get LAS/LAZ file from lidar.geoportail.lu
* Get PotreeConverter. You'll need to compile it, on linux it's straight forward (`git clone`, `cmake`. Follow the instruction at [PotreeConverter](https://github.com/potree/PotreeConverter).
* Convert LAS/LAZ folder to potree data format in the `lidar/data`folder (`PotreeConverter `*.laz -o lidar/data`)
* Pytree should work you can adjust the config file `pytree.yml`.

**note** since is mounted directly into the container, modifying `pytree.yml` once the container is started won't be taken into account¹.

## Api call example

`wget http://localhost:5000/profile/get?minLOD=7%20%20%20%20%20%20&maxLOD=8&width=5&coordinates={77848.09,%2074821.8},{77968.23,%2074680.25},{78225.7,%2074720.37}&pointCloud=luxembourg&attributes=`


¹: For the curious one, when you save a file, his inode is modified, docker bind inode when bind mount is used.

