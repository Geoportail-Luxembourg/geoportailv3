/**
 * @module ngeo.WFSDescribeFeatureType
 */
import googAsserts from 'goog/asserts.js';
import * as olBase from 'ol/index.js';
import olFormatXML from 'ol/format/XML.js';
import * as olXml from 'ol/xml.js';

/**
 * @classdesc
 * Format for reading WFS DescribeFeatureType data.
 *
 * @constructor
 * @extends {ol.format.XML}
 * @api
 */
class WFSDescribeFeatureType extends olFormatXML {
  constructor(){
    super()
  }

  /**
   * Read a WFS DescribeFeatureType document.
   *
   * @function
   * @param {Document|Node|string} source The XML source.
   * @return {Object} An object representing the WFS DescribeFeatureType.
   * @api
   */
  //read() {}


  /**
   * @inheritDoc
   */
  readFromDocument(doc) {
    for (let n = doc.firstChild; n; n = n.nextSibling) {
      if (n.nodeType == Node.ELEMENT_NODE) {
        return this.readFromNode(n);
      }
    }
    return null;
  }


  /**
   * @inheritDoc
   */
  readFromNode(node) {
    let result = {};
    result = olXml.pushParseAndPop(
      result,
      WFSDescribeFeatureType.PARSERS_,
      node,
      []
    );
    return result;
  }

}

/**
 * @private
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @return {!Object.<string, string>} Attributes.
 */
WFSDescribeFeatureType.readElement_ = function(node, objectStack) {
  const attributes = {};
  for (let i = 0, len = node.attributes.length; i < len; i++) {
    const attribute = node.attributes.item(i);
    attributes[attribute.name] = attribute.value;
  }
  if (objectStack.length === 1) {
    // remove namespace from type
    attributes['type'] = attributes['type'].split(':').pop();
  }
  return attributes;
};


/**
 * @private
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @return {!Object.<string, string>} Object.
 */
WFSDescribeFeatureType.readComplexType_ = function(node, objectStack) {
  const name = node.getAttribute('name');
  const object = olXml.pushParseAndPop(
    {'name': name},
    WFSDescribeFeatureType.COMPLEX_TYPE_PARSERS_,
    node, objectStack
  );
  // flatten
  object['complexContent'] =
    object['complexContent']['extension']['sequence']['element'];
  return object;
};


/**
 * @private
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @return {!Object.<string, string>} Object.
 */
WFSDescribeFeatureType.readComplexContent_ = function(
  node, objectStack
) {
  return olXml.pushParseAndPop(
    {},
    WFSDescribeFeatureType.COMPLEX_CONTENT_PARSERS_,
    node,
    objectStack
  );
};


/**
 * @private
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @return {!Object.<string, string>} Object.
 */
WFSDescribeFeatureType.readExtension_ = function(node, objectStack) {
  return olXml.pushParseAndPop(
    {},
    WFSDescribeFeatureType.EXTENSION_PARSERS_,
    node,
    objectStack
  );
};


/**
 * @private
 * @param {Node} node Node.
 * @param {Array.<*>} objectStack Object stack.
 * @return {!Object.<string, string>} Object.
 */
WFSDescribeFeatureType.readSequence_ = function(node, objectStack) {
  return olXml.pushParseAndPop(
    {},
    WFSDescribeFeatureType.SEQUENCE_PARSERS_,
    node,
    objectStack
  );
};


/**
 * @const
 * @private
 * @type {Array.<string>}
 */
WFSDescribeFeatureType.NAMESPACE_URIS_ = [
  null,
  'http://www.w3.org/2001/XMLSchema'
];


/**
 * @const
 * @type {!Object.<string, !Object.<string, !ol.XmlParser>>}
 * @private
 */
WFSDescribeFeatureType.PARSERS_ = googAsserts.assert(olXml.makeStructureNS(
  WFSDescribeFeatureType.NAMESPACE_URIS_, {
    'element': olXml.makeObjectPropertyPusher(
      WFSDescribeFeatureType.readElement_
    ),
    'complexType': olXml.makeObjectPropertyPusher(
      WFSDescribeFeatureType.readComplexType_
    )
  }));


/**
 * @const
 * @type {!Object.<string, !Object.<string, !ol.XmlParser>>}
 * @private
 */
WFSDescribeFeatureType.COMPLEX_TYPE_PARSERS_ = googAsserts.assert(olXml.makeStructureNS(
  WFSDescribeFeatureType.NAMESPACE_URIS_, {
    'complexContent': olXml.makeObjectPropertySetter(
      WFSDescribeFeatureType.readComplexContent_
    )
  }));


/**
 * @const
 * @type {!Object.<string, !Object.<string, !ol.XmlParser>>}
 * @private
 */
WFSDescribeFeatureType.COMPLEX_CONTENT_PARSERS_ = googAsserts.assert(olXml.makeStructureNS(
  WFSDescribeFeatureType.NAMESPACE_URIS_, {
    'extension': olXml.makeObjectPropertySetter(
      WFSDescribeFeatureType.readExtension_
    )
  }));


/**
 * @const
 * @type {!Object.<string, !Object.<string, !ol.XmlParser>>}
 * @private
 */
WFSDescribeFeatureType.EXTENSION_PARSERS_ = googAsserts.assert(olXml.makeStructureNS(
  WFSDescribeFeatureType.NAMESPACE_URIS_, {
    'sequence': olXml.makeObjectPropertySetter(
      WFSDescribeFeatureType.readSequence_
    )
  }));


/**
 * @const
 * @type {!Object.<string, !Object.<string, !ol.XmlParser>>}
 * @private
 */
WFSDescribeFeatureType.SEQUENCE_PARSERS_ = googAsserts.assert(olXml.makeStructureNS(
  WFSDescribeFeatureType.NAMESPACE_URIS_, {
    'element': olXml.makeObjectPropertyPusher(
      WFSDescribeFeatureType.readElement_
    )
  }));


export default exports;
