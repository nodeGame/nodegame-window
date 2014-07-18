/**
 * # WaitScreen for nodeGame Window
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Covers the screen with a grey layer, disables inputs, and displays a message
 *
 * www.nodegame.org
 * ---
 */
(function(exports, window) {

    "use strict";

    // Append under window.node.
    exports.WaitScreen = WaitScreen;

    // ## Meta-data

    WaitScreen.version = '0.7.0';
    WaitScreen.description = 'Show a standard waiting screen';

    // Helper functions

    var inputTags, len;
    inputTags = ['button', 'select', 'textarea', 'input'];
    len = inputTags.length;

    /**
     * ### lockUnlockedInputs
     *
     * Scans a container HTML Element for active input tags and disables them
     *
     * Stores a references into W.waitScreen.lockedInputs so that they can
     * be re-activated later.
     *
     * @param {Document|Element} container The target to scan for input tags
     *  
     * @api private
     */
    function lockUnlockedInputs(container) {
        var j, i, inputs, nInputs;       
        for (j = -1; ++j < len; ) {
            inputs = container.getElementsByTagName(inputTags[j]);
            nInputs = inputs.length;
            for (i = -1 ; ++i < nInputs ; ) {
                if (!inputs[i].disabled) {
                    inputs[i].disabled = true;
                    W.waitScreen.lockedInputs.push(inputs[i]);
                }
            }
        }
    }

    function event_REALLY_DONE(text) {
        text = text || W.waitScreen.defaultTexts.waiting;
        if (W.isScreenLocked()) {
            W.waitScreen.updateText(text);
        }
        else {
            W.lockScreen(text);
        }
    }

    function event_STEPPING(text) {
        text = text || W.waitScreen.defaultTexts.stepping;
        if (W.isScreenLocked()) {
            W.waitScreen.updateText(text);
        }
        else {
            W.lockScreen(text);
        }
    }

    function event_PLAYING() {
        if (W.isScreenLocked()) {
            W.unlockScreen();
        }
    }

    function event_PAUSED(text) {
        text = text || W.waitScreen.defaultTexts.paused;
        if (W.isScreenLocked()) {
            W.waitScreen.beforePauseInnerHTML = 
                W.waitScreen.waitingDiv.innerHTML;
            W.waitScreen.updateText(text);
        }
        else {
            W.lockScreen(text);
        }            
    }

    function event_RESUMED() {
        if (W.isScreenLocked()) {
            if (W.waitScreen.beforePauseInnerHTML !== null) {
                W.waitScreen.updateText(W.waitScreen.beforePauseInnerHTML);
                W.waitScreen.beforePauseInnerHTML = null;
            }
            else {
                W.unlockScreen();
            }
        }
    }

    /**
     * ## WaitScreen constructor
     *
     * Instantiates a new WaitScreen object
     *
     * @param {object} options Optional. Configuration options.
     */
    function WaitScreen(options) {
        options = options || {};

        /**
         * ### WaitScreen.id
         *
         * The id of _waitingDiv_. Defaults, 'ng_waitScreen'
         *
         * @see WaitScreen.waitingDiv
         */
	this.id = options.id || 'ng_waitScreen';

        /**
         * ### WaitScreen.root
         *
         * Reference to the root element under which _waitingDiv is appended
         *
         * @see WaitScreen.waitingDiv
         */
        this.root = options.root || null;

        /**
         * ### WaitScreen.waitingDiv
         *
         * Reference to the HTML Element that actually locks the screen
         */
	this.waitingDiv = null;

        /**
         * ### WaitScreen.beforePauseText
         *
         * Flag if the screen should stay locked after a RESUMED event
         *
         * Contains the value of the innerHTML attribute of the waiting div
         */
        this.beforePauseInnerHTML = null;

        /**
         * ### WaitScreen.enabled
         *
         * Flag is TRUE if the listeners are registered 
         *
         * @see WaitScreen.enable
         */
        this.enabled = false;

        /**
         * ### WaitScreen.text
         *
         * Default texts for default events
         */
	this.defaultTexts = {
            waiting: options.waitingText ||
                'Waiting for other players to be done...',
            stepping: options.steppingText ||
                'Initializing game step, will be ready soon...',
            paused: options.pausedText ||
                'Game is paused. Please wait.'
        };

        /**
         * ## WaitScreen.lockedInputs
         *
         * List of locked inputs by the _lock_ method 
         *
         * @see WaitScreen.lock
         */
        this.lockedInputs = [];

        // Registers the event listeners.
        this.enable();
    }

    /**
     * ### WaitScreen.enable
     *
     * Register default event listeners
     */
    WaitScreen.prototype.enable = function() {
        if (this.enabled) return;
        node.events.ee.game.on('REALLY_DONE', event_REALLY_DONE);
        node.events.ee.game.on('STEPPING', event_STEPPING);
        node.events.ee.game.on('PLAYING', event_PLAYING);
        node.events.ee.game.on('PAUSED', event_PAUSED);
        node.events.ee.game.on('RESUMED', event_RESUMED);
        this.enabled = true;
    };

    /**
     * ### WaitScreen.disable
     *
     * Unregister default event listeners
     */
    WaitScreen.prototype.disable = function() {
        if (!this.enabled) return;
        node.events.ee.game.off('REALLY_DONE', event_REALLY_DONE);
        node.events.ee.game.off('STEPPING', event_STEPPING);
        node.events.ee.game.off('PLAYING', event_PLAYING);
        node.events.ee.game.off('PAUSED', event_PAUSED);
        node.events.ee.game.off('RESUMED', event_RESUMED);
        this.enabled = false;    
    };

    /**
     * ### WaitScreen.lock
     *
     * Locks the screen
     *
     * Overlays a grey div on top of the page and disables all inputs
     *
     * If called on an already locked screen, the previous text is destroyed.
     * Use `WaitScreen.updateText` to modify an existing text.
     *
     * @param {string} text Optional. If set, displays the text on top of the
     *   grey string
     *
     * @see WaitScreen.unlock
     * @see WaitScren.updateText
     */
    WaitScreen.prototype.lock = function(text) {
        var frameDoc;
        if ('undefined' === typeof document.getElementsByTagName) {
            node.warn('WaitScreen.lock: cannot lock inputs.');
        }
        // Disables all input forms in the page.        
        lockUnlockedInputs(document);
        frameDoc = W.getFrameDocument(); 
        if (frameDoc) lockUnlockedInputs(frameDoc);
        
        if (!this.waitingDiv) {
            if (!this.root) {
                this.root = W.getFrameRoot() || document.body;
            }
	    this.waitingDiv = W.addDiv(this.root, this.id);
	}
	if (this.waitingDiv.style.display === 'none') {
	    this.waitingDiv.style.display = '';
	}
	this.waitingDiv.innerHTML = text;        
    };

    /**
     * ### WaitScreen.unlock
     *
     * Removes the overlayed grey div and re-enables the inputs on the page
     *
     * @see WaitScreen.lock
     */
    WaitScreen.prototype.unlock = function() {
        var i, len;
        if (this.waitingDiv) {
            if (this.waitingDiv.style.display === '') {
                this.waitingDiv.style.display = 'none';
            }
        }
        // Re-enables all previously locked input forms in the page.        
        i = -1, len = this.lockedInputs.length;
        for ( ; ++i < len ; ) {
            this.lockedInputs[i].removeAttribute('disabled');            
        }
        this.lockedInputs = [];
    };

    /**
     * ### WaitScreen.updateText
     *
     * Updates the text displayed on the current waiting div
     *
     * @param {string} text The text to be displayed
     * @param {boolean} append Optional. If TRUE, the text is appended. By
     *   defaults the old text is replaced.
     */
    WaitScreen.prototype.updateText = function(text, append) {
        append = append || false;
        if ('string' !== typeof text) {
            throw new TypeError('WaitScreen.updateText: text must be string.');
        }
        if (append) {
            this.waitingDiv.appendChild(document.createTextNode(text));
        }
        else {
            this.waitingDiv.innerHTML = text;
        }
    };

    /**
     * ### WaitScreen.destroy
     *
     * Removes the waiting div from the HTML page and unlocks the screen
     *
     * @see WaitScreen.unlock
     */
    WaitScreen.prototype.destroy = function() {
        if (W.isScreenLocked()) {
            W.setScreenLevel('UNLOCKING');
            this.unlock();
            W.setScreenLevel('ACTIVE');
        }
        if (this.waitingDiv) {
            this.waitingDiv.parentNode.removeChild(this.waitingDiv);
        }
        // Removes previously registered listeners.
        this.disable();
    };

})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);
