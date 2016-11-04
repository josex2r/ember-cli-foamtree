/* jshint node: true */
'use strict';

var debug = require('debug')('foamtree');
var fs = require('fs');
var walkSync = require('walk-sync');
var UnwatchedTree = require('broccoli-unwatched-tree');
var deepmerge = require('deepmerge');
var path = require('path');
var flatten = require('lodash.flatten');
var toFoamtree = require('./lib/to-foamtree');

var ASSETS_PATH = '/assets/foamtree/';
// Trees that are going to be inspected
var TREE_CONF = {
  js: {
    globs: ['**/*.js'],
    label: 'app.js',
    foamtree: []
  },
  template: {
    globs: ['**/*/*.hbs'],
    label: 'app.js',
    foamtree: []
  },
  css: {
    globs: ['**/*/*.(css|scss)'],
    label: 'app.css',
    foamtree: []
  }
};
var TREE_CACHE = {};

module.exports = {
  name: 'ember-cli-foamtree',

  config: function (env, baseConfig) {
    var options = baseConfig.foamtree || {};

    var defaultOptions = {
      enabled: env !== 'production'
    }

    for (var option in defaultOptions) {
      if (!options.hasOwnProperty(option)) {
        options[option] = defaultOptions[option];
      }
    }

    this.foamtreeOptions = options;
  },

  isDevelopingAddon: function() {
    return true;
  },

  treeForPublic: function(tree) {
    var dirname = __dirname || path.resolve(path.dirname());
    dirname = path.join(dirname, 'public');
    debug('creating public tree', dirname);
    // Do not watch this tree because of reasons (a fs.writeFile
    // in the output directory will run a lot of rebuilds)
    return new UnwatchedTree(dirname);
  },

  /*
   * Wraps broccoli tree to read all it's files
   */
  _readTree: function(type, tree, dir) {
    // Get tree config from constant object
    var config = TREE_CONF[type];

    debug('reading', type, 'tree from', dir);
    // Do nothing if no config is available
    if (config) {
      // Read all files in this tree
      var files = flatten(tree.inputPaths.map(function(directory) {
        return walkSync.entries(directory, { globs: config.globs });
      }));
      // Make the nested object tree based in the "carrot foamtree" plugin input
      var foamtree = toFoamtree(config.label, files);
      debug('number of files', files.length);
      //debug(JSON.stringify(foamtree));
      // Persist the data somewhere, if the foamtree exist then deepmerge
      // all the tree, else just assign it
      if (TREE_CACHE[config.label]) {
        debug('merging foamtree', config.label);
        // We only want to persist the "groups" property, the files tree
        TREE_CACHE[config.label] = deepmerge(TREE_CACHE[config.label], foamtree);
      } else {
        debug('creating foamtree', config.label);
        TREE_CACHE[config.label] = foamtree;
      }
      config.foamtree = foamtree;
    }
    // Broccoli must know the current tree directory, simply return it
    return dir;
  },

  preprocessTree: function(type, tree) {
    // Do nothing if addon is diabled
    if (!this.foamtreeOptions.enabled) {
      return tree;
    }

    debug('preprocessing', type, 'tree');
    // Bind arguments to pass it as a promise callback
    var _readTree = this._readTree.bind(this, type, tree);
    // Wrap broccoli tree
    return {
      // Broccoli main function to override
      read: function(readTree) {
        // Process tree files
        return readTree(tree)
        // Custom function to cache all tree files
        .then(_readTree)
        // Log errors
        .catch(function(err) {
          debug('ERROR', err);
          console.log(err);
          throw err;
        });
      },
      // Do nothing :)
      cleanup: function() {}
    };
  },

  preBuild: function(result) {
    // console.log(this.app._scriptOutputFiles);
    // console.log(this.app._styleOutputFiles);
    // console.log(this.app.otherAssetPaths);
  },

  outputReady: function(result) {
    // Do nothing if addon is diabled
    if (!this.foamtreeOptions.enabled) {
      return;
    }

    // Transform cache object to array
    var output = Object.keys(TREE_CACHE).map(function(key) {
      return TREE_CACHE[key];
    });
    // Construct output assets path
    var outputPath = path.join(result.directory, ASSETS_PATH, 'data.js');
    // Declare global variable with the foamtree to import in the HTML file
    var outputJson = 'window.data = JSON.parse(\'' + JSON.stringify(output) + '\')';

    debug('public assets path', outputPath);
    debug('writing output file');
    fs.writeFile(outputPath, outputJson);
  }
};
