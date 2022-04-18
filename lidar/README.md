This folder contains all config for the [pytree](https://github.com/sitn/pytree) service, eventually it's data.

## Dev

* Get LAS/LAZ file from lidar.geoportail.lu
* Get PotreeConverter. You'll need to compile it, on linux it's straight forward (`git clone`, `cmake`. Follow the instruction at [PotreeConverter](https://github.com/potree/PotreeConverter).
* Convert LAS/LAZ folder to potree data format in the `lidar/data`folder (`PotreeConverter `*.laz -o lidar/data`)
* Pytree should work you can adjust the config file `pytree.yml`.

**note** since is mounted directly into the container, modifying `pytree.yml` once the container is started won't be taken into account¹.



¹: For the curious one, when you save a file, his inode is modified, docker bind inode when bind mount is used.
http://localhost:5000/profile/get?minLOD=0&maxLOD=5&width=10&coordinates={2538600.0,1181474.0},{2539187.0,1181062.0}&pointCloud=luxembourg&attributes=%27
