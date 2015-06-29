/**
 * # servernode.conf.js
 *
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Configuration file for ServerNode in nodegame-server.
 * ---
 */
module.exports = configure;

function configure(servernode) {
    servernode.verbosity = 10;
    return true;
}
