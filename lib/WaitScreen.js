/**
 * # WaitScreen
 * Copyright(c) 2018 Stefano Balietti
 * MIT Licensed
 *
 * Overlays the screen, disables inputs, and displays a message/timer
 *
 * www.nodegame.org
 */
(function(exports, window) {

    "use strict";

    // Append under window.node.
    exports.WaitScreen = WaitScreen;

    // ## Meta-data

    WaitScreen.version = '0.9.0';
    WaitScreen.description = 'Shows a standard waiting screen';

    // ## Helper functions

    var inputTags, len;
    inputTags = [ 'button', 'select', 'textarea', 'input' ];
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
     * @param {boolean} disable Optional. Lock inputs if TRUE, unlock if FALSE.
     *   Default: TRUE
     *
     * @api private
     */
    function lockUnlockedInputs(container, disable) {
        var j, i, inputs, nInputs;

        if ('undefined' === typeof disable) disable = true;

        for (j = -1; ++j < len; ) {
            inputs = container.getElementsByTagName(inputTags[j]);
            nInputs = inputs.length;
            for (i = -1 ; ++i < nInputs ; ) {
                if (disable) {
                    if (!inputs[i].disabled) {
                        inputs[i].disabled = true;
                        W.waitScreen.lockedInputs.push(inputs[i]);
                    }
                }
                else {
                    if (inputs[i].disabled) {
                        inputs[i].disabled = false;
                    }
                }
            }
        }

        if (!disable) W.waitScreen.lockedInputs = [];
    }

    function event_REALLY_DONE(text) {
        var countdown;
        text = text || W.waitScreen.defaultTexts.waiting;
        if (!node.game.shouldStep()) {
            if (W.isScreenLocked()) {
                W.waitScreen.updateText(text);
            }
            else {
                if (node.game.timer.milliseconds) {
                    // 2000 to make sure it does reach 0 and stays there.
                    countdown = node.game.timer.milliseconds -
                        node.timer.getTimeSince('step', true) + 2000;
                    if (countdown < 0) countdown = 0;
                }
                W.lockScreen(text, countdown);
            }
        }
    }

    function event_STEPPING() {
        var text;
        text = W.waitScreen.defaultTexts.stepping;
        if (W.isScreenLocked()) W.waitScreen.updateText(text);
        else W.lockScreen(text);
    }

    function event_PLAYING() {
        if (W.isScreenLocked()) W.unlockScreen();
    }

    function event_PAUSED(text) {
        text = text || W.waitScreen.defaultTexts.paused;
        if (W.isScreenLocked()) {
            W.waitScreen.beforePauseInnerHTML =
                W.waitScreen.contentDiv.innerHTML;
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
     * @param {object} options Optional. Configuration options
     */
    function WaitScreen(options) {
        options = options || {};

        /**
         * ### WaitScreen.id
         *
         * The id of _waitingDiv_. Default: 'ng_waitScreen'
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
         * Contains the value of the innerHTML attribute of the waiting div.
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
         * ### WaitScreen.contentDiv
         *
         * Div containing the main content of the wait screen
         */
        this.contentDiv = null;

        /**
         * ### WaitScreen.countdownDiv
         *
         * Div containing the countdown span and other text
         *
         * @see WaitScreen.countdown
         * @see WaitScreen.countdownSpan
         */
        this.countdownDiv = null;

        /**
         * ### WaitScreen.countdownSpan
         *
         * Span containing a countdown timer for the max waiting
         *
         * @see WaitScreen.countdown
         * @see WaitScreen.countdownDiv
         */
        this.countdownSpan = null;

        /**
         * ### WaitScreen.countdown
         *
         * Countdown of max waiting time
         *
         * @see WaitScreen.countdown
         */
        this.countdown = null;

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
     * Registers default event listeners
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
     * Unregisters default event listeners
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
     * Overlays a gray div on top of the page and disables all inputs
     *
     * If called on an already locked screen, the previous text is destroyed.
     * Use `WaitScreen.updateText` to modify an existing text.
     *
     * @param {string} text Optional. If set, displays the text on top of the
     *   gray string
     * @param {number} countdown Optional. The expected max total time the
     *   the screen will stay locked (in ms). A countdown will be displayed,
     *   at the end of which a text replaces the countdown, but the screen
     *   stays locked until the unlock command is received.
     *
     * @see WaitScreen.unlock
     * @see WaitScren.updateText
     */
    WaitScreen.prototype.lock = function(text, countdown) {
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
            this.waitingDiv = W.add('div', this.root, this.id);

            this.contentDiv = W.add('div', this.waitingDiv,
                                    'ng_waitscreen-content-div');
        }
        if (this.waitingDiv.style.display === 'none') {
            this.waitingDiv.style.display = '';
        }
        this.contentDiv.innerHTML = text;

        if (countdown) {
            if (!this.countdownDiv) {
                this.countdownDiv = W.add('span', this.waitingDiv,
                                          'ng_waitscreen-countdown-div');
                this.countdownDiv.innerHTML = '<br>Do not refresh the page!' +
                    '<br>Maximum Waiting Time: ';

                this.countdownSpan = W.add('span', this.countdownDiv,
                                           'ng_waitscreen-countdown-span');
            }

            this.countdown = countdown;
            this.countdownSpan.innerHTML = formatCountdown(countdown);
            this.countdownDiv.style.display = '';

            this.countdownInterval = setInterval(function() {
                var w;
                w = W.waitScreen;
                if (!W.isScreenLocked()) {
                    clearInterval(w.countdownInterval);
                    return;
                }

                w.countdown -= 1000;
                if (w.countdown < 0) {
                    clearInterval(w.countdownInterval);
                    w.countdownDiv.innerHTML = '<br>Resuming soon...';
                }
                else {
                    w.countdownSpan.innerHTML = formatCountdown(w.countdown);
                }
            }, 1000);
        }
        else if (this.countdownDiv) {
            this.countdownDiv.style.display = 'none';
        }
    };

    /**
     * ### WaitScreen.unlock
     *
     * Removes the overlayed gray div and re-enables the inputs on the page
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
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        // Re-enables all previously locked input forms in the page.
        try {
            len = this.lockedInputs.length;
            for (i = -1 ; ++i < len ; ) {
                this.lockedInputs[i].removeAttribute('disabled');
            }
            this.lockedInputs = [];
        }
        catch(e) {
            // For IE8.
            lockUnlockedInputs(W.getIFrameDocument(W.getFrame()), false);
        }
    };

    /**
     * ### WaitScreen.updateText
     *
     * Updates the text displayed on the current waiting div
     *
     * @param {string} text The text to be displayed
     * @param {boolean} append Optional. If TRUE, the text is appended. By
     *   default the old text is replaced
     */
    WaitScreen.prototype.updateText = function(text, append) {
        append = append || false;
        if ('string' !== typeof text) {
            throw new TypeError('WaitScreen.updateText: text must be ' +
                                'string. Found: ' + text);
        }
        if (append) this.contentDiv.innerHTML += text;
        else this.contentDiv.innerHTML = text;
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
            // It might have gotten destroyed in the meantime.
            if (this.waitingDiv.parentNode) {
                this.waitingDiv.parentNode.removeChild(this.waitingDiv);
            }
        }
        // Removes previously registered listeners.
        this.disable();
    };


    // ## Helper functions.

    function formatCountdown(time) {
        var out;
        out = '';
        time = J.parseMilliseconds(time);
        if (time[2]) out += time[2] + ' min ';
        if (time[3]) out += time[3] + ' sec';
        return out || '-';
    }


})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);
