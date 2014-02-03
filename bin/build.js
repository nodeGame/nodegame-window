#!/usr/bin/env node

/**
 * # nodegame-window build script
 */

module.exports.build = build;

var smoosh = require('smoosh'),
path = require('path'),
J = require('JSUS').JSUS;

var pkg = require('../package.json'),
version = pkg.version;


function build(options) {

    var out = options.output || "nodegame-window";

    if (path.extname(out) === '.js') {
        out = path.basename(out, '.js');
    }

    console.log('Building nodegame-window v.' + version);

    // Defining variables

    var rootDir = path.resolve(__dirname, '..') + '/',
    distDir = rootDir + 'build/',
    libDir = rootDir + 'lib/',
    modulesDir = libDir + 'modules/',
    listDir = rootDir + 'listeners/';

    // CREATING build array
    var files = [
        libDir + 'GameWindow.js',
        modulesDir + 'ui-behavior.js',
        modulesDir + 'lockScreen.js',
        listDir + 'listeners.js',
    ];

    if (!options.bare) {
        files = files.concat([
            modulesDir + 'selector.js',
            modulesDir + 'extra.js'
        ]);
    }

    files.push(rootDir + 'browser.closure.js');

    if (!options.bare) {
        files = files.concat([
            libDir + 'Canvas.js',
            libDir + 'HTMLRenderer.js',
            libDir + 'List.js',
            libDir + 'Table.js',
        ]);
    }


    console.log("\n");

    // Configurations for file smooshing.
    var config = {
        // VERSION : "0.0.1",

        // Use JSHINT to spot code irregularities.
        JSHINT_OPTS: {
            boss: true,
            forin: true,
            browser: true,
        },

        JAVASCRIPT: {
            DIST_DIR: '/' + distDir,
        }
    };

    config.JAVASCRIPT[out] = files;

    var run_it = function(){
        // https://github.com/fat/smoosh
        // hand over configurations made above
        var smooshed = smoosh.config(config);

        // removes all files from the build folder
        if (options.clean) {
            smooshed.clean();
        }

        // builds both uncompressed and compressed files
        smooshed.build();

        if (options.analyse) {
            smooshed.run(); // runs jshint on full build
            smooshed.analyze(); // analyzes everything
        }

        console.log('nodegame-window v.' + version + ' build created!');
    }

    run_it();
}