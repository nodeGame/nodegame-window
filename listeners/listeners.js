/**
 * # listeners
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow listeners
 *
 * www.nodegame.org
 */
(function(node) {

    "use strict";

    function getElement(idOrObj, prefix) {
        var el;
        if ('string' === typeof idOrObj) {
            el = W.getElementById(idOrObj);
            if (!el) {
                throw new Error(prefix + ': could not find element ' +
                                'with id ' + idOrObj);
            }
        }
        else if (JSUS.isElement(idOrObj)) {
            el = idOrObj;
        }
        else {
            throw new TypeError(prefix + ': idOrObj must be string ' +
                                ' or HTML Element.');
        }
        return el;
    }

    node.on('NODEGAME_GAME_CREATED', function() {
        W.init(node.conf.window);
    });

    node.on('HIDE', function(idOrObj) {
        var el = getElement(idOrObj, 'GameWindow.on.HIDE');
        el.style.display = 'none';
    });

    node.on('SHOW', function(idOrObj) {
        var el = getElement(idOrObj, 'GameWindow.on.SHOW');
        el.style.display = '';
    });

    node.on('TOGGLE', function(idOrObj) {
        var el = getElement(idOrObj, 'GameWindow.on.TOGGLE');

        if (el.style.display === 'none') {
            el.style.display = '';
        }
        else {
            el.style.display = 'none';
        }
    });

    // Disable all the input forms found within a given id element.
    node.on('INPUT_DISABLE', function(id) {
        W.toggleInputs(id, true);
    });

    // Disable all the input forms found within a given id element.
    node.on('INPUT_ENABLE', function(id) {
        W.toggleInputs(id, false);
    });

    // Disable all the input forms found within a given id element.
    node.on('INPUT_TOGGLE', function(id) {
        W.toggleInputs(id);
    });

    node.log('node-window: listeners added.');

})(
    'undefined' !== typeof node ? node : undefined
);
