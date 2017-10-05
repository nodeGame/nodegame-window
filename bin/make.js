#!/usr/bin/env node

/**
 * # nodegame-client make script
 *
 */

/**
 * Module dependencies.
 */

var program = require('commander'),
smoosh = require('smoosh'),
fs = require('fs'),
os = require('os')
util = require('util'),
exec = require('child_process').exec,
path = require('path'),
J = require('JSUS').JSUS;

var pkg = require('../package.json'),
version = pkg.version;

module.exports.program = program;

var build = require('./build.js').build;


var rootDir = path.resolve(__dirname, '..') + '/';
var buildDir = rootDir + 'build/';

program
    .version(version);

program
    .command('clean')
    .description('Removes all files from build folder')
    .action(function(){
        cleanDir(buildDir);
    });

program
    .command('build [options]')
    .description('Creates a nodegame-window custom build')
    .option('-B, --bare', 'bare naked nodegame-window (only core)')
    .option('-a, --all', 'full build of nodegame-window (default)')
    .option('-C, --clean', 'clean build directory')
    .option('-A, --analyse', 'analyse build')
    .option('-o, --output <file>', 'output file (without .js)')
    .action(function(env, options){
        build(options);
    });

program
    .command('doc')
    .description('Builds documentation files')
    .action(function(){
        console.log('Building documentation for nodegame-window v.' + version);
        // http://nodejs.org/api.html#_child_processes
        try {
            var dockerDir = J.resolveModuleDir('docker', rootDir);
        }
        catch(e) {
            console.log('module Docker not found. Cannot build doc.');
            console.log('Do \'npm install docker\' to install it.');
            return false;
        }
        var command = dockerDir + 'docker -i ' + rootDir +
            ' index.js lib/ listeners/ -o ' + rootDir + 'docs/ -u';
        var child = exec(command, function (error, stdout, stderr) {
            if (stdout) console.log(stdout);
            if (stderr) console.log(stderr);
            if (error !== null) {
                console.log('build error: ' + error);
            }
        });
    });

// Parsing options.
program.parse(process.argv);
