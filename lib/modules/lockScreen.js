/**
 * # lockScreen
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * Locks / Unlocks the screen
 *
 * The _screen_ represents all the user can see on screen.
 * It includes the _frame_ area, but also the _header_.
 *
 * http://www.nodegame.org
 */
(function(window, node) {

    "use strict";

    var GameWindow = node.GameWindow;
    var screenLevels = node.constants.screenLevels;

    /**
     * ### GameWindow.lockScreen
     *
     * Locks the screen by opening the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     *
     * @param {string} text Optional. The text to be shown in the locked screen
     * @param {number} countdown Optional. The expected max total time the
     *   the screen will stay locked (in ms). A countdown will be displayed
     *
     * @see WaitScreen.lock
     * TODO: check if this can be called in any stage.
     */
    GameWindow.prototype.lockScreen = function(text, countdown) {
        if (!this.waitScreen) {
            throw new Error('GameWindow.lockScreen: waitScreen not found');
        }
        if (text && 'string' !== typeof text) {
            throw new TypeError('GameWindow.lockScreen: text must be string ' +
                                'or undefined. Found: ' + text);
        }
        if (countdown && 'number' !== typeof countdown || countdown < 0) {
            throw new TypeError('GameWindow.lockScreen: countdown must be ' +
                                'a positive number or undefined. Found: ' +
                                countdown);
        }
        this.setScreenLevel('LOCKING');
        this.waitScreen.lock(text, countdown);
        this.setScreenLevel('LOCKED');
    };

    /**
     * ### GameWindow.unlockScreen
     *
     * Unlocks the screen by removing the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     */
    GameWindow.prototype.unlockScreen = function() {
        if (!this.waitScreen) {
            throw new Error('GameWindow.unlockScreen: waitScreen not found.');
        }
        if (!this.isScreenLocked()) {
            throw new Error('GameWindow.unlockScreen: screen is not locked.');
        }
        this.setScreenLevel('UNLOCKING');
        this.waitScreen.unlock();
        this.setScreenLevel('ACTIVE');
    };

    /**
     * ### GameWindow.isScreenLocked
     *
     * Checks whether the screen is locked
     *
     * @return {boolean} TRUE if the screen is locked
     *
     * @see GameWindow.screenState
     */
    GameWindow.prototype.isScreenLocked = function() {
        return this.getScreenLevel() !== screenLevels.ACTIVE;
    };
})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
