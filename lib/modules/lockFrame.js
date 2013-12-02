/**
 * # GameWindow selector module
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Utility functions to create and manipulate meaninful HTML select lists for
 * nodeGame.
 *
 * http://www.nodegame.org
 * ---
 */
(function(window, node) {

    "use strict";

    var J = node.JSUS;

    var GameWindow = node.GameWindow;
    
    /**
     * ### GameWindow.lockFrame
     *
     * Locks the frame by opening the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     *
     * @param {string} text Optional. The text to be shown in the locked frame
     *
     * TODO: check if this can be called in any stage.
     */
    GameWindow.prototype.lockFrame = function(text) {
        if (!this.waitScreen) {
            throw new Error('GameWindow.lockFrame: waitScreen not found.');
        }
        if (text && 'string' !== typeof text) {
            throw new TypeError('GameWindow.lockFrame: text must be string ' +
                                'or undefined');
        }
        this.setStateLevel('LOCKING');
        text = text || 'Screen locked. Please wait...';
        node.game.waitScreen.lock(text);
        this.setStateLevel('LOCKED');
    };

    /**
     * ### GameWindow.unlockFrame
     *
     * Unlocks the frame by removing the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     */
    GameWindow.prototype.unlockFrame = function() {
        if (!node.game.waitScreen) {
            throw new Error('GameWindow.unlockFrame: waitScreen not found.');
        }
        if (this.getStateLevel() !== windowLevels.LOCKED) {
            throw new Error('GameWindow.unlockFrame: frame is not locked.');
        }
        this.setStateLevel('UNLOCKING');
        node.game.waitScreen.unlock();
        this.setStateLevel('LOADED');
    };

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
