/* jshint node: true */
'use strict';

var fs = require('fs');
var walkSync = require('walk-sync');
var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');
var unionBy = require('lodash.unionby');
var path = require('path');
var toFoamtree = require('./lib/to-foamtree');

var foamtreePath = '/assets/foamtree/';
var treeConf = {
  js: {
    globs: ['**/*/!(template).js'],
    output: 'app.js',
    groups: null
  },
  template: {
    globs: ['**/*/*.hbs'],
    output: 'app.js',
    groups: null
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
    return new Funnel('public');
  },

  treeForApp: function(tree) {
    return tree;
  },

  treeForTest: function(tree) {
    return tree;
  },

  _readTree: function(type, dir) {
    var config = treeConf[type];

    // console.log('_readTree', type, dir, config);

    if (config) {
      var files = walkSync.entries(dir, { globs: config.globs });
      var foamtree = toFoamtree(config.output, files);
      // console.log('type:', type);
      // console.log('files:', files.length);
      // console.log(foamtree);
      // console.log(JSON.stringify(toFoamtree(type, files)));
      // console.log('#########################');

      config.groups = foamtree;
    }

    return dir;
  },

  preprocessTree: function(type, tree) {
    if (!this.foamtreeOptions.enabled) {
      return tree;
    }

    var _readTree = this._readTree.bind(this, type);

    return {
      read: function(readTree) {
        return readTree(tree)
        .then(_readTree)
        .catch(function(err) {
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

    var confs = Object.keys(treeConf);
    var confArray = confs.map(function(key) {
      return treeConf[key];
    });
    var output = unionBy(confArray, 'output');
    var outputPath = path.join(this.app.project.root, this.foamtreeOptions.outputPath, foamtreePath, 'data.json');
    var outputJson = JSON.stringify(output);
    //var indexFunnel = new Funnel('public', { include: ['foamtree.html'] });

    console.log(outputJson);
    // console.log(this.app.project.root);
    // console.log(Object.keys(this.app.project));

    fs.writeFile(outputPath, outputJson);
    //return mergeTrees([tree, indexFunnel], { overwrite: true });
  }
};
