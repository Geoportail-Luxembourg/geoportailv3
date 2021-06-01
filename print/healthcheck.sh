#!/bin/sh

curl 'http://localhost:8080/print/default/buildreport.pdf' \
  --data-raw 'spec=%7B%22attributes%22%3A%7B%22map%22%3A%7B%22dpi%22%3A127%2C%22rotation%22%3A0%2C%22center%22%3A%5B680994%2C6379091%5D%2C%22projection%22%3A%22EPSG%3A3857%22%2C%22scale%22%3A15432.564309821148%2C%22layers%22%3A%5B%7B%22baseURL%22%3A%22https%3A%2F%2Fwms.geoportail.lu%2Fopendata%2Fservice%22%2C%22imageFormat%22%3A%22image%2Fpng%22%2C%22layers%22%3A%5B%22roadmap%22%5D%2C%22customParams%22%3A%7B%22TRANSPARENT%22%3Atrue%2C%22MAP_RESOLUTION%22%3A127%7D%2C%22type%22%3A%22wms%22%2C%22opacity%22%3A1%2C%22version%22%3A%221.1.1%22%2C%22useNativeAngle%22%3Atrue%7D%5D%7D%2C%22disclaimer%22%3A%22www.geoportail.lu+est+un+portail+d%27acc%E8s+aux+informations+g%E9olocalis%E9es%2C+donn%E9es+et+services+qui+sont+mis+%E0+disposition+par+les+administrations+publiques+luxembourgeoises.+Responsabilit%E9%3A+Malgr%E9+la+grande+attention+qu%92elles+portent+%E0+la+justesse+des+informations+diffus%E9es+sur+ce+site%2C+les+autorit%E9s+ne+peuvent+endosser+aucune+responsabilit%E9+quant+%E0+la+fid%E9lit%E9%2C+%E0+l%92exactitude%2C+%E0+l%92actualit%E9%2C+%E0+la+fiabilit%E9+et+%E0+l%92int%E9gralit%E9+de+ces+informations.+Information+d%E9pourvue+de+foi+publique.+%5CnDroits+d%27auteur%3A+Administration+du+Cadastre+et+de+la+Topographie.+http%3A%2F%2Fg-o.lu%2Fcopyright%22%2C%22scaleTitle%22%3A%22Echelle+approximative+1%3A%22%2C%22appTitle%22%3A%22Le+g%E9oportail+national+du+Grand-Duch%E9+du+Luxembourg%22%2C%22scale%22%3A10000%2C%22name%22%3A%22%22%2C%22url%22%3A%22http%3A%2F%2Fg-o.lu%2F3%2FjDlt%22%2C%22qrimage%22%3A%22https%3A%2F%2Fmap.geoportail.lu%2Fqr%3Furl%3Dhttp%3A%2F%2Fg-o.lu%2F3%2FjDlt%22%2C%22lang%22%3A%22fr%22%2C%22legend%22%3Anull%2C%22scalebar%22%3A%7B%22geodetic%22%3Atrue%7D%2C%22dataOwner%22%3A%22%26copy%3B+%3Ca+href%3D%5C%22https%3A%2F%2Fwww.mapzen.com%2Frights%5C%22%3ECARTO%3C%2Fa%3E++%26copy%3B+%3Ca+href%3D%5C%22https%3A%2F%2Fopenstreetmap.org%2Fcopyright%5C%22%3EOpenStreetMap%3C%2Fa%3E+contributors+for+data+outside+of+Luxembourg%22%2C%22dateText%22%3A%22Date+d%27impression%3A+%22%2C%22queryResults%22%3Anull%7D%2C%22format%22%3A%22png%22%2C%22layout%22%3A%22A4+landscape%22%7D' \
  --compressed \
  --insecure \
  --noproxy localhost > /tmp/t.png

res=$?
if test "$res" != "0"; then
   exit $res
fi
exit 0