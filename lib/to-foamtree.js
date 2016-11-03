var values = require('lodash.values');

// Move out or template into a creator function.
function createPath(name, size) {
  return {
    label: name,
    size: size,
    groups: {}
  };
}

// Resolves the path into objects iteratively (but looks eerily like recursion).
function resolvePath(root, entry){
  var path = entry.relativePath;
  var size = entry.size;

  path.split('/').reduce(function(pathObject, pathName){
    // For each path name we come across, use the existing or create a subpath
    pathObject.groups[pathName] = pathObject.groups[pathName] || createPath(pathName, size);
    // Then return that subpath for the next operation
    return pathObject.groups[pathName];
  // Use the passed in base object to attach our resolutions
  }, root);
}

function objectToArray(object) {
  object.groups = values(object.groups);

  if (object.groups.length) {
    object.groups = object.groups.map(objectToArray);
  } else {
    delete object.groups;
  }

  return object;
}

module.exports = function toFoamtree(name, entries) {
  // Loop all entries
  var result = entries.reduce(function(carry, pathEntry) {
    // On every path entry, resolve using the base object
    resolvePath(carry, pathEntry);
    // Return the base object for suceeding paths, or for our final value
    return carry;
  // Create our base object
  }, createPath(name));

  // Transform Objects to Arrays
  result = objectToArray(result);

  return result;
};
