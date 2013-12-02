/**
 * # GameWindow event button module
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Handles default behavior of the browser on certain DOM Events.
 *
 * http://www.nodegame.org
 * ---
 */
(function(window, node) {

    "use strict";

    var GameWindow = node.GameWindow;

    /**
     * ### GameWindow.noEscape
     *
     * Binds the ESC key to a function that always returns FALSE
     *
     * This prevents socket.io to break the connection with the server.
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     */
    GameWindow.prototype.noEscape = function(windowObj) {
        windowObj = windowObj || window;
        windowObj.document.onkeydown = function(e) {
            var keyCode = (window.event) ? event.keyCode : e.keyCode;
            if (keyCode === 27) {
                return false;
            }
        };
    };

    /**
     * ### GameWindow.restoreEscape
     *
     * Removes the the listener on the ESC key
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     *
     * @see GameWindow.noEscape()
     */
    GameWindow.prototype.restoreEscape = function(windowObj) {
        windowObj = windowObj || window;
        windowObj.document.onkeydown = null;
    };

    /**
     * ### GameWindow.promptOnleave
     *
     * Captures the onbeforeunload event and warns the user that leaving the
     * page may halt the game.
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     * @param {string} text Optional. A text to be displayed with the alert
     *
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     */
    GameWindow.prototype.promptOnleave = function(windowObj, text) {
        windowObj = windowObj || window;
        text = ('undefined' === typeof text) ? this.conf.textOnleave : text;
        windowObj.onbeforeunload = function(e) {
            e = e || window.event;
            // For IE<8 and Firefox prior to version 4
            if (e) {
                e.returnValue = text;
            }
            // For Chrome, Safari, IE8+ and Opera 12+
            return text;
        };
    };

    /**
     * ### GameWindow.restoreOnleave
     *
     * Removes the onbeforeunload event listener
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     *
     * @see GameWindow.promptOnleave
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     */
    GameWindow.prototype.restoreOnleave = function(windowObj) {
        windowObj = windowObj || window;
        windowObj.onbeforeunload = null;
    };

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
