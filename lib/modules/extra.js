/**
 * # extra
 * Copyright(c) 2023 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow extras
 *
 * http://www.nodegame.org
 */
(function(window, node) {

    "use strict";

    var GameWindow = node.GameWindow;
    var DOM = J.require('DOM');

    var G = G + '';

    // ### BASIC.

    /**
     * ### GameWindow.getScreen
     *
     * Returns the "screen" of the game
     *
     * i.e., the innermost element inside which to display content
     *
     * In the following order the screen can be:
     *
     * - the element with id "container" (presumably inside the iframe)
     * - the body element of the iframe
     * - the document element of the iframe
     * - the body element of the document
     * - the last child element of the document
     *
     * @return {Element} The screen
     */
    GameWindow.prototype.getScreen = function() {
        var el;
        el = this.gid('container');
        if (!el) {
            el = this.getFrameDocument();
            if (el) el = el.body || el;
            else el = document.body || document.lastElementChild;
        }
        return el;
    };

    /**
     * ### GameWindow.uniqueId|generateUniqueId
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
    GameWindow.prototype.uniqueId =
    GameWindow.prototype.generateUniqueId = function(prefix) {
        var id, found;

        id = '' + (prefix || J.randomInt(0, 1000));
        found = this.gid(id);

        while (found) {
            id = '' + prefix + '_' + J.randomInt(0, 1000);
            found = this.gid(id);
        }
        return id;
    };

    // ### WRITE TO SCREEN.

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
     * @see JSUS.write
     * @see GameWindow.writeln
     * @see getDefaultRoot
     */
    GameWindow.prototype.write = function(text, root) {
        root = getDefaultRoot(root, 'write');
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
     * @see JSUS.writeln
     * @see GameWindow.write
     * @see getDefaultRoot
     */
    GameWindow.prototype.writeln = function(text, root, br) {
        root = getDefaultRoot(root, 'writeln');
        return DOM.writeln(root, text, br);
    };

    /**
    * ### DOM.sprintf
    *
    * Builds up a decorated HTML text element
    *
    * Performs string substitution from an args object where the first
    * character of the key bears the following semantic:
    *
    * - '@': variable substitution with escaping
    * - '!': variable substitution without variable escaping
    * - '%': wraps a portion of string into a _span_ element to which is
    *        possible to associate a css class or id. Alternatively,
    *        it also possible to add in-line style. E.g.:
    *
    * ```javascript
    *      sprintf('%sImportant!%s An error has occurred: %pre@err%pre', {
    *              '%pre': {
    *                      style: 'font-size: 12px; font-family: courier;'
    *              },
    *              '%s': {
    *                      id: 'myId',
    *                      'class': 'myClass',
    *              },
    *              '@err': 'file not found',
    *      }, document.body);
    * ```
    *
    * Special span elements are %strong and %em, which add
    * respectively a _strong_ and _em_ tag instead of the default
    * _span_ tag. They cannot be styled.
    *
    * @param {string} string A text to transform
    * @param {object} args Optional. An object containing string
    *   transformations
    * @param {Element} root Optional. An HTML element to which append the
    *    string. Defaults, a new _span_ element
    *
    * @return {Element} The root element.
    */
    GameWindow.prototype.sprintf = function(string, args, root) {
        if (!root) root = getDefaultRoot(root, 'sprintf');
        return DOM.sprintf(string, args, root);
    };

    /**
     * ### GameWindo.add|append
     *
     * Creates and append an element with specified attributes to a root
     *
     * @param {string} name The name of the HTML tag
     * @param {HTMLElement} root The root element to which the new element
     *   will be appended
     * @param {object|string} options Optional. Object containing
     *   attributes for the element and rules about how to insert it relative
     *   to root. Available options: insertAfter, insertBefore (default:
     *   child of root). If string, it is the id of the element. Examples:
     *
     *
     * @see getDefaultRoot
     */
    GameWindow.prototype.add =
    GameWindow.prototype.append = function(el, root, opts) {
        if (!root) root = getDefaultRoot(root, 'add');
        return DOM.add(el, root, opts);
    };

    /**
     * ### GameWindow.searchReplace
     *
     * Replaces the innerHTML of the element/s with matching id or class name
     *
     * It iterates through each element and passes it to
     * `GameWindow.setInnerHTML`.
     *
     * If elements is array, each item in the array must be of the type:
     *
     * ```javascript
     *
     *   { search: 'key', replace: 'value' }
     *
     *   // or
     *
     *   { search: 'key', replace: 'value', mod: 'id' }
     * ```
     *
     * If elements is object, it must be of the type:
     *
     * ```javascript
     *
     *    {
     *      search1: value1, search2: value 2 // etc.
     *    }
     * ```
     *
     * It accepts a variable number of input parameters. The first is always
     * _elements_. If there are 2 input parameters, the second is _prefix_,
     * while if there are 3 input parameters, the second is _mod_ and the third
     * is _prefix_.
     *
     * @param {object|array} Elements to search and replace
     * @param {string} mod Optional. Modifier passed to GameWindow.setInnerHTML
     * @param {string} prefix Optional. Prefix added to the search string.
     *    Default: 'ng_replace_', null or '' equals no prefix.
     *
     * @see GameWindow.setInnerHTML
     */
    GameWindow.prototype.searchReplace = function() {
        var elements, mod, prefix;
        var name, len, i, el, rep;

        if (arguments.length === 2) {
            mod = 'g';
            prefix = arguments[1];
        }
        else if (arguments.length > 2) {
            mod = arguments[1];
            prefix = arguments[2];
        }

        if ('undefined' === typeof prefix) {
            prefix = 'ng_replace_';
        }
        else if (null === prefix) {
            prefix = '';
        }
        else if ('string' !== typeof prefix) {
            throw new TypeError(G + 'searchReplace: prefix must be string, ' +
                                'null or undefined. Found: ' + prefix);
        }

        elements = arguments[0];
        if (J.isArray(elements)) {
            i = -1, len = elements.length;
            for ( ; ++i < len ; ) {
                el = elements[i].search;
                if ('string' !== typeof el && 'number' !== typeof el) {
                    continue;
                }
                rep = elements[i].replace;
                if ('string' !== typeof rep && 'number' !== typeof rep) {
                    continue;
                }

                this.setInnerHTML(prefix + el,
                                  elements[i].replace,
                                  elements[i].mod || mod);
            }

        }
        else if ('object' === typeof elements) {
            for (name in elements) {
                if (elements.hasOwnProperty(name)) {
                    el = elements[name];
                    if ('string' !== typeof el && 'number' !== typeof el) {
                        node.warn(G + 'searchReplace: replace for key ' + name +
                                  ' is invalid. Found: ' + el);
                        continue;
                    }
                    this.setInnerHTML(prefix + name, el, mod);
                }
            }
        }
        else {
            throw new TypeError(G + 'setInnerHTML: elements must be ' +
                                'object or arrray. Found: ' + elements);
        }

    };

    /**
     * ### GameWindow.html|setInnerHTML
     *
     * Replaces the innerHTML of the element with matching id or class name
     *
     * @param {string|number} search Element id or className
     * @param {string|number} replace The new value of the property innerHTML
     * @param {string} mod Optional. A modifier defining how to use the
     *    search parameter. Values:
     *
     *    - 'id': replaces at most one element with the same id (default)
     *    - 'className': replaces all elements with same class name
     *    - 'g': replaces globally, both by id and className
     */
    GameWindow.prototype.setInnerHTML =
    GameWindow.prototype.html = function(search, replace, mod) {
        var el, i, len;

        // Only process strings or numbers.
        if ('string' !== typeof search && 'number' !== typeof search) {
            throw new TypeError(G + 'setInnerHTML: search must be ' +
                                'string or number. Found: ' + search +
                                " (replace = " + replace + ")");
        }

        // Only process strings or numbers.
        if ('string' !== typeof replace && 'number' !== typeof replace) {
            throw new TypeError(G + 'setInnerHTML: replace must be ' +
                                'string or number. Found: ' + replace +
                                " (search = " + search + ")");
        }

        if ('undefined' === typeof mod) {
            mod = 'id';
        }
        else if ('string' === typeof mod) {
            if (mod !== 'g' && mod !== 'id' && mod !== 'className') {
                throw new Error(G + 'setInnerHTML: invalid ' +
                                'mod value: ' + mod  +
                                " (search = " + search + ")");
            }
        }
        else {
            throw new TypeError(G + 'setInnerHTML: mod must be ' +
                                'string or undefined. Found: ' + mod  +
                                " (search = " + search + ")");
        }

        if (mod === 'id' || mod === 'g') {
            // Look by id.
            el = W.getElementById(search);
            if (el && el.className !== search) el.innerHTML = replace;
        }

        if (mod === 'className' || mod === 'g') {
            // Look by class name.
            el = W.getElementsByClassName(search);
            len = el.length;
            if (len) {
                i = -1;
                for ( ; ++i < len ; ) {
                    el[i].innerHTML = replace;
                }
            }
        }
    };

    // ### ADD STUFF: Event button, loading dots.

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
     * @param {string} id Optional. The id of the span
     *
     * @return {object} An object containing two properties: the span element
     *   and a method stop, that clears the interval
     */
    GameWindow.prototype.getLoadingDots = function(len, id) {
        var spanDots, counter, intervalId;
        if (len & len < 0) {
            throw new Error(G + 'getLoadingDots: len cannot be < 0. Found: ' +
                            len);
        }
        spanDots = document.createElement('span');
        spanDots.id = id || 'span_dots';
        // Refreshing the dots...
        counter = 0;
        len = len || 5;
        // So the height does not change.
        spanDots.innerHTML = '&nbsp;';
        intervalId = setInterval(function() {
            if (counter < len) {
                counter++;
                spanDots.innerHTML = spanDots.innerHTML + '.';
            }
            else {
                counter = 0;
                spanDots.innerHTML = '.';
            }
        }, 1000);

        function stop() {
            spanDots.innerHTML = '.';
            clearInterval(intervalId);
        }

        return {
            span: spanDots,
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
     * @return {object} An object containing two properties: the span element
     *   and a method stop, that clears the interval
     *
     * @see GameWindow.getLoadingDots
     */
    GameWindow.prototype.addLoadingDots = function(root, len, id) {
        var ld;
        ld = this.getLoadingDots(len, id);
        root.appendChild(ld.span);
        return ld;
    };

     /**
     * ### GameWindow.getEventButton
     *
     * Creates an HTML button element that will emit an event when clicked
     *
     * @param {string} event The event to emit when clicked
     * @param {string|object} attributes Optional. The attributes of the
     *   button, or if string the text to display inside the button.
     *
     * @return {Element} The newly created button
     *
     * @see GameWindow.get
     */
    GameWindow.prototype.getEventButton = function(event, attributes) {
        var b;
        if ('string' !== typeof event) {
            throw new TypeError(G + 'getEventButton: event must ' +
                                'be string. Found: ' + event);
        }
        if ('string' === typeof attributes) {
            attributes = { innerHTML: attributes };
        }
        else if (!attributes) {
            attributes = {};
        }
        if (!attributes.innerHTML) attributes.innerHTML = event;
        b = this.get('button', attributes);
        b.onclick = function() { node.emit(event); };
        return b;
    };

    /**
     * ### GameWindow.addEventButton
     *
     * Adds an EventButton to the specified root element
     *
     * @param {string} event The event to emit when clicked
     * @param {Element} root Optional. The root element. Default: last element
     * on the page
     * @param {string|object} attributes Optional. The attributes of the
     *   button, or if string the text to display inside the button.
     *
     * @return {Element} The newly created button
     *
     * @see GameWindow.get
     * @see GameWindow.getEventButton
     */
    GameWindow.prototype.addEventButton = function(event, root, attributes) {
        var eb;
        eb = this.getEventButton(event, attributes);
        if (!root) root = this.getScreen();
        return root.appendChild(eb);
    };

    // ### SHOWING, HIDING, TOGGLING.

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
            node.err(G + 'toggleInputs: getElementsByTagName not found');
            return false;
        }
        if (id && 'string' === typeof id) {
            throw new Error(G + 'toggleInputs: id must be string or ' +
                            'undefined. Found: ' + id);
        }
        if (id) {
            container = this.gid(id);
            if (!container) {
                throw new Error(G + 'toggleInputs: no elements found with id ' +
                                id);
            }
            toggleInputs(disabled, container);
        }
        else {
            // The whole page.
            toggleInputs(disabled);
            container = this.getFrameDocument();
            // If there is a frame, apply it there too.
            if (container) toggleInputs(disabled, container);
        }
        return true;
    };

    /**
     * ## GameWindow.hide
     *
     * Gets and hides an HTML element
     *
     * Sets the style of the display to 'none' and adjust the frame
     * height as necessary.
     *
     * @param {string|HTMLElement} idOrObj The id of or the HTML element itself
     *
     * @return {HTMLElement} The hidden element, if found
     *
     * @see getElement
     */
    GameWindow.prototype.hide = function(idOrObj) {
        var el;
        el = getElement(idOrObj, 'hide');
        if (el) {
            el.style.display = 'none';
            W.adjustFrameHeight(0, 0);
        }
        return el;
    };

    /**
     * ## GameWindow.show
     *
     * Gets and shows (makes visible) an HTML element
     *
     * Sets the style of the display to '' and adjust the frame height
     * as necessary.
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
            throw new TypeError(G + 'show: display must be ' +
                                'string or undefined. Found: ' + display);
        }
        el = getElement(idOrObj, 'show');
        if (el) {
            el.style.display = display;
            W.adjustFrameHeight(0, 0);
        }
        return el;
    };

   /**
     * ## GameWindow.toggle
     *
     * Gets and toggles the visibility of an HTML element
     *
     * Sets the style of the display to '' or 'none'  and adjust
     * the frame height as necessary.
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
        display = display || '';
        if ('string' !== typeof display) {
            throw new TypeError(G + 'toggle: display must ' +
                                'be string or undefined. Found: ' + display);
        }
        el = getElement(idOrObj, 'toggle');
        if (el) {
            if (el.style.display === 'none') el.style.display = display;
            else el.style.display = 'none';
            W.adjustFrameHeight(0, 0);
        }
        return el;
    };

    // ## Helper Functions

    /**
     * ### toggleInputs
     *
     * Enable/disable inputs: 'button', 'select', 'textarea', 'input'
     *
     * @param {boolean} state Optional. True/false to enable/disable, undefined
     *   to toggle.
     * @param {HTMLElement} container Optional. The element inside which
     *   toggling takes place. Default: `document`.
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
     * @param {string|HTMLElement} idOrObj The id or the HTML element itself
     * @param {string|undefined} throwAs Optional. The name of the calling
     *   method used in the string of the error, or undefined to avoid
     *   throwing altogether.
     *
     * @return {HTMLElement|undefined} The HTML Element or undefined if none
     *   is found and throwAs is falsy
     *
     * @see GameWindow.gid
     * @api private
     */
    function getElement(idOrObj, throwAs) {
        if ('string' === typeof idOrObj) return W.gid(idOrObj);
        if (J.isElement(idOrObj)) return idOrObj;
        if (throwAs) {
            throw new TypeError(G + throwAs + ': idOrObj must be string or ' +
                               'HTML Element. Found: ' + idOrObj);
        }
    }

    /**
     * ### getDefaultRoot
     *
     * Tries to find a default root and returns it
     *
     * @param {string|HTMLElement} root Optional. The id of or the HTML
     *   element itself to be used as root.
     * @param {string|undefined} throwAs Optional. The name of the calling
     *   method used in the string of the error, or undefined to avoid
     *   throwing altogether.
     *
     * @return {HTMLElement|undefined} The root HTML Element, or undefined
     *   if none is found and `throwAs` is falsy
     *
     * @see GameWindow.gid
     * @api private
     */
    function getDefaultRoot(root, throwAs) {
        if (!root) root = W.getScreen();
        else root = getElement(root);
        if (root) return root;
        if (thorwAs) throw new Error(G + throwAs + ': could not find root');
    }

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
