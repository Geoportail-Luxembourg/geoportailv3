# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response
import urllib.error
import urllib.request
from pyramid.httpexceptions import HTTPBadRequest, HTTPBadGateway
import logging
import json
import os

log = logging.getLogger(__name__)


class Metadata(object):

    def __init__(self, request):
        self.request = request

    @view_config(route_name='get_metadata')
    def get_metadata(self):
        lang = (self.request.params.get("lang", "fr") or "fr").lower()
        lang_map = {
            'fr': 'langfre',
            'de': 'langger',
            'en': 'langeng',
            'lb': 'langltz'
        }

        uuid = self.request.params.get("uid")
        callback_param = self.request.params.get("cb")

        if uuid is None:
            return HTTPBadRequest()

        lang_key = lang_map.get(lang, 'langfre')
        timeout = 15

        base_url = os.environ["GEONETWORK_BASE_URL"].rstrip('/')
        url = f"{base_url}/api/search/records/_search"

        payload = {
            "size": 1,
            "query": {
                "bool": {
                    "filter": [
                        {"term": {"metadataIdentifier": uuid}}
                    ]
                }
            },
            "_source": [
                "uuid",
                "metadataIdentifier",
                "resourceTitleObject",
                "resourceAbstractObject",
                "MD_LegalConstraintsOtherConstraintsObject",
                "link",
                "contact",
                "changeDate",
                "dateStamp",
                "allKeywords",
                "mainLanguage"
            ]
        }

        try:
            request = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw_data = response.read()
                es_response = json.loads(raw_data)
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError):
            log.exception("Failed to fetch metadata for %s", uuid)
            return HTTPBadGateway()

        hits = es_response.get("hits", {}).get("hits", [])
        metadata_obj = {}
        summary = {}
        if hits:
            metadata_obj, summary = self._transform_metadata(
                hits[0].get("_source", {}),
                lang_key,
            )

        metadata_body = {"metadata": metadata_obj}
        if summary:
            metadata_body["summary"] = summary

        body = json.dumps(metadata_body)

        if callback_param is None:
            headers = {"Content-Type": "application/json"}
            return Response(body, headers=headers)

        headers = {"Content-Type": "text/javascript"}
        return Response(f"{callback_param}({body})", headers=headers)

    def _transform_metadata(self, source, lang_key):
        fallback_keys = [lang_key, 'langfre', 'langeng', 'default']

        def pick_localized(value):
            if not isinstance(value, dict):
                return ""
            for key in fallback_keys:
                if key in value and value[key]:
                    return value[key]
            return ""

        keywords = self._extract_keywords(source.get("allKeywords"), fallback_keys)
        metadata = {
            "title": pick_localized(source.get("resourceTitleObject")) or "",
            "serviceDescription": "",
            "abstract": pick_localized(source.get("resourceAbstractObject")) or "",
            "legalConstraints": pick_localized(source.get("MD_LegalConstraintsOtherConstraintsObject")) or "",
            "link": self._extract_links(source.get("link"), pick_localized),
            "revisionDate": source.get("changeDate") or source.get("dateStamp") or "",
            "keyword": keywords,
            "responsibleParty": self._extract_contacts(source.get("contact"), pick_localized),
            "metadataIdentifier": source.get("metadataIdentifier") or source.get("uuid") or ""
        }
        summary = {"keywords": [{"@label": keyword} for keyword in keywords]} if keywords else {}
        return metadata, summary

    def _extract_links(self, links, pick_localized):
        if not links:
            return []
        if not isinstance(links, list):
            links = [links]

        extracted = []
        for link in links:
            if not isinstance(link, dict):
                continue
            url = pick_localized(link.get("urlObject"))
            if not url:
                continue
            name = pick_localized(link.get("nameObject")) or ""
            protocol = link.get("protocol") or ""
            extracted.append("|".join([name, "", url, protocol]))
        return extracted

    def _extract_keywords(self, all_keywords, fallback_keys):
        if not isinstance(all_keywords, dict):
            return []

        keywords = []
        seen = set()

        for group in all_keywords.values():
            if not isinstance(group, dict):
                continue
            entries = group.get("keywords")
            if not isinstance(entries, list):
                continue
            for entry in entries:
                text = ""
                if isinstance(entry, dict):
                    for key in fallback_keys:
                        if entry.get(key):
                            text = entry.get(key)
                            break
                elif isinstance(entry, str):
                    text = entry
                if not text:
                    continue
                for part in text.replace(";", ",").split(","):
                    keyword = part.strip()
                    if keyword and keyword not in seen:
                        seen.add(keyword)
                        keywords.append(keyword)
        return keywords

    def _extract_contacts(self, contacts, pick_localized):
        if not contacts:
            return []
        if isinstance(contacts, dict):
            contacts = [contacts]

        formatted = []
        for contact in contacts:
            if not isinstance(contact, dict):
                continue
            organisation = pick_localized(contact.get("organisationObject")) or ""
            individual = contact.get("individual") or organisation
            position = contact.get("position") or ""
            email = contact.get("email") or ""
            address = contact.get("address") or ""
            phone = contact.get("phone") or ""
            website = contact.get("website") or ""
            formatted.append("|".join([
                organisation,
                "metadata",
                individual or organisation,
                position,
                email,
                address,
                phone,
                website
            ]))
        return formatted
