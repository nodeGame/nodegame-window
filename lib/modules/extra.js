/**
 * # extra
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow extras
 *
 * http://www.nodegame.org
 */
(function(window, node) {

    "use strict";

    var GameWindow = node.GameWindow;
    var J = node.JSUS;
    var DOM = J.get('DOM');

    /**
     * ### GameWindow.getScreen
     *
     * Returns the screen of the game, i.e. the innermost element
     * inside which to display content
     *
     * In the following order the screen can be:
     *
     * - the body element of the iframe
     * - the document element of the iframe
     * - the body element of the document
     * - the last child element of the document
     *
     * @return {Element} The screen
     */
    GameWindow.prototype.getScreen = function() {
        var el = this.getFrameDocument();
        if (el) {
            el = el.body || el;
        }
        else {
            el = document.body || document.lastElementChild;
        }
        return el;
    };

    /**
     * ### GameWindow.write
     *
     * Appends content inside a root element
     *
     * The content can be a text string, an HTML node or element.
     * If no root element is specified, the default screen is used.
     *
     * @param {string|object} text The content to write
     * @param {Element|string} root Optional. The root element or its id
     *
     * @return {string|object} The content written
     *
     * @see GameWindow.writeln
     */
    GameWindow.prototype.write = function(text, root) {
        if ('string' === typeof root) {
            root = this.getElementById(root);
        }
        else if (!root) {
            root = this.getScreen();
        }
        if (!root) {
            throw new
                Error('GameWindow.write: could not determine where to write.');
        }
        return DOM.write(root, text);
    };

    /**
     * ### GameWindow.writeln
     *
     * Appends content inside a root element followed by a break element
     *
     * The content can be a text string, an HTML node or element.
     * If no root element is specified, the default screen is used.
     *
     * @param {string|object} text The content to write
     * @param {Element|string} root Optional. The root element or its id
     *
     * @return {string|object} The content written
     *
     * @see GameWindow.write
     */
    GameWindow.prototype.writeln = function(text, root, br) {
        if ('string' === typeof root) {
            root = this.getElementById(root);
        }
        else if (!root) {
            root = this.getScreen();
        }
        if (!root) {
            throw new Error('GameWindow.writeln: ' +
                            'could not determine where to write.');
        }
        return DOM.writeln(root, text, br);
    };

    /**
     * ### GameWindow.generateUniqueId
     *
     * Generates a unique id
     *
     * Overrides JSUS.DOM.generateUniqueId.
     *
     * @param {string} prefix Optional. The prefix to use
     *
     * @return {string} The generated id
     *
     * @experimental
     * TODO: it is not always working fine.
     */
    GameWindow.prototype.generateUniqueId = function(prefix) {
        var id, found;

        id = '' + (prefix || J.randomInt(0, 1000));
        found = this.getElementById(id);

        while (found) {
            id = '' + prefix + '_' + J.randomInt(0, 1000);
            found = this.getElementById(id);
        }
        return id;
    };

    /**
     * ### GameWindow.toggleInputs
     *
     * Enables / disables the input forms
     *
     * If an id is provided, only input elements that are children
     * of the element with the specified id are toggled.
     *
     * If id is not given, it toggles the input elements on the whole page,
     * including the frame document, if found.
     *
     * If a state parameter is given, all the input forms will be either
     * disabled or enabled (and not toggled).
     *
     * @param {string} id Optional. The id of the element container
     *   of the forms. Default: the whole page, including the frame document
     * @param {boolean} disabled Optional. Forces all the inputs to be either
     *   disabled or enabled (not toggled)
     *
     * @return {boolean} FALSE, if the method could not be executed
     *
     * @see GameWindow.getFrameDocument
     * @see toggleInputs
     */
    GameWindow.prototype.toggleInputs = function(id, disabled) {
        var container;
        if (!document.getElementsByTagName) {
            node.err(
                'GameWindow.toggleInputs: getElementsByTagName not found.');
            return false;
        }
        if (id && 'string' === typeof id) {
            throw new Error('GameWindow.toggleInputs: id must be string or ' +
                            'undefined.');
        }
        if (id) {
            container = this.getElementById(id);
            if (!container) {
                throw new Error('GameWindow.toggleInputs: no elements found ' +
                                'with id ' + id + '.');
            }
            toggleInputs(disabled, container);
        }
        else {
            // The whole page.
            toggleInputs(disabled);
            if (this.isIE) {
                // IE < 10 (also 11?) gives 'Permission Denied'
                // if trying to access the iframeDoc from a stored reference.
                // We need to re-get it from the DOM.
                container = J.getIFrameDocument(this.getFrame());
            }
            else {
                container = this.getFrameDocument();
            }
            // If there is Frame apply it there too.
            if (container) {
                toggleInputs(disabled, container);
            }
        }
        return true;
    };

    /**
     * ### GameWindow.getScreenInfo
     *
     * Returns information about the screen in which nodeGame is running
     *
     * @return {object} A object containing the scren info
     */
    GameWindow.prototype.getScreenInfo = function() {
        var screen = window.screen;
        return {
            height: screen.height,
            widht: screen.width,
            availHeight: screen.availHeight,
            availWidth: screen.availWidht,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixedDepth
        };
    };

    /**
     * ### GameWindow.getLoadingDots
     *
     * Creates and returns a span element with incrementing dots inside
     *
     * New dots are added every second until the limit is reached, then it
     * starts from the beginning.
     *
     * Gives the impression of a loading time.
     *
     * @param {number} len Optional. The maximum length of the loading dots.
     *   Default: 5
     * @param {string} id Optional The id of the span
     *
     * @return {object} An object containing two properties: the span element
     *   and a method stop, that clears the interval
     */
    GameWindow.prototype.getLoadingDots = function(len, id) {
        var span_dots, i, limit, intervalId;
        if (len & len < 0) {
            throw new Error('GameWindow.getLoadingDots: len < 0.');
        }
        len = len || 5;
        span_dots = document.createElement('span');
        span_dots.id = id || 'span_dots';
        limit = '';
        for (i = 0; i < len; i++) {
            limit = limit + '.';
        }
        // Refreshing the dots...
        intervalId = setInterval(function() {
            if (span_dots.innerHTML !== limit) {
                span_dots.innerHTML = span_dots.innerHTML + '.';
            }
            else {
                span_dots.innerHTML = '.';
            }
        }, 1000);

        function stop() {
            span_dots.innerHTML = '.';
            clearInterval(intervalId);
        }

        return {
            span: span_dots,
            stop: stop
        };
    };

    /**
     * ### GameWindow.addLoadingDots
     *
     * Appends _loading dots_ to an HTML element
     *
     * By invoking this method you lose access to the _stop_ function of the
     * _loading dots_ element.
     *
     * @param {HTMLElement} root The element to which the loading dots will be
     *   appended
     * @param {number} len Optional. The maximum length of the loading dots.
     *   Default: 5
     * @param {string} id Optional The id of the span
     *
     * @return {object} The span with the loading dots
     *
     * @see GameWindow.getLoadingDots
     */
    GameWindow.prototype.addLoadingDots = function(root, len, id) {
        return root.appendChild(this.getLoadingDots(len, id).span);
    };

     /**
     * ### GameWindow.getEventButton
     *
     * Creates an HTML button element that will emit an event when clicked
     *
     * @param {string} event The event to emit when clicked
     * @param {string} text Optional. The text on the button
     * @param {string} id The id of the button
     * @param {object} attributes Optional. The attributes of the button
     *
     * @return {Element} The newly created button
     */
    GameWindow.prototype.getEventButton =
    function(event, text, id, attributes) {

        var b;
        if ('string' !== typeof event) {
            throw new TypeError('GameWindow.getEventButton: event must ' +
                                'be string.');
        }
        b = this.getButton(id, text, attributes);
        b.onclick = function() {
            node.emit(event);
        };
        return b;
    };

    /**
     * ### GameWindow.addEventButton
     *
     * Adds an EventButton to the specified root element
     *
     * If no valid root element is provided, it is append as last element
     * in the current screen.
     *
     * @param {string} event The event to emit when clicked
     * @param {string} text Optional. The text on the button
     * @param {Element} root Optional. The root element
     * @param {string} id The id of the button
     * @param {object} attributes Optional. The attributes of the button
     *
     * @return {Element} The newly created button
     *
     * @see GameWindow.getEventButton
     */
    GameWindow.prototype.addEventButton =
    function(event, text, root, id, attributes) {
        var eb;

        if (!event) return;
        if (!root) {
            root = this.getScreen();
        }

        eb = this.getEventButton(event, text, id, attributes);

        return root.appendChild(eb);
    };

    /**
     * ### GameWindow.setInnerHTML
     *
     * Replaces the innerHTML of the element/s with matching id or class name
     *
     * It locates all the elements with classname or id equal
     * to [prefix] + key and sets the innerHTML property accordintgly.
     *
     * @param {object} Elements defined as key-value pairs. If value is
     *    not a string or a number it will be skipped.
     * @param {string} prefix Optional. Prefix added in the search string.
     *    Default: 'ng_replace_'.
     */
    GameWindow.prototype.setInnerHTML = function(elements, prefix) {
        var el, name, text, search, len, i;

        if ('object' !== typeof elements) {
            throw new TypeError('GameWindow.setInnerHTML: elements must be ' +
                                'object.');
        }
        if (prefix) {
            if ('string' !== typeof prefix) {
                throw new TypeError('GameWindow.setInnerHTML: prefix must be ' +
                                    'string or undefined.');
            }
        }
        else {
            prefix = 'ng_replace_';
        }

        for (name in elements) {
            if (elements.hasOwnProperty(name)) {
                text = elements[name];
                // Only process strings.
                if ('string' !== typeof text && 'number' !== typeof text) {
                    node.warn('GameWindow.setInnerHTML: key "' + name +
                              '" does not contain a string value. Ignored.');
                }
                // Compose name with prefix and lower case.
                search = (prefix + name).toLowerCase();

                // Look by id.
                el = W.getElementById(search);
                if (el && el.className !== search) el.innerHTML = text;

                // Look by class name.
                el = W.getElementsByClassName(search);
                len = el.length;
                if (len) {
                    i = -1;
                    for ( ; ++i < len ; ) {
                        elements[i].innerHTML = text;
                    }
                }
            }
        }
    };

    /**
     * ## GameWindow.hide
     *
     * Gets and hides an HTML element
     *
     * Sets the style of the display to 'none'
     *
     * @param {string|HTMLElement} idOrObj The id of or the HTML element itself
     *
     * @return {HTMLElement} The hidden element, if found
     *
     * @see getElement
     */
    GameWindow.prototype.hide = function(idOrObj) {
        var el;
        el = getElement(idOrObj, 'GameWindow.hide');
        if (el) el.style.display = 'none';
        return el;
    };

    /**
     * ## GameWindow.show
     *
     * Gets and shows (makes visible) an HTML element
     *
     * Sets the style of the display to ''.
     *
     * @param {string|HTMLElement} idOrObj The id of or the HTML element itself
     * @param {string} display Optional. The value of the display attribute.
     *    Default: '' (empty string).
     *
     * @return {HTMLElement} The shown element, if found
     *
     * @see getElement
     */
    GameWindow.prototype.show = function(idOrObj, display) {
        var el;
        display = display || '';
        if ('string' !== typeof display) {
            throw new TypeError('GameWindow.show: display must be ' +
                                'string or undefined');
        }
        el = getElement(idOrObj, 'GameWindow.show');
        if (el) el.style.display = display;
        return el;
    };

   /**
     * ## GameWindow.toggle
     *
     * Gets and toggles the visibility of an HTML element
     *
     * Sets the style of the display to ''.
     *
     * @param {string|HTMLElement} idOrObj The id of or the HTML element itself
     * @param {string} display Optional. The value of the display attribute
     *    in case it will be set visible. Default: '' (empty string).
     *
     * @return {HTMLElement} The toggled element, if found
     *
     * @see getElement
     */
    GameWindow.prototype.toggle = function(idOrObj, display) {
        var el;
        el = getElement(idOrObj, 'GameWindow.toggle');
        if (el) {
            if (el.style.display === 'none') {
                display = display || '';
                if ('string' !== typeof display) {
                    throw new TypeError('GameWindow.toggle: display must ' +
                                        'be string or undefined');
                }
                el.style.display = display;
            }
            else {
                el.style.display = 'none';
            }
        }
        return el;
    };

    // ## Helper Functions

    /**
     * ### toggleInputs
     *
     * @api private
     */
    function toggleInputs(state, container) {
        var inputTags, j, len, i, inputs, nInputs;
        container = container || document;
        inputTags = ['button', 'select', 'textarea', 'input'];
        len = inputTags.length;
        for (j = 0; j < len; j++) {
            inputs = container.getElementsByTagName(inputTags[j]);
            nInputs = inputs.length;
            for (i = 0; i < nInputs; i++) {
                // Set to state, or toggle.
                if ('undefined' === typeof state) {
                    state = inputs[i].disabled ? false : true;
                }
                if (state) {
                    inputs[i].disabled = state;
                }
                else {
                    inputs[i].removeAttribute('disabled');
                }
            }
        }
    }

    /**
     * ### getElement
     *
     * Gets the element or returns it
     *
     * @param {string|HTMLElement} The id or the HTML element itself
     *
     * @return {HTMLElement} The HTML Element
     *
     * @see GameWindow.getElementById
     * @api private
     */
    function getElement(idOrObj, prefix) {
        var el;
        if ('string' === typeof idOrObj) {
            el = W.getElementById(idOrObj);
        }
        else if (J.isElement(idOrObj)) {
            el = idOrObj;
        }
        else {
            throw new TypeError(prefix + ': idOrObj must be string ' +
                                ' or HTML Element. Found: ' + idOrObj);
        }
        return el;
    }

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);


// GameWindow.prototype.setInnerHTML2 = function(elements, values) {
//     var el, i, len, res, lenValues;
//     res = true;
//     if ('string' === typeof elements) {
//         if ('string' !== typeof values) {
//             throw new TypeError('GameWindow.setInnerHTML: values must be ' +
//                                 'string, if elements is string.');
//         }
//         el = W.getElementById(elements);
//         if (el) el.innerHTML = values;
//         else res = false;
//     }
//     else if (J.isArray(elements)) {
//         if ('string' === typeof values) values = [values];
//         else if (!J.isArray(values) || !values.length) {
//             throw new TypeError('GameWindow.setInnerHTML: values must be ' +
//                                 'string or non-empty array, if elements ' +
//                                 'is string.');
//         }
//         i = -1, len = elements.length, lenValues = values.length;
//         for ( ; ++i < len ; ) {
//             el = W.getElementById(elements[i]);
//             if (el) el.innerHTML = values[i % lenValues];
//             else res = false;
//         }
//     }
//     else if ('object' === typeof elements) {
//         if ('undefined' !== typeof values) {
//             node.warn('GameWindow.setInnerHTML: elements is ' +
//                       'object, therefore values will be ignored.');
//         }
//         for (i in elements) {
//             if (elements.hasOwnProperty(i)) {
//                 el = W.getElementById(i);
//                 if (el) el.innerHTML = elements[i];
//                 else res = false;
//             }
//         }
//     }
//     else {
//         throw new TypeError('GameWindow.setInnerHTML: elements must be ' +
//                             'string, array, or object.');
//     }
//     return res;
// };
