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

    InfoPanel.prototype.init = function(options) {
        this.infoPanelDiv = document.createElement('div');
        this.infoPanelDiv.id = 'ng_info-panel';

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

        if (!this.isVisible) {
            this.infoPanelDiv.style.display = 'none';
        }
        else {
            this.infoPanelDiv.style.display = 'block';
        }

        /**
         * ### InfoPanel.clearPattern
         *
         * String indicating when Info Panel should automatically clear
         *
         * Values:
         *
         *   - 'STEP': after each step,
         *   - 'STAGE': after each stage,
         *   - 'NONE' no auto clear (must be done manually)
         *
         * Default: 'NONE'
         */
        if ('undefined' === typeof options.clearPattern) {
            this.clearPattern = 'NONE';
        }
        else if ('STEP' === options.clearPattern ||
                 'STAGE' === options.clearPattern ||
                 'NONE' ===  options.clearPattern) {

            this.clearPattern = options.clearPattern;
        }
        else {
            throw new TypeError('InfoPanel constructor: options.clearPattern ' +
                                'must be string "STEP", "STAGE", "NONE", ' +
                                'or undefined. ' +
                                'Found: ' + options.clearPattern);
        }

    };

    /**
     * ### InfoPanel.clear
     *
     * Clears the content of the Info Panel
     */
    InfoPanel.prototype.clear = function() {
        return this.infoPanelDiv.innerHTML = '';
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
     */
    InfoPanel.prototype.destroy = function() {
        var i, len;
        if (this.infoPanelDiv.parentNode) {
            this.infoPanelDiv.parentNode.removeChild(this.infoPanelDiv);
        }
        this.infoPanelDiv = null;
        i = -1, len = this._buttons.length;
        for ( ; ++i < len ; ) {
            if (this._buttons[i].parentNode) {
                this._buttons[i].parentNode.removeChild(this._buttons[i]);
            }
        }
    };

    /**
     * ### InfoPanel.bindListener
     *
     *
     *
     * @see InfoPanel.clearPattern
     */
    InfoPanel.prototype.bindListener = function() {
        // first thing in body of page ? or below header ? or above main frame ?
        // STEPPING -- currently moving step
        // node.game.getRound('remaining')  === 0 or 1
        // that means its the last step of a stage
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
        if (this.isVisible) this.open();
        else this.close();
    };

    /**
     * ### InfoPanel.open
     *
     * Opens the Info Panel
     *
     * @see InfoPanel.toggle
     * @see InfoPanel.close
     * @see InfoPanel.isVisible
     */
    InfoPanel.prototype.open = function() {
        this.infoPanelDiv.style.display = 'block';
        this.isVisible = true;
    };

    /**
     * ### InfoPanel.close
     *
     * Closes the Info Panel
     *
     * @see InfoPanel.toggle
     * @see InfoPanel.open
     * @see InfoPanel.isVisible
     */
    InfoPanel.prototype.close = function() {
        this.infoPanelDiv.style.display = 'none';
        this.isVisible = false;
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
