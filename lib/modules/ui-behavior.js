/**
 * # ui-behavior
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow UI Behavior module
 *
 * Handles default behavior of the browser on certain DOM Events.
 *
 * http://www.nodegame.org
 */
(function(window, node) {

    "use strict";

    var GameWindow = node.GameWindow;
    var J = node.JSUS;

    /**
     * ### GameWindow.noEscape
     *
     * Binds the ESC key to a function that always returns FALSE
     *
     * This prevents socket.io to break the connection with the server.
     */
    GameWindow.prototype.noEscape = function() {
        var frameDocument;
        // AddEventListener seems not to work
        // as it does not stop other listeners.
        window.document.onkeydown = function(e) {
            var keyCode = (window.event) ? event.keyCode : e.keyCode;
            if (keyCode === 27) return false;
        };
        frameDocument = this.getFrameDocument();
        if (frameDocument) frameDocument.onkeydown = window.document.onkeydown;
        this.conf.noEscape = true;
    };

    /**
     * ### GameWindow.restoreEscape
     *
     * Removes the the listener on the ESC key
     *
     * @see GameWindow.noEscape
     */
    GameWindow.prototype.restoreEscape = function() {
        var frameDocument;
        window.document.onkeydown = null;
        frameDocument = this.getFrameDocument();
        if (frameDocument) frameDocument.onkeydown = null;
        this.conf.noEscape = false;
    };

    /**
     * ### GameWindow.promptOnleave
     *
     * Displays a confirmation box upon closing the window or tab
     *
     * Listens on the onbeforeunload event.
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     * @param {string} text Optional. A text to be displayed with the alert
     *
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     */
    GameWindow.prototype.promptOnleave = function(windowObj, text) {
        windowObj = windowObj || window;
        text = 'undefined' !== typeof text ? text : this.conf.promptOnleaveText;

        windowObj.onbeforeunload = function(e) {
            e = e || window.event;
            // For IE<8 and Firefox prior to version 4
            if (e) {
                e.returnValue = text;
            }
            // For Chrome, Safari, IE8+ and Opera 12+
            return text;
        };

        this.conf.promptOnleave = true;
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
        this.conf.promptOnleave = false;
    };

    /**
     * ### GameWindow.disableRightClick
     *
     * Disables the right click in the main page and in the iframe, if found
     *
     * @see GameWindow.enableRightClick
     * @see JSUS.disableRightClick
     */
    GameWindow.prototype.disableRightClick = function() {
        if (this.frameElement) {
            J.disableRightClick(this.getFrameDocument());
        }
        J.disableRightClick(document);
        this.conf.rightClickDisabled = true;
    };

    /**
     * ### GameWindow.enableRightClick
     *
     * Enables the right click in the main page and in the iframe, if found
     *
     * @see GameWindow.disableRightClick
     * @see JSUS.enableRightClick
     */
    GameWindow.prototype.enableRightClick = function() {
        if (this.frameElement) {
             J.enableRightClick(this.getFrameDocument());
        }
        J.enableRightClick(document);
        this.conf.rightClickDisabled = false;
    };

    /**
     * ### GameWindow.disableBackButton
     *
     * Disables/re-enables backward navigation in history of browsed pages
     *
     * When disabling, it inserts twice the current url.
     *
     * @param {boolean} disable Optional. If TRUE disables back button,
     *   if FALSE, re-enables it. Default: TRUE.
     */
    GameWindow.prototype.disableBackButton = function(disable) {
        disable = 'undefined' === typeof disable ? true : disable;
        if (disable) {
            if (this.conf.backButtonDisabled) return;
            if (!history.pushState || !history.go) {
                node.warn('GameWindow.disableBackButton: method not ' +
                          'supported by browser.');
                return;
            }
            history.pushState(null, null, location.href);
            window.onpopstate = function(event) {
                history.go(1);
            };
        }
        else {
            if (!this.conf.backButtonDisabled) return;
            window.onpopstate = null;
        }
        this.conf.backButtonDisabled = !!disable;
    };

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
