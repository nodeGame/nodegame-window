(function(exports, window) {

    "use strict";

    exports.InfoPanel = InfoPanel;

    function InfoPanel(options) {
        this.init();
    }

    InfoPanel.prototype.init = function() {
        this.infoPanelDiv = document.createElement('div');
        this.infoPanelDiv.id = 'ng_info-panel';
    }

    InfoPanel.prototype.clear = function() {
        return this.infoPanelDiv.innerHTML = '';
    }

    InfoPanel.prototype.getPanel = function() {
        return this.infoPanelDiv;
    }

    InfoPanel.prototype.destroy = function() {
        if (this.infoPanelDiv.parentNode) {
            this.infoPanelDiv.parentNode.removeChild(this.infoPanelDiv);
        }

        this.infoPanelDiv = null;
    }

})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);;
