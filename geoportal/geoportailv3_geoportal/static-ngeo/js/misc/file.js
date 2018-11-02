/**
 * @module app.misc.file
 */
let exports = {};

/**
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 */
exports.sanitizeFilename = function(name) {
  name = name.replace(/\s+/g, '_'); // Replace white space with _.
  return name.replace(/[^a-z0-9\-\_]/gi, ''); // Strip any special character.
};


export default exports;
