/**
 * # HTMLRenderer
 * Copyright(c) 2019 Stefano Balietti
 * MIT Licensed
 *
 * Renders javascript objects into HTML following a pipeline
 * of decorator functions
 *
 * The default pipeline always looks for a `content` property and
 * performs the following operations:
 *
 * - if it is already an HTML element, returns it;
 * - if it contains a  #parse() method, tries to invoke it to generate HTML;
 * - if it is an object, tries to render it as a table of key:value pairs;
 * - finally, creates an HTML text node with it and returns it
 *
 * Depends on the nodegame-client add-on TriggerManager
 *
 * www.nodegame.org
 */
(function(exports, window, node) {

    "use strict";

    // ## Global scope

    var document = window.document;

    var TriggerManager = node.TriggerManager;

    if (!TriggerManager) {
        throw new Error('HTMLRenderer requires node.TriggerManager to load.');
    }

    exports.HTMLRenderer = HTMLRenderer;
    exports.HTMLRenderer.Entity = Entity;

    /**
     * ## HTMLRenderer constructor
     *
     * Creates a new instance of HTMLRenderer
     *
     * @param {object} options A configuration object
     */
    function HTMLRenderer (options) {
        // ### HTMLRenderer.options
        this.options = options || {};

        // ### HTMLRenderer.tm
        // TriggerManager instance
        this.tm = new TriggerManager();

        this.init(this.options);
    }

    // ## HTMLRenderer methods

    /**
     * ### HTMLRenderer.init
     *
     * Configures the HTMLRenderer instance
     *
     * Takes the configuration as an input parameter or
     * recycles the settings in `this.options`.
     *
     * The configuration object is of the type
     *
     * ```
     * var options = {
     *     returnAt: 'first',  // or 'last'
     *     render: [ myFunc, myFunc2 ]
     * }
     * ```
     *
     * @param {object} options Optional. Configuration object
     */
    HTMLRenderer.prototype.init = function(options) {
        options = options || this.options;
        this.options = options;

        this.reset();

        if (options.returnAt) {
            this.tm.returnAt = options.returnAt;
        }

        if (options.pipeline) {
            this.tm.initTriggers(options.pipeline);
        }
    };



    /**
     * ### HTMLRenderer.reset
     *
     * Deletes all registered render function and restores the default
     * pipeline
     */
    HTMLRenderer.prototype.reset = function() {
        this.clear(true);
        this.addDefaultPipeline();
    };

    /**
     * ### HTMLRenderer.addDefaultPipeline
     *
     * Registers the set of default render functions
     */
    HTMLRenderer.prototype.addDefaultPipeline = function() {
        this.tm.addTrigger(function(el){
            return document.createTextNode(el.content);
        });

        this.tm.addTrigger(function(el) {
            var div, spanType, spanContent, span2, key, str;
            if (!el) return;
            if (el.content &&
                ('object' === typeof el.content ||
                 'function' === typeof el.content)) {

                div = document.createElement('div');
                spanType = W.add('span', div);
                spanType.innerHTML = typeof el.content;
                spanType.className = 'ng_clickable bold';

                spanContent = W.add('span', div);
                spanContent.style.display = 'none';
                spanContent.className = 'ng_clickable';

                if ('object' === typeof el.content) {
                    for (key in el.content) {
                        if (el.content.hasOwnProperty(key)) {
                            str = key + ':\t' + el.content[key];
                            spanContent.appendChild(
                                    document.createTextNode(str));
                            spanContent.appendChild(
                                    document.createElement('br'));
                        }
                    }
                }
                else {
                    spanContent.innerHTML = el.content.toString();
                }
                spanType.onclick = function() {
                    spanContent.style.display = '';
                    spanType.style.display = 'none';
                };

                spanContent.onclick = function() {
                    spanContent.style.display = 'none';
                    spanType.style.display = '';
                };

                return div;
            }
        });

        this.tm.addTrigger(function(el) {
            var html;
            if (!el) return;
            if (el.content && el.content.parse &&
                'function' === typeof el.content.parse) {

                html = el.content.parse();
                if (J.isElement(html) || J.isNode(html)) {
                    return html;
                }
            }
        });

        this.tm.addTrigger(function(el) {
            if (!el) return;
            if (J.isElement(el.content) || J.isNode(el.content)) {
                return el.content;
            }
        });
    };


    /**
     * ### HTMLRenderer.clear
     *
     * Deletes all registered render functions
     *
     * @param {boolean} clear Whether to confirm the clearing
     *
     * @return {boolean} TRUE, if clearing is successful
     */
    HTMLRenderer.prototype.clear = function(clear) {
        return this.tm.clear(clear);
    };

    /**
     * ### HTMLRenderer.addRenderer
     *
     * Registers a new render function
     *
     * @param {function} renderer The function to add
     * @param {number} pos Optional. The position of the renderer in the
     *   pipeline
     *
     * @return {boolean} TRUE, if insertion is successful
     */
    HTMLRenderer.prototype.addRenderer = function(renderer, pos) {
        return this.tm.addTrigger(renderer, pos);
    };

    /**
     * ### HTMLRenderer.removeRenderer
     *
     * Removes a render function from the pipeline
     *
     * @param {function} renderer The function to remove
     *
     * @return {boolean} TRUE, if removal is successful
     */
    HTMLRenderer.prototype.removeRenderer = function(renderer) {
        return this.tm.removeTrigger(renderer);
    };

    /**
     * ### HTMLRenderer.render
     *
     * Runs the pipeline of render functions on a target object
     *
     * @param {object} o The target object
     *
     * @return {object} The target object after exiting the pipeline
     *
     * @see TriggerManager.pullTriggers
     */
    HTMLRenderer.prototype.render = function(o) {
        return this.tm.pullTriggers(o);
    };

    /**
     * ### HTMLRenderer.size
     *
     * Counts the number of render functions in the pipeline
     *
     * @return {number} The number of render functions in the pipeline
     */
    HTMLRenderer.prototype.size = function() {
        return this.tm.triggers.length;
    };

    /**
     * # Entity
     *
     * Abstract representation of an HTML entity
     */

    /**
     * ## Entity constructor
     *
     * Creates a new instace of Entity
     *
     * An `Entity` is an abstract representation of an HTML element.
     *
     * May contains the following properties:
     *
     *   - `content` (that will be processed upon rendering),
     *   - `id` (if specified)
     *   - 'className` (if specified)
     *
     * @param {object} e The object to transform in entity
     */
    function Entity(o) {
        o = o || {};

        this.content = 'undefined' !== typeof o.content ? o.content : '';

        if ('string' === typeof o.id) {
            this.id = o.id;
        }
        else if ('undefined' !== typeof o.id) {
            throw new TypeError('Entity: id must ' +
                                'be string or undefined.');
        }
        if ('string' === typeof o.className) {
            this.className = o.className;
        }
        else if (J.isArray(o.className)) {
            this.className = o.join(' ');
        }
        else if ('undefined' !== typeof o.className) {
            throw new TypeError('Entity: className must ' +
                                'be string, array, or undefined.');
        }
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports,
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof node) ? node : module.parent.exports.node
);
