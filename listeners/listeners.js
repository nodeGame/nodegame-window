/**
 * # listeners
 * Copyright(c) 2021 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow listeners
 *
 * www.nodegame.org
 */
(function(node) {

    "use strict";

    var GameWindow = node.GameWindow;

    /**
     * ## GameWindow.addDefaultListeners
     *
     * Adds a battery of event listeners for incoming messages
     *
     * If executed once, it requires a force flag to re-add the listeners
     *
     * @param {boolean} force Whether to force re-adding the listeners
     * @return {boolean} TRUE on success
     */
    GameWindow.prototype.addDefaultListeners = function(force) {

        if (this.listenersAdded && !force) {
            node.err('node.window.addDefaultListeners: listeners already ' +
                     'added once. Use the force flag to re-add.');
            return false;
        }

        node.on('NODEGAME_GAME_CREATED', function() {
            W.init(node.conf.window);
        });

        // Disable all the input forms found within a given id element.
        node.on('INPUT_DISABLE', function(id) {
            W.toggleInputs(id, true);
        });

        // Disable all the input forms found within a given id element.
        node.on('INPUT_ENABLE', function(id) {
            W.toggleInputs(id, false);
        });

        // Disable all the input forms found within a given id element.
        node.on('INPUT_TOGGLE', function(id) {
            W.toggleInputs(id);
        });

        /**
         * Force disconnection upon page unload
         *
         * This makes browsers using AJAX to signal disconnection immediately.
         *
         * Kudos:
         * http://stackoverflow.com/questions/1704533/intercept-page-exit-event
         */
        window.onunload = function() {
            var i;
            node.socket.disconnect();
            // Do nothing, but gain time.
            for (i = -1 ; ++i < 100000 ; ) { }
        };

        // Mark listeners as added.
        this.listenersAdded = true;

        node.silly('node-window: listeners added.');
        return true;
    };

})(
    'undefined' !== typeof node ? node : undefined
);
