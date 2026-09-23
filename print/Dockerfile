FROM camptocamp/mapfish_print:3.18.4
#COPY  --from=camptocamp/geoportailv3-config:latest /usr/local/tomcat/webapps/ROOT/print-apps /usr/local/tomcat/webapps/ROOT/print-apps
COPY print-apps /usr/local/tomcat/webapps/ROOT/print-apps
RUN sed -i 's/Connector port=\"8080\"/Connector port=\"8080\" maxPostSize = \"26214400\"/g' /usr/local/tomcat/conf/server.xml
RUN sed -i 's/1048576/26214400/g' webapps/ROOT/WEB-INF/web.xml

