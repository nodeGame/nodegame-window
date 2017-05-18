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
         * Default: false
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
         * String indicating when Info Panel should automatically clear:
         * either: 'STEP', 'STAGE', 'NONE'
         * (after each step, after each stage, or entirely manually)
         *
         * Default: 'NONE'
         */
        if ('undefined' === typeof options.clearPattern) {
            this.clearPattern = 'NONE';
        }
        else if ('string' === typeof options.clearPattern &&
                ['STEP', 'STAGE', 'NONE'].reduce(function(acc, value) {
                  return options.clearPattern === value;
                }, false)) {
            this.clearPattern = options.clearPattern;
        }
        else {
            throw new TypeError('InfoPanel constructor: options.clearPattern ' +
                                'must be string "STEP", "STAGE", "NONE", ' +
                                'or undefined. ' +
                                'Found: ' + options.clearPattern);
        }

    };

    InfoPanel.prototype.clear = function() {
        return this.infoPanelDiv.innerHTML = '';
    };

    InfoPanel.prototype.getPanel = function() {
        return this.infoPanelDiv;
    };

    InfoPanel.prototype.destroy = function() {
        if (this.infoPanelDiv.parentNode) {
            this.infoPanelDiv.parentNode.removeChild(this.infoPanelDiv);
        }

        this.infoPanelDiv = null;
    };

    InfoPanel.prototype.bindListener = function() {
        // first thing in body of page ? or below header ? or above main frame ?
        // STEPPING -- currently moving step
        // node.game.getRound('remaining')  === 0 or 1 that means its the last step of a stage
    };

    InfoPanel.prototype.toggle = function() {
      this.isVisible = !this.isVisible;

      console.log(this);

      if (this.isVisible) {
        this.open();
      }
      else {
        this.close();
      }
    };

    InfoPanel.prototype.open = function() {
      this.infoPanelDiv.style.display = 'block';
      this.isVisible = true;
    };

    InfoPanel.prototype.close = function() {
      this.infoPanelDiv.style.display = 'none';
      this.isVisible = false;
    };

    InfoPanel.prototype.createToggleButton = function(buttonLabel) {
        // return a button that toggles info panel
        var button;
        var that;

        that = this;

        button = document.createElement('button');
        button.className = 'btn btn-lg btn-warning';
        button.innerHTML = buttonLabel;

        button.onclick = function() {
          that.toggle();
        };

        return button;
    };

})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);;
