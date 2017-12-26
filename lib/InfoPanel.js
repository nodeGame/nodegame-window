/**
 * # InfoPanel
 * Copyright(c) 2017 Stefano Balietti <ste@nodegame.org>
 * MIT Licensed
 *
 * Adds a configurable extra panel at the top of the screen
 *
 * InfoPanel is normally placed between header and main frame.
 *
 * www.nodegame.org
 */
(function(exports, window) {

    "use strict";

    exports.InfoPanel = InfoPanel;

    function InfoPanel(options) {
        this.init(options || {});
    }

    /**
     * ### InfoPanel.init
     *
     * Inits the Info panel
     *
     * @param {object} options Optional. Configuration options.
     *   Available options (defaults):
     *
     *    - 'className': a class name for the info panel div (''),
     *    - 'isVisible': if TRUE, the info panel is open immediately (false),
     *    - 'onStep:' an action to perform every new step (null),
     *    - 'onStage:' an action to perform every new stage (null).
     */
    InfoPanel.prototype.init = function(options) {
        var that;
        options = options || {};

        this.infoPanelDiv = document.createElement('div');
        this.infoPanelDiv.id = 'ng_info-panel';

        /**
         * ### InfoPanel.actionsLog
         *
         * Array containing the list of open/close events and a timestamp
         *
         * Entries in the actions log are objects: with keys 'create',
         * 'open', 'close', 'clear', 'destroy' and a timestamp.
         *
         * @see InfoPanel.open
         * @see InfoPanel.close
         */
        this.actionsLog = [];

        /**
         * ### InfoPanel._buttons
         *
         * Collection of buttons created via `createToggleButton` method
         *
         * @see InfoPanel.createToggleButton
         */
        this._buttons = [];

        /**
         * ### InfoPanel.className
         *
         * Class name of info panel
         *
         * Default: ''
         */
        if ('undefined' === typeof options.className) {
            this.infoPanelDiv.className = '';
        }
        else if ('string' === typeof options.className) {
            this.infoPanelDiv.className = options.className;
        }
        else {
            throw new TypeError('InfoPanel constructor: options.className ' +
                                'must be a string or undefined. ' +
                                'Found: ' + options.className);
        }

        /**
         * ### InfoPanel.isVisible
         *
         * Boolean indicating visibility of info panel div
         *
         * Default: FALSE
         */
        if ('undefined' === typeof options.isVisible) {
            this.isVisible = false;
        }
        else if ('boolean' === typeof options.isVisible) {
            this.isVisible = options.isVisible;
        }
        else {
            throw new TypeError('InfoPanel constructor: options.isVisible ' +
                                'must be a boolean or undefined. ' +
                                'Found: ' + options.isVisible);
        }

        this.infoPanelDiv.style.display = this.isVisible ? 'block' : 'none';
        this.actionsLog.push({ created: J.now() });

        /**
         * ### InfoPanel.onStep
         *
         * Performs an action ('clear', 'open', 'close') at every new step
         *
         * Default: null
         */
        if ('undefined' !== typeof options.onStep) {
            if ('open' === options.onStep ||
                'close' === options.onStep ||
                'clear' ===  options.onStep) {

                this.onStep = options.onStep;
            }
            else {
                throw new TypeError('InfoPanel constructor: options.onStep ' +
                                    'must be string "open", "close", "clear" ' +
                                    'or undefined. Found: ' + options.onStep);
            }
        }
        else {
            options.onStep = null;
        }

        /**
         * ### InfoPanel.onStage
         *
         * Performs an action ('clear', 'open', 'close') at every new stage
         *
         * Default: null
         */
        if ('undefined' !== typeof options.onStage) {
            if ('open' === options.onStage ||
                'close' === options.onStage ||
                'clear' ===  options.onStage) {

                this.onStage = options.onStage;
            }
            else {
                throw new TypeError('InfoPanel constructor: options.onStage ' +
                                    'must be string "open", "close", "clear" ' +
                                    'or undefined. Found: ' + options.onStage);
            }
        }
        else {
            options.onStage = null;
        }

        if (this.onStep || this.onStage) {
            that = this;
            node.events.game.on('STEPPING', function(curStep, newStep) {
                var newStage;
                newStage = curStep.stage !== newStep.stage;

                if ((that.onStep === 'close' && that.isVisible) ||
                    (newStage && that.onStage === 'close')) {

                    that.close();
                }
                else if (that.onStep === 'open' ||
                         (newStage && that.onStage === 'open')) {

                    that.open();
                }
                else if (that.onStep === 'clear' ||
                         (newStage && that.onStage === 'clear')) {

                    that.clear();
                }
            });
        }
    };

    /**
     * ### InfoPanel.clear
     *
     * Clears the content of the Info Panel
     */
    InfoPanel.prototype.clear = function() {
        this.infoPanelDiv.innerHTML = '';
        this.actionsLog.push({ clear: J.now() });
        W.adjustHeaderOffset(true);
    };

    /**
     * ### InfoPanel.getPanel
     *
     * Returns the HTML element of the panel (div)
     *
     * @return {HTMLElement} The Info Panel
     *
     * @see InfoPanel.infoPanelDiv
     */
    InfoPanel.prototype.getPanel = function() {
        return this.infoPanelDiv;
    };

    /**
     * ### InfoPanel.destroy
     *
     * Removes the Info Panel from the DOM and the internal references to it
     *
     * @see InfoPanel.infoPanelDiv
     * @see InfoPanel._buttons
     */
    InfoPanel.prototype.destroy = function() {
        var i, len;
        if (this.infoPanelDiv.parentNode) {
            this.infoPanelDiv.parentNode.removeChild(this.infoPanelDiv);
        }
        this.isVisible = false;
        this.actionsLog.push({ destroy: J.now() });
        this.infoPanelDiv = null;
        i = -1, len = this._buttons.length;
        for ( ; ++i < len ; ) {
            if (this._buttons[i].parentNode) {
                this._buttons[i].parentNode.removeChild(this._buttons[i]);
            }
        }
        W.adjustHeaderOffset(true);
    };

    /**
     * ### InfoPanel.toggle
     *
     * Toggles the visibility of the Info Panel
     *
     * @see InfoPanel.open
     * @see InfoPanel.close
     */
    InfoPanel.prototype.toggle = function() {
        if (this.isVisible) this.close();
        else this.open();
    };

    /**
     * ### InfoPanel.open
     *
     * Opens the Info Panel (if not already open)
     *
     * @see InfoPanel.toggle
     * @see InfoPanel.close
     * @see InfoPanel.isVisible
     */
    InfoPanel.prototype.open = function() {
        if (this.isVisible) return;
        this.actionsLog.push({ open: J.now() });
        this.infoPanelDiv.style.display = 'block';
        this.isVisible = true;
        // Must be at the end.
        W.adjustHeaderOffset(true);
    };

    /**
     * ### InfoPanel.close
     *
     * Closes the Info Panel (if not already closed)
     *
     * @see InfoPanel.toggle
     * @see InfoPanel.open
     * @see InfoPanel.isVisible
     */
    InfoPanel.prototype.close = function() {
        if (!this.isVisible) return;
        this.actionsLog.push({ close: J.now() });
        this.infoPanelDiv.style.display = 'none';
        this.isVisible = false;
        // Must be at the end.
        W.adjustHeaderOffset(true);
    };

    /**
     * ### InfoPanel.createToggleButton
     *
     * Creates an HTML button with a listener to toggle the InfoPanel
     *
     * Adds the button to the internal collection `_buttons`. All buttons
     * are destroyed if the Info Panel is destroyed.
     *
     * @return {HTMLElement} button A button that toggles info panel
     *
     * @see InfoPanel._buttons
     * @see InfoPanel.toggle
     */
    InfoPanel.prototype.createToggleButton = function(buttonLabel) {
        var that, button;

        buttonLabel = buttonLabel || 'Toggle Info Panel';
        if ('string' !== typeof buttonLabel || buttonLabel.trim() === '') {
            throw new Error('InfoPanel.createToggleButton: buttonLabel ' +
                            'must be undefined or a non-empty string. Found: ' +
                            buttonLabel);
        }
        button = document.createElement('button');
        button.className = 'btn btn-lg btn-warning';
        button.innerHTML = buttonLabel ;

        that = this;
        button.onclick = function() {
            that.toggle();
        };

        this._buttons.push(button);

        return button;
    };

})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);;
