/**
 * # lockScreen
 * Copyright(c) 2014 Stefano Balietti
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

    var J = node.JSUS;

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
     *
     * TODO: check if this can be called in any stage.
     */
    GameWindow.prototype.lockScreen = function(text) {
        var that;
        that = this;

        if (!this.waitScreen) {
            throw new Error('GameWindow.lockScreen: waitScreen not found.');
        }
        if (text && 'string' !== typeof text) {
            throw new TypeError('GameWindow.lockScreen: text must be string ' +
                                'or undefined');
        }
        // Feb 16.02.2015
        // Commented out the time-out part. It causes the browser to get stuck
        // on a locked screen, because the method is invoked multiple times.
        // If no further problem is found out, it can be eliminated.
        // if (!this.isReady()) {
        //   setTimeout(function() { that.lockScreen(text); }, 100);
        // }
        this.setScreenLevel('LOCKING');
        text = text || 'Screen locked. Please wait...';
        this.waitScreen.lock(text);
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
