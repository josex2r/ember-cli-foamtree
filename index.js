/* jshint node: true */
'use strict';

var debug = require('debug')('foamtree');
var fs = require('fs');
var walkSync = require('walk-sync');
var UnwatchedTree = require('broccoli-unwatched-tree');
var deepmerge = require('deepmerge');
var path = require('path');
var toFoamtree = require('./lib/to-foamtree');

var foamtreePath = '/assets/foamtree/';
// Trees that are going to be inspected
var treeConf = {
  js: {
    globs: ['*/!(templates)/!(template).js'],
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

module.exports = {
  name: 'ember-cli-foamtree',

  config: function (env, baseConfig) {
    var options = baseConfig.foamtree || {};

    var defaultOptions = {
      enabled: env !== 'production',
      outputPath: 'dist/'
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
    debug('creating public tree');
    return new UnwatchedTree('public');
  },

  _readTree: function(type, dir) {
    var config = treeConf[type];

    debug('reading', type, 'tree from', dir);

    if (config) {
      var files = walkSync.entries(dir, { globs: config.globs });
      var foamtree = toFoamtree(config.output, files);
      debug('number of files', files.length);
      //debug(JSON.stringify(foamtree));

      config.foamtree = foamtree;
    }

    return dir;
  },

  preprocessTree: function(type, tree) {
    if (!this.foamtreeOptions.enabled) {
      return tree;
    }

    debug('preprocessing', type, 'tree');

    var _readTree = this._readTree.bind(this, type);

    return {
      read: function(readTree) {
        return readTree(tree)
        .then(_readTree)
        .catch(function(err) {
          debug('ERROR', err);
          console.log(err);
          throw err;
        });
      },

      cleanup: function() {}
    };
  },

  preBuild: function(result) {
    // console.log(this.app._scriptOutputFiles);
    // console.log(this.app._styleOutputFiles);
    // console.log(this.app.otherAssetPaths);
  },

  outputReady: function(result) {
    if (!this.foamtreeOptions.enabled) {
      return;
    }

    debug('output ready', result.directory);
    var confs = Object.keys(treeConf);
    debug('mapping trees', confs);
    var confArray = confs.map(function(key) {
      return {
        label: treeConf[key].label,
        groups: treeConf[key].foamtree.groups || []
      };
    });
    // Merge by same output file
    debug('merging output files');
    var output = {};
    confArray.forEach(function(conf) {
      if (output[conf.label]) {
        // Merge foamtree
        debug('merging foamtree', conf.label);
        output[conf.label] = deepmerge(output[conf.label], conf);
      } else {
        debug('creating new foamtree', conf.label);
        output[conf.label] = conf;
      }
    });
    // To array
    output = Object.keys(output).map(function(key) {
      return output[key]
    });
    var outputPath = path.join(result.directory, foamtreePath, 'data.js');
    debug('public assets path', outputPath);
    var outputJson = 'data = JSON.parse(\'' + JSON.stringify(output) + '\')';
    //var indexFunnel = new Funnel('public', { include: ['foamtree.html'] });

    // console.log(outputJson);
    // console.log(this.app.project.root);
    // console.log(Object.keys(this.app.project));
    debug('writing output file');
    fs.writeFile(outputPath, outputJson);
  }
};
