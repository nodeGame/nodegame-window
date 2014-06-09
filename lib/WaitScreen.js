/**
 * # WaitScreen for nodeGame Window
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Covers the screen with a grey layer and displays a message
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

    function event_REALLY_DONE(text) {
        text = text || W.waitScreen.text.waiting;
        if (W.isScreenLocked()) {
            W.waitScreen.updateText(text);
        }
        else {
            W.lockScreen(text);
        }
    }

    function event_STEPPING(text) {
        text = text || W.waitScreen.text.stepping;
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
        text = text || W.waitScreen.text.paused;
        W.lockScreen(text);
    }
    
    function event_RESUMED() {
        if (W.isScreenLocked()) {
            W.unlockScreen();
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
	this.id = options.id || 'ng_waitScreen';
        this.root = options.root || null;

	this.text = {
            waiting: options.waitingText ||
                'Waiting for other players to be done...',
            stepping: options.steppingText ||
                'Initializing game step, will be ready soon...',
            paused: options.pausedText ||
                'Game is paused. Please wait.'
        };
        
	this.waitingDiv = null;
        this.enable();
    }
    
    WaitScreen.prototype.lock = function(text) {
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

    WaitScreen.prototype.unlock = function() {
        if (this.waitingDiv) {
            if (this.waitingDiv.style.display === '') {
                this.waitingDiv.style.display = 'none';
            }
        }
    };

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

    WaitScreen.prototype.enable = function(disable) {
        if (disable === false || disable === null) {
            node.off('REALLY_DONE', event_REALLY_DONE);
            node.off('STEPPING', event_STEPPING);
            node.off('PLAYING', event_PLAYING);
            node.off('PAUSED', event_PAUSED);
            node.off('RESUMED', event_RESUMED);
        }
        else {
            node.on('REALLY_DONE', event_REALLY_DONE);
            node.on('STEPPING', event_STEPPING);
            node.on('PLAYING', event_PLAYING);
            node.on('PAUSED', event_PAUSED);
            node.on('RESUMED', event_RESUMED);
        }
    };

    WaitScreen.prototype.destroy = function() {
        if (W.isScreenLocked()) {
            this.unlock();
        }
        if (this.waitingDiv) {
            this.waitingDiv.parentNode.removeChild(this.waitingDiv);
        }
    };

})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);
