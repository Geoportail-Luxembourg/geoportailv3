goog.provide('app.misc.file');

/**
 * @param {string} name The string to sanitize.
 * @return {string} The sanitized string.
 */
app.misc.file.sanitizeFilename = function(name) {
  name = name.replace(/\s+/g, '_'); // Replace white space with _.
  return name.replace(/[^a-z0-9\-\_]/gi, ''); // Strip any special character.
};
