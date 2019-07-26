# -*- coding: utf-8 -*-
from pyramid.i18n import get_localizer, TranslationStringFactory
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPNotFound
from geoportailv3_geoportal.mymaps import Map, Feature
import geojson
from marrow.mailer import Message
import geojson
import bleach
import logging
from c2cgeoportal_commons.models import DBSessions
from geoportailv3_geoportal import mailer

_ = TranslationStringFactory("geoportailv3_geoportal-server")
log = logging.getLogger(__name__)


class Feedback(object):

    def __init__(self, request):
        self.request = request
        self.config = self.request.registry.settings
        self.localizer = get_localizer(self.request)
        self.db_mymaps = DBSessions['mymaps']


    @view_config(route_name='feedback', renderer='json')
    def feedback(self):
        try:
            vars = self.request.json_body
            sanitized_description = bleach.clean(vars['description'])
            html_body = u"<h3>L\'utilisateur <a href=\"mailto:{0}\">{0}</a> " \
                u"a remarqué le problème suivant:</h3><p>{1}</p>" \
                u"<p><a href=\"{3}\">Ouvrir le lien vers la carte</a></p>" \
                u"<h3>La couche suivante est concernée:</h3>" \
                u"<p>{2}</p>" \
                .format(vars['email'],
                        sanitized_description,
                        vars['layer'],
                        vars['url']
                        )
            support_email = self.config.get('feedback.support_email',
                                            'support@geoportail.lu')
            message = Message(
                author=vars['email'],
                to=support_email,
                subject=u'Un utilisateur a signalé un problème')
            message.plain = html_body
            message.rich = html_body
            message.encoding = 'utf-8'
            mailer.send(message)
        except Exception as e:
            log.exception(e)
            return HTTPNotFound()
        return {'success': True}

    @view_config(route_name='feedbackanf', renderer='json')
    def feedbackanf(self):
        try:
            vars = self.request.json_body
            map_id = self.config['anf']['map_id']
            map = self.db_mymaps.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()
            sanitized_description = bleach.clean(vars['description'])
            sanitized_lot = bleach.clean(vars['lot'])
            message = u"L\'utilisateur <a href=\"mailto:{0}\">{0}</a> " \
                u"a remarqué le problème suivant:<p>{1}</p> sur le lot" \
                u" {6}" \
                .format(vars['email'],
                        sanitized_description,
                        vars['layer'],
                        vars['url'],
                        vars['name'],
                        "http://map.geoportail.lu?map_id=" + map_id,
                        sanitized_lot,
                        )

            features = vars['features'].\
                replace(u'\ufffd', '?')
            feature_collection = geojson.\
                loads(features, object_hook=geojson.GeoJSON.to_instance)

            for feature in feature_collection['features']:
                obj = None
                try:
                    obj = Feature(feature)
                    obj.name = vars['name'] + " : " + sanitized_lot
                    obj.description = message
                except Exception as e:
                    log.exception(e)
                if obj is not None:
                    map.features.append(obj)
            self.db_mymaps.flush()

            html_body = u"<h3>L\'utilisateur <a href=\"mailto:{0}\">{4}</a> " \
                u"a remarqué le problème suivant:</h3><p>{1}</p>" \
                u" sur le lot {6}" \
                u"<p><a href=\"{3}\">Ouvrir le lien vers la carte</a></p>" \
                u"<p>L'incident a été enregistré dans cette <a href=\"{5}\">" \
                u"mymaps</a>:</p>" \
                .format(vars['email'],
                        sanitized_description,
                        vars['layer'],
                        vars['url'],
                        vars['name'],
                        "http://map.geoportail.lu?map_id=" + map_id,
                        sanitized_lot,
                        )

            support_email = self.config['anf']['email']
            message = Message(
                author=vars['email'],
                to=support_email,
                subject=u'Un utilisateur a signalé un problème')
            message.plain = html_body
            message.rich = html_body
            message.encoding = 'utf-8'
            mailer.send(message)
        except Exception as e:
            log.exception(e)
            return HTTPNotFound()
        return {'success': True}

    @view_config(route_name='feedbackage', renderer='json')
    def feedbackage(self):
        try:
            vars = self.request.json_body
            map_ids = self.config['age']['map_ids']
            layers = self.config['age']['layers']
            map_id = map_ids.split(',')[layers.split(',').
                                        index(vars['layerId'])]
            map = self.db_mymaps.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()
            sanitized_description = bleach.clean(vars['description'])

            message = u"L\'utilisateur <a href=\"mailto:{0}\">{4}({0})</a> " \
                u"a remarqué le problème suivant:<p>{1}</p> sur les couches" \
                u" suivantes" \
                u" {2}" \
                .format(vars['email'],
                        sanitized_description,
                        vars['layer'],
                        vars['url'],
                        vars['name'],
                        "http://map.geoportail.lu?map_id=" + map_id,
                        )

            features = vars['features'].\
                replace(u'\ufffd', '?')
            feature_collection = geojson.\
                loads(features, object_hook=geojson.GeoJSON.to_instance)

            for feature in feature_collection['features']:
                obj = None
                try:
                    obj = Feature(feature)
                    obj.name = vars['name']
                    obj.description = message
                except Exception as e:
                    log.exception(e)
                if obj is not None:
                    map.features.append(obj)
                self.db_mymaps.flush()

            html_body = u"<h3>L\'utilisateur <a href=\"mailto:{0}\">" \
                u"{4}({0})</a> " \
                u"a remarqué le problème suivant:</h3><p>{1}</p>" \
                u" sur les couches suivantes {2}" \
                u"<p><a href=\"{3}\">Ouvrir le lien vers la carte</a></p>" \
                u"<p>L'incident a été enregistré dans cette <a href=\"{5}\">" \
                u"mymaps</a>:</p>" \
                .format(vars['email'],
                        sanitized_description,
                        vars['layer'],
                        vars['url'],
                        vars['name'],
                        "http://map.geoportail.lu?map_id=" + map_id,
                        )

            support_email = self.config['age']['email']
            message = Message(
                author=vars['email'],
                to=support_email,
                subject=u'Un utilisateur a signalé un problème')
            message.plain = html_body
            message.rich = html_body
            message.encoding = 'utf-8'
            mailer.send(message)
        except Exception as e:
            log.exception(e)
            return HTTPNotFound()
        return {'success': True}

    @view_config(route_name='feedbackcrues', renderer='json')
    def feedbackcrues(self):
        try:
            vars = self.request.json_body
            map_id = self.config['age_crues']['map_id']
            map = self.db_mymaps.query(Map).get(map_id)
            if map is None:
                return HTTPNotFound()

            message = u"L\'utilisateur {1} <a href=\"mailto:{0}\">({0})</a> " \
                u"a remarqué le problème dessiné sur la carte :</p>" \
                .format(vars['email'],
                        vars['name']
                        )

            features = vars['features'].\
                replace(u'\ufffd', '?')
            feature_collection = geojson.\
                loads(features, object_hook=geojson.GeoJSON.to_instance)

            for feature in feature_collection['features']:
                obj = None
                try:
                    obj = Feature(feature)
                    obj.name = vars['name']
                    obj.description = message
                except Exception as e:
                    log.exception(e)
                if obj is not None:
                    map.features.append(obj)
                self.db_mymaps.flush()

            html_body = u"<h3>L\'utilisateur {2}<a href=\"mailto:{0}\">" \
                u"({0})</a> " \
                u"<p><a href=\"{1}\">Ouvrir le lien vers la carte</a></p>" \
                u"<p>L'incident a été enregistré dans cette <a href=\"{3}\">" \
                u"mymaps</a>:</p>" \
                .format(vars['email'],
                        vars['url'],
                        vars['name'],
                        "http://map.geoportail.lu?map_id=" + map_id,
                        )

            support_email = self.config['age_crues']['email']
            message = Message(
                author=vars['email'],
                to=support_email,
                subject=u'Un utilisateur a signalé un problème')
            message.plain = html_body
            message.rich = html_body
            message.encoding = 'utf-8'
            mailer.send(message)
        except Exception as e:
            log.exception(e)
            return HTTPNotFound()
        return {'success': True}