/**
 * # GameWindow
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow provides a handy API to interface nodeGame with the
 * browser window.
 *
 * Creates a custom root element inside the HTML page, and insert an
 * iframe element inside it.
 *
 * Dynamic content can be loaded inside the iframe without losing the
 * javascript state inside the page.
 *
 * Defines a number of profiles associated with special page layout.
 *
 * Depends on nodegame-client.
 * GameWindow.Table and GameWindow.List depend on NDDB and JSUS.
 * ---
 */
(function(window, node) {

    "use strict";

    var J = node.JSUS;

    var constants = node.constants;
    var windowLevels = constants.windowLevels;

    var Player = node.Player,
        PlayerList = node.PlayerList,
        GameMsg = node.GameMsg,
        GameMsgGenerator = node.GameMsgGenerator;

    var DOM = J.get('DOM');

    if (!DOM) {
        throw new Error('JSUS DOM object not found. Aborting');
    }

    GameWindow.prototype = DOM;
    GameWindow.prototype.constructor = GameWindow;

    // Configuration object
    GameWindow.defaults = {};

    // Default settings
    GameWindow.defaults.promptOnleave = true;
    GameWindow.defaults.noEscape = true;
    GameWindow.defaults.cacheDefaults = {
        loadCache:       true,
        storeCacheNow:   false,
        storeCacheLater: false
    };

    /**
     * ## GameWindow constructor
     *
     * Creates the GameWindow object.
     *
     * @see GameWindow.init
     */
    function GameWindow() {
        this.setStateLevel('UNINITIALIZED');

        if ('undefined' === typeof window) {
            throw new Error('nodeWindow: no DOM found. Are you in a browser?');
        }

        if ('undefined' === typeof node) {
            throw new Error('nodeWindow: nodeGame not found');
        }

        node.log('nodeWindow: loading...');

        // ## GameWindow properties

        /**
         * ### GameWindow.mainframe
         *
         * The name (and also id) of the iframe where the pages are loaded
         */
        this.mainframe = null;

        /**
         * ### GameWindow.frame
         *
         * A reference to the iframe document
         */
        this.frame = null;

        /**
         * ### GameWindow.root
         *
         * A reference to the top element in the iframe, usually the `body` tag
         */
        this.root = null;

        /**
         * ### GameWindow.conf
         *
         * Object containing the current configuration
         */
        this.conf = {};

        /**
         * ### GameWindow.areLoading
         *
         * The number of frames currently being loaded
         */
        this.areLoading = 0;

        /**
         * ### GameWindow.cache
         *
         * Cache for loaded iframes
         *
         * Maps URI to a cache object with the following properties:
         * - `contents` (the innerHTML property or null if not cached)
         * - optionally 'cacheOnClose' (a bool telling whether to cache
         *   the frame when it is replaced by a new one)
         */
        this.cache = {};

        /**
         * ### GameWindow.currentURIs
         *
         * Currently loaded URIs in the internal frames
         *
         * Maps frame names (e.g. 'mainframe') to the URIs they are showing.
         */
        this.currentURIs = {};


        /**
         * ### GameWindow.globalLibs
         *
         * Array of strings with the path of the libraries
         * to be loaded in every frame
         */
        this.globalLibs = [];

        /**
         * ### GameWindow.frameLibs
         *
         * The libraries to be loaded in specific frames
         *
         * Maps frame names to arrays of strings. These strings are the
         * libraries that should be loaded for a frame.
         *
         * @see GameWindow.globalLibs
         */
        this.frameLibs = {};

        /**
         * ### GameWindow.state
         *
         * The window's state level
         *
         * @see constants.windowLevels
         */
        this.state = null;

        this.init();
    }

    // ## GameWindow methods

    /**
     * ### GameWindow.init
     *
     * Sets global variables based on local configuration
     *
     * Defaults:
     *  - promptOnleave TRUE
     *  - captures ESC key
     *
     * @param {object} options Optional. Configuration options
     */
    GameWindow.prototype.init = function(options) {
        this.setStateLevel('INITIALIZING');
        options = options || {};
        this.conf = J.merge(GameWindow.defaults, options);

        this.mainframe = options.mainframe || 'mainframe';

        if (this.conf.promptOnleave) {
            this.promptOnleave();
        }
        else if (this.conf.promptOnleave === false) {
            this.restoreOnleave();
        }

        if (this.conf.noEscape) {
            this.noEscape();
        }
        else if (this.conf.noEscape === false) {
            this.restoreEscape();
        }
        this.setStateLevel('INITIALIZED');
    };

    /**
     * ### GameWindow.setStateLevel
     *
     * Validates and sets window's state level
     *
     * @param {string} level The level of the update
     *
     * @see constants.windowLevels
     */
    GameWindow.prototype.setStateLevel = function(level) {
        if ('string' !== typeof level) {
            throw new TypeError('GameWindow.setStateLevel: ' +
                                'level must be string');
        }
        if ('undefined' === typeof windowLevels[level]) {
            throw new Error('GameWindow.setStateLevel: unrecognized level.');
        }

        this.state = windowLevels[level];
    };

    /**
     * ### GameWindow.getStateLevel
     *
     * Returns the current state level
     *
     * @return {number} The state level
     *
     * @see constants.windowLevels
     */
    GameWindow.prototype.getStateLevel = function() {
        return this.state;
    };

    /**
     * ### GameWindow.getElementById
     *
     * Returns the element with the given id
     *
     * Looks first into the iframe and then into the rest of the page.
     *
     * @param {string} id The id of the element
     * @return {Element|null} The element in the page, or null if none is found
     *
     * @see GameWindow.getElementsByTagName
     */
    GameWindow.prototype.getElementById = function(id) {
        var el;

        el = null;
        if (this.frame && this.frame.getElementById) {
            el = this.frame.getElementById(id);
        }
        if (!el) {
            el = document.getElementById(id);
        }
        return el;
    };

    /**
     * ### GameWindow.getElementsByTagName
     *
     * Returns a list of elements with the given tag name
     *
     * Looks first into the iframe and then into the rest of the page.
     *
     * @param {string} tag The tag of the elements
     * @return {array|null} The elements in the page, or null if none is found
     *
     * @see GameWindow.getElementById
     */
    GameWindow.prototype.getElementsByTagName = function(tag) {
        return this.frame ?
            this.frame.getElementsByTagName(tag) :
            document.getElementsByTagName(tag);
    };

    /**
     * ### GameWindow.setup
     *
     * Sets up the page with a predefined configuration of widgets
     *
     * @param {string} type The type of page to setup ('MONITOR'|'PLAYER')
     */
    GameWindow.prototype.setup = function(type) {
        var initPage;

        if (!this.root) {
            this.root = document.body;
        }

        switch (type) {

        case 'MONITOR':

            node.widgets.append('NextPreviousState');
            node.widgets.append('GameSummary');
            node.widgets.append('StateDisplay');
            node.widgets.append('StateBar');
            node.widgets.append('DataBar');
            node.widgets.append('MsgBar');
            node.widgets.append('GameBoard');
            node.widgets.append('ServerInfoDisplay');
            node.widgets.append('Wall');

            // Add default CSS.
            if (node.conf.host) {
                this.addCSS(this.getFrameRoot(),
                            node.conf.host + '/stylesheets/monitor.css');
            }

            break;

        case 'PLAYER':

            this.generateHeader();

            node.game.visualState = node.widgets.append('VisualState',
                    this.header);
            node.game.timer = node.widgets.append('VisualTimer',
                    this.header);
            node.game.stateDisplay = node.widgets.append('StateDisplay',
                    this.header);

            // Will continue in SOLO_PLAYER.

        /* falls through */
        case 'SOLO_PLAYER':

            if (!this.getFrame()) {
                this.addIFrame(this.getFrameRoot(), this.mainframe);
                // At this point, there is no document in the iframe yet.
                this.frame = window.frames[this.mainframe];
                initPage = this.getBlankPage();
                if (this.conf.noEscape) {
                    // TODO: inject the no escape code here
                }
                window.frames[this.mainframe].src = initPage;
            }

            // Adding the WaitScreen.
            node.game.waitScreen = node.widgets.append('WaitScreen');

            // Add default CSS.
            if (node.conf.host) {
                this.addCSS(this.getFrameRoot(),
                            node.conf.host + '/stylesheets/player.css');
            }

            break;
        }

    };

    /**
     * ### removeLibraries
     *
     * Removes injected scripts from iframe
     *
     * Takes out all the script tags with the className "injectedlib"
     * that were inserted by injectLibraries.
     *
     * @param {NodeGameClient} frameNode The node object of the iframe
     *
     * @see injectLibraries
     *
     * @api private
     */
    function removeLibraries(frameNode) {
        var idx;
        var contentDocument;
        var scriptNodes, scriptNode;

        contentDocument = frameNode.contentDocument ?
            frameNode.contentDocument : frameNode.contentWindow.document;

        scriptNodes = contentDocument.getElementsByClassName('injectedlib');
        for (idx = 0; idx < scriptNodes.length; idx++) {
            scriptNode = scriptNodes[idx];
            scriptNode.parentNode.removeChild(scriptNode);
        }
    }


    /**
     * ### reloadScripts
     *
     * Reloads all script nodes in iframe
     *
     * Deletes and reinserts all the script tags, effectively reloading the
     * scripts. The placement of the tags can change, but the order is kept.
     *
     * @param {NodeGameClient} frameNode The node object of the iframe
     *
     * @api private
     */
    function reloadScripts(frameNode) {
        var contentDocument;
        var headNode;
        var tag, scriptNodes, scriptNodeIdx, scriptNode;
        var attrIdx, attr;

        contentDocument = frameNode.contentDocument ?
            frameNode.contentDocument : frameNode.contentWindow.document;

        headNode = contentDocument.getElementsByTagName('head')[0];

        scriptNodes = contentDocument.getElementsByTagName('script');
        for (scriptNodeIdx = 0; scriptNodeIdx < scriptNodes.length;
                scriptNodeIdx++) {

            // Remove tag:
            tag = scriptNodes[scriptNodeIdx];
            tag.parentNode.removeChild(tag);

            // Reinsert tag for reloading:
            scriptNode = document.createElement('script');
            if (tag.innerHTML) scriptNode.innerHTML = tag.innerHTML;
            for (attrIdx = 0; attrIdx < tag.attributes.length; attrIdx++) {
                attr = tag.attributes[attrIdx];
                scriptNode.setAttribute(attr.name, attr.value);
            }
            headNode.appendChild(scriptNode);
        }
    }


    /**
     * ### injectLibraries
     *
     * Injects scripts into the iframe
     *
     * First removes all old injected script tags.
     * Then injects `<script class="injectedlib" src="...">` lines into given
     * iframe object, one for every given library.
     *
     * @param {NodeGameClient} frameNode The node object of the iframe
     * @param {array} libs An array of strings giving the "src" attribute for
     *   the `<script>` lines to insert
     *
     * @api private
     */
    function injectLibraries(frameNode, libs) {
        var contentDocument;
        var headNode;
        var scriptNode;
        var libIdx, lib;

        contentDocument = frameNode.contentDocument ?
            frameNode.contentDocument : frameNode.contentWindow.document;

        headNode = contentDocument.getElementsByTagName('head')[0];

        for (libIdx = 0; libIdx < libs.length; libIdx++) {
            lib = libs[libIdx];
            scriptNode = document.createElement('script');
            scriptNode.className = 'injectedlib';
            scriptNode.src = lib;
            headNode.appendChild(scriptNode);
        }
    }


    /**
     * ### GameWindow.initLibs
     *
     * Specifies the libraries to be loaded automatically in the iframes
     *
     * This method must be called before any calls to GameWindow.loadFrame.
     *
     * @param {array} globalLibs Array of strings describing absolute library
     *   paths that should be loaded in every iframe
     * @param {object} frameLibs Map from URIs to string arrays (as above)
     *   specifying libraries that should only be loaded for iframes displaying
     *   the given URI. This must not contain any elements that are also in
     *   globalLibs.
     */
    GameWindow.prototype.initLibs = function(globalLibs, frameLibs) {
        this.globalLibs = globalLibs || [];
        this.frameLibs = frameLibs || {};
    };

    /**
     * ### GameWindow.preCache
     *
     * Loads the HTML content of the given URIs into the cache
     *
     * @param {array} uris The URIs to cache
     * @param {function} callback The function to call once the caching is done
     */
    GameWindow.prototype.preCache = function(uris, callback) {
        var that;
        var loadedCount;
        var currentUri, uriIdx;
        var iframe, iframeName;

        // Don't preload if no URIs are given:
        if (!uris || !uris.length) {
            if (callback) callback();
            return;
        }

        that = this;

        // Keep count of loaded URIs:
        loadedCount = 0;

        for (uriIdx = 0; uriIdx < uris.length; uriIdx++) {
            currentUri = uris[uriIdx];

            // Create an invisible internal frame for the current URI:
            iframe = document.createElement('iframe');
            iframe.style.visibility = 'hidden';
            iframeName = 'tmp_iframe_' + uriIdx;
            iframe.id = iframeName;
            iframe.name = iframeName;
            document.body.appendChild(iframe);

            // Register the onload handler:
            iframe.onload = (function(uri, thisIframe) {
                return function() {
                    var frameDocumentElement;

                    frameDocumentElement =
                        (thisIframe.contentDocument ?
                         thisIframe.contentDocument :
                         thisIframe.contentWindow.document)
                        .documentElement;

                    // Store the contents in the cache:
                    that.cache[uri] = {
                        contents: frameDocumentElement.innerHTML,
                        cacheOnClose: false
                    };

                    // Remove the internal frame:
                    document.body.removeChild(thisIframe);

                    // Increment loaded URIs counter:
                    loadedCount++;
                    if (loadedCount >= uris.length) {
                        // All requested URIs have been loaded at this point.
                        if (callback) callback();
                    }
                };
            })(currentUri, iframe);

            // Start loading the page:
            window.frames[iframeName].location = currentUri;
        }
    };


    /**
     * ### handleFrameLoad
     *
     * Handles iframe contents loading
     *
     * A helper method of GameWindow.loadFrame.
     * Puts cached contents into the iframe or caches new contents if requested.
     * Handles reloading of script tags and injected libraries.
     * Must be called with the current GameWindow instance.
     *
     * @param {GameWindow} that The GameWindow instance
     * @param {uri} uri URI to load
     * @param {string} frame ID of GameWindow's frame
     * @param {bool} loadCache Whether to load from cache
     * @param {bool} storeCache Whether to store to cache
     *
     * @see GameWindow.loadFrame
     *
     * @api private
     */
    function handleFrameLoad(that, uri, frame, loadCache, storeCache) {
        var frameNode;
        var frameDocumentElement;

        frameNode = document.getElementById(frame);
        frameDocumentElement =
            (frameNode.contentDocument ?
             frameNode.contentDocument : frameNode.contentWindow.document)
            .documentElement;

        if (loadCache) {
            // Load frame from cache:
            frameDocumentElement.innerHTML = that.cache[uri].contents;
        }

        // (Re-)Inject libraries and reload scripts:
        removeLibraries(frameNode);
        if (loadCache) {
            reloadScripts(frameNode);
        }
        injectLibraries(frameNode, that.globalLibs.concat(
                that.frameLibs.hasOwnProperty(uri) ? that.frameLibs[uri] : []));

        if (storeCache) {
            // Store frame in cache:
            that.cache[uri].contents = frameDocumentElement.innerHTML;
        }
    }

    var lockedUpdate = false;
    function updateAreLoading(update) {
        var that;
        if (!lockedUpdate) {
            lockedUpdate = true;
            this.areLoading = this.areLoading + update;
            lockedUpdate = false;
        }
        else {
            that = this;
            setTimeout(function() {
                updateAreLoading.call(that, update);
            }, 300);
        }
    }

    /**
     * ### GameWindow.loadFrame
     *
     * Loads content from an uri (remote or local) into the iframe,
     * and after it is loaded executes the callback function
     *
     * The third parameter is an options object with the following fields
     * (any fields left out assume the default setting):
     *
     *  - frame (string): The name of the frame in which to load the uri
     *    (default: default iframe of the game)
     *  - cache (object): Caching options.  Fields:
     *      * loadMode (string):
     *          'reload' (default; reload page without the cache),
     *          'cache' (get the page from cache if possible)
     *      * storeMode (string):
     *          'off' (default; don't cache page),
     *          'onLoad' (cache given page after it is loaded),
     *          'onClose' (cache given page after it is replaced by a new page)
     *
     * Warning: Security policies may block this method if the
     * content is coming from another domain.
     *
     * @param {string} uri The uri to load
     * @param {function} func The function to call once the DOM is ready
     * @param {object} opts The options object
     */
    GameWindow.prototype.loadFrame = function(uri, func, opts) {
        var that;
        var frame;
        var loadCache;
        var storeCacheNow, storeCacheLater;
        var iframe;
        var frameNode, frameDocumentElement, frameReady;
        var lastURI;

        if ('string' !== typeof uri) {
            throw new TypeError('GameWindow.loadFrame: uri must be string.');
        }
        this.setStateLevel('LOADING');

        that = this;

        // Default options:
        frame = this.mainframe;
        loadCache = GameWindow.defaults.cacheDefaults.loadCache;
        storeCacheNow = GameWindow.defaults.cacheDefaults.storeCacheNow;
        storeCacheLater = GameWindow.defaults.cacheDefaults.storeCacheLater;

        // Get options:
        if (opts) {
            if (opts.frame) frame = opts.frame;

            if (opts.cache) {
                if (opts.cache.loadMode === 'reload') loadCache = false;
                else if (opts.cache.loadMode === 'cache') loadCache = true;

                if (opts.cache.storeMode === 'off') {
                    storeCacheNow = false;
                    storeCacheLater = false;
                }
                else if (opts.cache.storeMode === 'onLoad') {
                    storeCacheNow = true;
                    storeCacheLater = false;
                }
                else if (opts.cache.storeMode === 'onClose') {
                    storeCacheNow = false;
                    storeCacheLater = true;
                }
            }
        }

        // Get the internal frame object:
        iframe = document.getElementById(frame);
        // Query readiness (so we know whether onload is going to be called):
        frameReady = iframe.contentWindow.document.readyState;
        // ...reduce it to a boolean:
        frameReady = frameReady === 'interactive' || frameReady === 'complete';

        // If the last frame requested to be cached on closing, do that:
        lastURI = this.currentURIs[frame];

        if (this.cache.hasOwnProperty(lastURI) &&
                this.cache[lastURI].cacheOnClose) {

            frameNode = document.getElementById(frame);
            frameDocumentElement =
                (frameNode.contentDocument ?
                 frameNode.contentDocument : frameNode.contentWindow.document)
                .documentElement;

            this.cache[lastURI].contents = frameDocumentElement.innerHTML;
        }

        // Create entry for this URI in cache object
        // and store cacheOnClose flag:
        if (!this.cache.hasOwnProperty(uri)) {
            this.cache[uri] = { contents: null, cacheOnClose: false };
        }
        this.cache[uri].cacheOnClose = storeCacheLater;

        // Disable loadCache if contents aren't cached:
        if (this.cache[uri].contents === null) loadCache = false;

        // Update frame's currently showing URI:
        this.currentURIs[frame] = uri;

        // Keep track of nested call to loadFrame.
        updateAreLoading.call(this, 1);

        // Add the onload event listener:
        iframe.onload = function() {
            handleFrameLoad(that, uri, frame, loadCache, storeCacheNow);
            that.updateLoadFrameState(func, frame);
        };

        // Cache lookup:
        if (loadCache) {
            // Load iframe contents at this point only if the iframe is already
            // "ready" (see definition of frameReady), otherwise the contents
            // would be cleared once the iframe becomes ready.  In that case,
            // iframe.onload handles the filling of the contents.
            // TODO: Fix code duplication between here and onload function.
            if (frameReady) {
                handleFrameLoad(this, uri, frame, loadCache, storeCacheNow);

                // Update status (onload not called if frame was already ready):
                this.updateLoadFrameState(func, frame);
            }
        }
        else {
            // Update the frame location:
            window.frames[frame].location = uri;
        }

        // Adding a reference to nodeGame also in the iframe
        window.frames[frame].window.node = node;
    };

    /**
     * ### GameWindow.loadFrameState
     *
     * Cleans up the window state after an iframe has been loaded
     *
     * The method performs the following operations:
     *
     *  - executes a given callback function
     *  - decrements the counter of loading iframes
     *  - set the window state as loaded (eventually)
     *
     * @param {function} Optional. A callback function
     * @param {object} The iframe of reference
     */
    GameWindow.prototype.updateLoadFrameState = function(func, frame) {
        // Update the reference to the frame obj
        this.frame = window.frames[frame].document;
        if (func) {
            func.call(node.game); // TODO: Pass the right this reference
        }

        updateAreLoading.call(this, -1);

        if (this.areLoading === 0) {
            this.setStateLevel('LOADED');
            node.emit('WINDOW_LOADED');
            // The listener will take care of emitting PLAYING,
            // if all conditions are met.
        }
        else {
            node.silly('GameWindow.updateState: ' + this.areLoading +
                       ' loadFrame processes open.');
        }
    };

    /**
     * ### GameWindow.getFrame
     *
     * Returns a reference to the frame (mainframe)
     *
     * @return {Element} The mainframe
     */
    GameWindow.prototype.getFrame = function() {
        return document.getElementById(this.mainframe);
    };

    /**
     * ### GameWindow.getFrameRoot
     *
     * Returns a reference to the root element in the iframe
     *
     * @return {Element} The root element in the iframe
     */
    GameWindow.prototype.getFrameRoot = function() {
        return this.root;
    };

    /**
     * ### GameWindow.getFrameRoot
     *
     * Returns a reference to the document object of the iframe
     *
     * @return {object} The document object of the iframe
     */
    GameWindow.prototype.getFrameDocument = function() {
        return this.frame;
    };

    /**
     * ### GameWindow.clearFrame
     *
     * Clear the content of the frame
     */
    GameWindow.prototype.clearFrame = function() {
        var mainframe;
        mainframe = this.getFrame();
        if (!mainframe) {
            throw new Error('GameWindow.clearFrame: cannot detect frame');
        }
        mainframe.onload = null;
        mainframe.src = 'about:blank';
    };

    /**
     * ### GameWindow.isReady
     *
     * Returns whether the GameWindow is ready
     *
     * Returns TRUE if the state is either INITIALIZED or LOADED.
     *
     * @return {boolean} Whether the window is ready
     */
    GameWindow.prototype.isReady = function() {
        return this.state === windowLevels.INITIALIZED ||
               this.state === windowLevels.LOADED;
    };

    /**
     * ### GameWindow.generateHeader
     *
     * Adds a container div with id 'gn_header' to the root element
     *
     * If a header element already exists, deletes its content
     * and returns it.
     *
     * @return {Element} The header element
     */
    GameWindow.prototype.generateHeader = function() {
        var root, header;
        header = this.getHeader();
        if (header) {
            header.innerHTML = '';
        }
        else {
            root = this.getFrameRoot();
            this.header = this.addElement('div', root, 'gn_header');
            header = this.header;
        }
        return header;
    };

    /**
     * ### GameWindow.getHeader
     *
     * Returns a reference to the header element, if defined
     *
     * @return {Element} The header element
     */
    GameWindow.prototype.getHeader = function() {
        return this.header;
    };


    // Overriding Document.write and DOM.writeln and DOM.write
    GameWindow.prototype._write = DOM.write;
    GameWindow.prototype._writeln = DOM.writeln;

    /**
     * ### GameWindow.write
     *
     * Appends content inside a root element
     *
     * The content can be a text string, an HTML node or element.
     * If no root element is specified, the default screen is used.
     *
     * @param {string|object} text The content to write
     * @param {Element} root The root element
     * @return {string|object} The content written
     *
     * @see GameWindow.writeln
     */
    GameWindow.prototype.write = function(text, root) {
        root = root || this.getScreen();
        if (!root) {
            throw new
                Error('GameWindow.write: could not determine where to write');
        }
        return this._write(root, text);
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
     * @param {Element} root The root element
     * @return {string|object} The content written
     *
     * @see GameWindow.write
     */
    GameWindow.prototype.writeln = function(text, root, br) {
        root = root || this.getScreen();
        if (!root) {
            throw new
                Error('GameWindow.writeln: could not determine where to write');
        }
        return this._writeln(root, text, br);
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
     * @param {string} id Optional The id of the span
     * @return {object} An object containing two properties: the span element
     *   and a method stop, that clears the interval.
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
     * ### GameWindow.toggleInputs
     *
     * Enables / disables the input forms
     *
     * If an id is provided, only children of the element with the specified
     * id are toggled.
     *
     * If id is given it will use _GameWindow.getFrameDocument()_ to determine the
     * forms to toggle.
     *
     * If a state parameter is given, all the input forms will be either
     * disabled or enabled (and not toggled).
     *
     * @param {string} id The id of the element container of the forms.
     * @param {boolean} state The state enabled / disabled for the forms.
     */
    GameWindow.prototype.toggleInputs = function(id, state) {
        var container, inputTags, j, len, i, inputs, nInputs;

        if ('undefined' !== typeof id) {
            container = this.getElementById(id);
            if (!container) {
                throw new Error('GameWindow.toggleInputs: no elements found ' +
                                'with id ' + id + '.');
            }
        }
        else {
            container = this.getFrameDocument();
            if (!container) {
                // No warning.
                return;
            }
        }

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
    };

    /**
     * ### GameWindow.lockFrame
     *
     * Locks the frame by opening the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     *
     * @param {string} text Optional. The text to be shown in the locked frame
     *
     * TODO: check if this can be called in any stage.
     */
    GameWindow.prototype.lockFrame = function(text) {
        if (!node.game.waitScreen) {
            throw new Error('GameWindow.lockFrame: waitScreen not found.');
        }
        if (text && 'string' !== typeof text) {
            throw new TypeError('GameWindow.lockFrame: text must be string ' +
                                'or undefined');
        }
        this.setStateLevel('LOCKING');
        text = text || 'Screen locked. Please wait...';
        node.game.waitScreen.lock(text);
        this.setStateLevel('LOCKED');
    };

    /**
     * ### GameWindow.unlockFrame
     *
     * Unlocks the frame by removing the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     */
    GameWindow.prototype.unlockFrame = function() {
        if (!node.game.waitScreen) {
            throw new Error('GameWindow.unlockFrame: waitScreen not found.');
        }
        if (this.getStateLevel() !== windowLevels.LOCKED) {
            throw new Error('GameWindow.unlockFrame: frame is not locked.');
        }
        this.setStateLevel('UNLOCKING');
        node.game.waitScreen.unlock();
        this.setStateLevel('LOADED');
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
     * ### GameWindow._generateRoot
     *
     * Creates a div element with the given id
     *
     * After creation it tries to append the element in the following order to:
     *
     *      - the specified root element
     *      - the body element
     *      - the last element of the document
     *
     * If it fails, it creates a new body element, appends it
     * to the document, and then appends the div element to it.
     *
     * @param {Element} root Optional. The root element
     * @param {string} id The id
     * @return {Element} The newly created root element
     *
     * @api private
     */
    GameWindow.prototype._generateRoot = function(root, id) {
        root = root || document.body || document.lastElementChild;
        if (!root) {
            this.addElement('body', document);
            root = document.body;
        }
        this.root = this.addElement('div', root, id);
        return this.root;
    };

    /**
     * ### GameWindow.generateNodeGameRoot
     *
     * Creates a div element with id 'nodegame'
     *
     * @param {Element} root Optional. The root element
     * @return {Element} The newly created element
     *
     * @see GameWindow._generateRoot()
     */
    GameWindow.prototype.generateNodeGameRoot = function(root) {
        return this._generateRoot(root, 'nodegame');
    };

    /**
     * ### GameWindow.generateRandomRoot
     *
     * Creates a div element with a unique random id
     *
     * @param {Element} root Optional. The root element
     * @return {Element} The newly created root element
     *
     * @see GameWindow._generateRoot()
     */
    GameWindow.prototype.generateRandomRoot = function(root) {
        return this._generateRoot(root, this.generateUniqueId());
    };



    // Useful

    /**
     * ### GameWindow.getEventButton
     *
     * Creates an HTML button element that will emit an event when clicked
     *
     * @param {string} event The event to emit when clicked
     * @param {string} text Optional. The text on the button
     * @param {string} id The id of the button
     * @param {object} attributes Optional. The attributes of the button
     * @return {Element} The newly created button
     */
    GameWindow.prototype.getEventButton =
    function(event, text, id, attributes) {
        var b;

        if (!event) return;

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


    // Useful API

    /**
     * ### GameWindow.getRecipientSelector
     *
     * Creates an HTML select element populated with the data of other players
     *
     * @param {string} id Optional. The id of the element
     * @return The newly created select element
     *
     * @see GameWindow.addRecipientSelector
     * @see GameWindow.addStandardRecipients
     * @see GameWindow.populateRecipientSelector
     *
     * TODO: add options to control which players/servers to add.
     */
    GameWindow.prototype.getRecipientSelector = function(id) {
        var toSelector;

        toSelector = document.createElement('select');
        if ('undefined' !== typeof id) {
            toSelector.id = id;
        }
        this.addStandardRecipients(toSelector);
        return toSelector;
    };

    /**
     * ### GameWindow.addRecipientSelector
     *
     * Appends a RecipientSelector element to the specified root element
     *
     * @param {Element} root The root element
     * @param {string} id The id of the selector
     * @return {boolean} FALSE if no valid root element is found, TRUE otherwise
     *
     * @see GameWindow.addRecipientSelector
     * @see GameWindow.addStandardRecipients
     * @see GameWindow.populateRecipientSelector
     *
     * TODO: adds options to control which players/servers to add.
     */
    GameWindow.prototype.addRecipientSelector = function(root, id) {
        var toSelector;

        if (!root) return false;
        toSelector = this.getRecipientSelector(id);
        return root.appendChild(toSelector);
    };

    /**
     * ### GameWindow.addStandardRecipients
     *
     * Adds an ALL and a SERVER option to a specified select element.
     *
     * @param {object} toSelector An HTML `<select>` element
     *
     * @see GameWindow.populateRecipientSelector
     *
     * TODO: adds options to control which players/servers to add.
     */
    GameWindow.prototype.addStandardRecipients = function(toSelector) {
        var opt;

        opt = document.createElement('option');
        opt.value = 'ALL';
        opt.appendChild(document.createTextNode('ALL'));
        toSelector.appendChild(opt);

        opt = document.createElement('option');
        opt.value = 'SERVER';
        opt.appendChild(document.createTextNode('SERVER'));
        toSelector.appendChild(opt);
    };

    /**
     * ### GameWindow.populateRecipientSelector
     *
     * Adds all the players from a specified playerList object to a given
     * select element
     *
     * @param {object} toSelector An HTML `<select>` element
     * @param {PlayerList} playerList The PlayerList object
     *
     * @see GameWindow.addStandardRecipients
     */
    GameWindow.prototype.populateRecipientSelector =
    function(toSelector, playerList) {
        var players, opt;

        if ('object' !== typeof playerList || 'object' !== typeof toSelector) {
            return;
        }

        this.removeChildrenFromNode(toSelector);
        this.addStandardRecipients(toSelector);

        // check if it is a DB or a PlayerList object
        players = playerList.db || playerList;

        J.each(players, function(p) {
            opt = document.createElement('option');
            opt.value = p.id;
            opt.appendChild(document.createTextNode(p.name || p.id));
            toSelector.appendChild(opt);
        });
    };

    /**
     * ### GameWindow.getActionSelector
     *
     * Creates an HTML select element with all the predefined actions
     * (SET,GET,SAY,SHOW*) as options
     *
     * @param {string} id The id of the selector
     * @return {Element} The newly created selector
     *
     * @see GameWindow.addActionSelector
     */
    GameWindow.prototype.getActionSelector = function(id) {
        var actionSelector = document.createElement('select');
        if ('undefined' !== typeof id) {
            actionSelector.id = id;
        }
        this.populateSelect(actionSelector, constants.action);
        return actionSelector;
    };

    /**
     * ### GameWindow.addActionSelector
     *
     * Appends an ActionSelector element to the specified root element
     *
     * @param {Element} root The root element
     * @param {string} id The id of the selector
     * @return {Element} The newly created selector
     *
     * @see GameWindow.getActionSelector
     */
    GameWindow.prototype.addActionSelector = function(root, id) {
        var actionSelector;

        if (!root) return;
        actionSelector = this.getActionSelector(id);
        return root.appendChild(actionSelector);
    };

    /**
     * ### GameWindow.getTargetSelector
     *
     * Creates an HTML select element with all the predefined targets
     * (HI,TXT,DATA, etc.) as options
     *
     * @param {string} id The id of the selector
     * @return {Element} The newly created selector
     *
     * @see GameWindow.addActionSelector
     */
    GameWindow.prototype.getTargetSelector = function(id) {
        var targetSelector;

        targetSelector = document.createElement('select');
        if ('undefined' !== typeof id ) {
            targetSelector.id = id;
        }
        this.populateSelect(targetSelector, constants.target);
        return targetSelector;
    };

    /**
     * ### GameWindow.addTargetSelector
     *
     * Appends a target selector element to the specified root element
     *
     * @param {Element} root The root element
     * @param {string} id The id of the selector
     * @return {Element} The newly created selector
     *
     * @see GameWindow.getTargetSelector
     */
    GameWindow.prototype.addTargetSelector = function(root, id) {
        if (!root) return;
        var targetSelector = this.getTargetSelector(id);
        return root.appendChild(targetSelector);
    };

    /**
     * ### GameWindow.getStateSelector
     *
     * Creates an HTML text input element where a nodeGame state can be inserted
     *
     * @param {string} id The id of the element
     * @return {Element} The newly created element
     *
     * @see GameWindow.addActionSelector
     *
     * TODO: This method should be improved to automatically
     *       show all the available states of a game.
     *
     * @experimental
     */
    GameWindow.prototype.getStateSelector = function(id) {
        return this.getTextInput(id);
    };

    /**
     * ### GameWindow.addStateSelector
     *
     * Appends a StateSelector to the specified root element
     *
     * @param {Element} root The root element
     * @param {string} id The id of the element
     * @return {Element} The newly created element
     *
     * @see GameWindow.getActionSelector
     *
     * @experimental
     */
    GameWindow.prototype.addStateSelector = function(root, id) {
        var stateSelector;

        if (!root) return;
        stateSelector = this.getStateSelector(id);
        return root.appendChild(stateSelector);
    };


    // Do we need it?

    /**
     * ### GameWindow.generateUniqueId
     *
     * Generates a unique id
     *
     * Overrides JSUS.DOM.generateUniqueId.
     *
     * @param {string} prefix Optional. A prefix to use
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

    // Where to place them?

    /**
     * ### GameWindow.noEscape
     *
     * Binds the ESC key to a function that always returns FALSE
     *
     * This prevents socket.io to break the connection with the server.
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     */
    GameWindow.prototype.noEscape = function(windowObj) {
        windowObj = windowObj || window;
        windowObj.document.onkeydown = function(e) {
            var keyCode = (window.event) ? event.keyCode : e.keyCode;
            if (keyCode === 27) {
                return false;
            }
        };
    };

    /**
     * ### GameWindow.restoreEscape
     *
     * Removes the the listener on the ESC key
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     *
     * @see GameWindow.noEscape()
     */
    GameWindow.prototype.restoreEscape = function(windowObj) {
        windowObj = windowObj || window;
        windowObj.document.onkeydown = null;
    };

    /**
     * ### GameWindow.promptOnleave
     *
     * Captures the onbeforeunload event and warns the user that leaving the
     * page may halt the game.
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     * @param {string} text Optional. A text to be displayed with the alert
     *
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     */
    GameWindow.prototype.promptOnleave = function(windowObj, text) {
        windowObj = windowObj || window;
        text = ('undefined' === typeof text) ? this.conf.textOnleave : text;
        windowObj.onbeforeunload = function(e) {
            e = e || window.event;
            // For IE<8 and Firefox prior to version 4
            if (e) {
                e.returnValue = text;
            }
            // For Chrome, Safari, IE8+ and Opera 12+
            return text;
        };
    };

    /**
     * ### GameWindow.restoreOnleave
     *
     * Removes the onbeforeunload event listener
     *
     * @param {object} windowObj Optional. The window container in which
     *   to bind the ESC key
     *
     * @see GameWindow.promptOnleave
     * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
     */
    GameWindow.prototype.restoreOnleave = function(windowObj) {
        windowObj = windowObj || window;
        windowObj.onbeforeunload = null;
    };

    // Do we need these?

    /**
     * ### GameWindow.getScreen
     *
     * Returns the screen of the game, i.e. the innermost element
     * inside which to display content
     *
     * In the following order the screen can be:
     *
     *      - the body element of the iframe
     *      - the document element of the iframe
     *      - the body element of the document
     *      - the last child element of the document
     *
     * @return {Element} The screen
     */
    GameWindow.prototype.getScreen = function() {
        var el = this.frame;
        if (el) {
            el = this.frame.body || el;
        }
        else {
            el = document.body || document.lastElementChild;
        }
        return el;
    };

    //Expose nodeGame to the global object
    node.window = new GameWindow();
    if ('undefined' !== typeof window) window.W = node.window;

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);

/**
 * # GameWindow listeners
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * www.nodegame.org
 * ---
 */
(function(node, window) {

    "use strict";

    function getElement(idOrObj, prefix) {
        var el;
        if ('string' === typeof idOrObj) {
            el = window.getElementById(idOrObj);
            if (!el) {
                throw new Error(prefix + ': could not find element ' +
                                'with id ' + idOrObj);
            }
        }
        else if (J.isElement(idOrObj)) {
            el = idOrObj;
        }
        else {
            throw new TypeError(prefix + ': idOrObj must be string ' +
                                ' or HTML Element.');
        }
        return el;
    }

    node.on('NODEGAME_GAME_CREATED', function() {
        window.init(node.conf.window);
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
        window.toggleInputs(id, true);
    });

    // Disable all the input forms found within a given id element.
    node.on('INPUT_ENABLE', function(id) {
        window.toggleInputs(id, false);
    });

    // Disable all the input forms found within a given id element.
    node.on('INPUT_TOGGLE', function(id) {
        window.toggleInputs(id);
    });

    node.log('node-window: listeners added.');

})(
    'undefined' !== typeof node ? node : undefined
 ,  'undefined' !== typeof node.window ? node.window : undefined
);
/**
 * # Canvas class for nodeGame window
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Creates an HTML canvas that can be manipulated by an api.
 *
 * www.nodegame.org
 * ---
 */
(function(exports) {

    "use strict";

    exports.Canvas = Canvas;

    function Canvas(canvas) {

        this.canvas = canvas;
        // 2D Canvas Context
        this.ctx = canvas.getContext('2d');

        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;

        this.width = canvas.width;
        this.height = canvas.height;
    }

    Canvas.prototype = {

        constructor: Canvas,

        drawOval: function (settings) {

            // We keep the center fixed
            var x = settings.x / settings.scale_x;
            var y = settings.y / settings.scale_y;

            var radius = settings.radius || 100;
            //console.log(settings);
            //console.log('X,Y(' + x + ', ' + y + '); Radius: ' + radius + ', Scale: ' + settings.scale_x + ',' + settings.scale_y);

            this.ctx.lineWidth = settings.lineWidth || 1;
            this.ctx.strokeStyle = settings.color || '#000000';

            this.ctx.save();
            this.ctx.scale(settings.scale_x, settings.scale_y);
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI*2, false);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        },

        drawLine: function (settings) {

            var from_x = settings.x;
            var from_y = settings.y;

            var length = settings.length;
            var angle = settings.angle;

            // Rotation
            var to_x = - Math.cos(angle) * length + settings.x;
            var to_y =  Math.sin(angle) * length + settings.y;
            //console.log('aa ' + to_x + ' ' + to_y);

            //console.log('From (' + from_x + ', ' + from_y + ') To (' + to_x + ', ' + to_y + ')');
            //console.log('Length: ' + length + ', Angle: ' + angle );

            this.ctx.lineWidth = settings.lineWidth || 1;
            this.ctx.strokeStyle = settings.color || '#000000';

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(from_x,from_y);
            this.ctx.lineTo(to_x,to_y);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        },

        scale: function (x,y) {
            this.ctx.scale(x,y);
            this.centerX = this.canvas.width / 2 / x;
            this.centerY = this.canvas.height / 2 / y;
        },

        clear: function() {
            this.ctx.clearRect(0, 0, this.width, this.height);
            // For IE
            var w = this.canvas.width;
            this.canvas.width = 1;
            this.canvas.width = w;
        }
    };

})(node.window);
/**
 * # HTMLRenderer
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Renders javascript objects into HTML following a pipeline
 * of decorator functions.
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
 * ---
 */
(function(exports, window, node) {

    "use strict";

    // ## Global scope

    var document = window.document,
    JSUS = node.JSUS;

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

        // ## Public properties

        // ### TriggerManager.options
        this.options = options || {};
        // ### HTMLRenderer.tm
        // TriggerManager instance
        this.tm = new TriggerManager();

        this.init(this.options);
    }

    //## HTMLRenderer methods

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
     *  var options = {
     *          returnAt: 'first', // or 'last'
     *          render: [ myFunc,
     *                            myFunc2
     *          ],
     *  }
     *
     * @param {object} options Optional. Configuration object
     *
     */
    HTMLRenderer.prototype.init = function (options) {
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
     *
     */
    HTMLRenderer.prototype.reset = function () {
        this.clear(true);
        this.addDefaultPipeline();
    };

    /**
     * ### HTMLRenderer.addDefaultPipeline
     *
     * Registers the set of default render functions
     *
     */
    HTMLRenderer.prototype.addDefaultPipeline = function() {
        this.tm.addTrigger(function(el){
            return document.createTextNode(el.content);
        });

        this.tm.addTrigger(function (el) {
            if (!el) return;
            if (el.content && 'object' === typeof el.content) {
                var div = document.createElement('div');
                for (var key in el.content) {
                    if (el.content.hasOwnProperty(key)) {
                        var str = key + ':\t' + el.content[key];
                        div.appendChild(document.createTextNode(str));
                        div.appendChild(document.createElement('br'));
                    }
                }
                return div;
            }
        });

        this.tm.addTrigger(function (el) {
            if (!el) return;
            if (el.content && el.content.parse && 'function' === typeof el.content.parse) {
                var html = el.content.parse();
                if (JSUS.isElement(html) || JSUS.isNode(html)) {
                    return html;
                }
            }
        });

        this.tm.addTrigger(function (el) {
            if (!el) return;
            if (JSUS.isElement(el.content) || JSUS.isNode(el.content)) {
                return el.content;
            }
        });
    };


    /**
     * ### HTMLRenderer.clear
     *
     * Deletes all registered render functions
     *
     * @param {boolean} clear TRUE, to confirm the clearing
     * @return {boolean} TRUE, if clearing is successful
     */
    HTMLRenderer.prototype.clear = function (clear) {
        return this.tm.clear(clear);
    };

    /**
     * ### HTMLRenderer.addRenderer
     *
     * Registers a new render function
     *
     * @param {function} renderer The function to add
     * @param {number} pos Optional. The position of the renderer in the pipeline
     * @return {boolean} TRUE, if insertion is successful
     */
    HTMLRenderer.prototype.addRenderer = function (renderer, pos) {
        return this.tm.addTrigger(renderer, pos);
    };

    /**
     * ### HTMLRenderer.removeRenderer
     *
     * Removes a render function from the pipeline
     *
     * @param {function} renderer The function to remove
     * @return {boolean} TRUE, if removal is successful
     */
    HTMLRenderer.prototype.removeRenderer = function (renderer) {
        return this.tm.removeTrigger(renderer);
    };

    /**
     * ### HTMLRenderer.render
     *
     * Runs the pipeline of render functions on a target object
     *
     * @param {object} o The target object
     * @return {object} The target object after exiting the pipeline
     *
     * @see TriggerManager.pullTriggers
     */
    HTMLRenderer.prototype.render = function (o) {
        return this.tm.pullTriggers(o);
    };

    /**
     * ### HTMLRenderer.size
     *
     * Counts the number of render functions in the pipeline
     *
     * @return {number} The number of render functions in the pipeline
     */
    HTMLRenderer.prototype.size = function () {
        return this.tm.triggers.length;
    };

    /**
     * # Entity
     *
     * Abstract representation of an HTML entity
     *
     */

    /**
     * ## Entity constructor
     *
     * Creates a new instace of Entity
     *
     * @param {object} The object to transform in entity
     */
    function Entity (e) {
        e = e || {};
        this.content = ('undefined' !== typeof e.content) ? e.content : '';
        this.className = ('undefined' !== typeof e.style) ? e.style : null;
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports, // Exports
    ('undefined' !== typeof window) ? window : module.parent.exports.window, // window
    ('undefined' !== typeof node) ? node : module.parent.exports.node // node
);
/**
 * # List class for nodeGame window
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Creates an HTML list that can be manipulated by an api. 
 *
 * www.nodegame.org
 * ---
 */
(function(exports, node) {

    "use strict";
    
    var JSUS = node.JSUS;
    var NDDB = node.NDDB;

    var HTMLRenderer = node.window.HTMLRenderer;
    var Entity = node.window.HTMLRenderer.Entity;
    
    exports.List = List;
    
    List.prototype = new NDDB();
    List.prototype.constructor = List;  
    
    function List(options, data) {
        options = options || {};
        this.options = options;
        
        NDDB.call(this, options, data); 
        
        this.id = options.id || 'list_' + Math.round(Math.random() * 1000);
        
        this.DL = null;
        this.auto_update = this.options.auto_update || false;
        this.htmlRenderer = null; 
        this.lifo = false;
        
        this.init(this.options);
    }
    
    // TODO: improve init
    List.prototype.init = function(options) {
        options = options || this.options;
        
        this.FIRST_LEVEL = options.first_level || 'dl';
        this.SECOND_LEVEL = options.second_level || 'dt';
        this.THIRD_LEVEL = options.third_level || 'dd';
        
        this.last_dt = 0;
        this.last_dd = 0;
        this.auto_update = ('undefined' !== typeof options.auto_update) ? options.auto_update
            : this.auto_update;
        
        var lifo = this.lifo = ('undefined' !== typeof options.lifo) ? options.lifo : this.lifo;
        
        this.globalCompare = function(o1, o2) {
            if (!o1 && !o2) return 0;
            if (!o2) return 1;
            if (!o1) return -1;

            // FIFO
            if (!lifo) {
                if (o1.dt < o2.dt) return -1;
                if (o1.dt > o2.dt) return 1;
            }
            else {
                if (o1.dt < o2.dt) return 1;
                if (o1.dt > o2.dt) return -1;
            }
            if (o1.dt === o2.dt) {
                if ('undefined' === typeof o1.dd) return -1;
                if ('undefined'=== typeof o2.dd) return 1;
                if (o1.dd < o2.dd) return -1;
                if (o1.dd > o2.dd) return 1;
                if (o1.nddbid < o2.nddbid) return 1;
                if (o1.nddbid > o2.nddbid) return -1;
            }
            return 0;
        }; 
        
        
        this.DL = options.list || document.createElement(this.FIRST_LEVEL);
        this.DL.id = options.id || this.id;
        if (options.className) {
            this.DL.className = options.className;
        }
        if (this.options.title) {
            this.DL.appendChild(document.createTextNode(options.title));
        }
        
        // was
        //this.htmlRenderer = new HTMLRenderer({renderers: options.renderer});
        this.htmlRenderer = new HTMLRenderer(options.render);
    };
    
    List.prototype._add = function(node) {
        if (!node) return;
        //              console.log('about to add node');
        //              console.log(node);
        this.insert(node);
        if (this.auto_update) {
            this.parse();
        }
    };
    
    List.prototype.addDT = function(elem, dt) {
        if ('undefined' === typeof elem) return;
        this.last_dt++;
        dt = ('undefined' !== typeof dt) ? dt: this.last_dt;  
        this.last_dd = 0;
        var node = new Node({dt: dt, content: elem});
        return this._add(node);
    };
    
    List.prototype.addDD = function(elem, dt, dd) {
        if ('undefined' === typeof elem) return;
        dt = ('undefined' !== typeof dt) ? dt: this.last_dt;
        dd = ('undefined' !== typeof dd) ? dd: this.last_dd++;
        var node = new Node({dt: dt, dd: dd, content: elem});
        return this._add(node);
    };
    
    List.prototype.parse = function() {
        this.sort();
        var old_dt = null;
        var old_dd = null;
        
        var appendDT = function() {
            var node = document.createElement(this.SECOND_LEVEL);
            this.DL.appendChild(node);
            old_dd = null;
            old_dt = node;
            return node;
        };
        
        var appendDD = function() {
            var node = document.createElement(this.THIRD_LEVEL);
            //                  if (old_dd) {
            //                          old_dd.appendChild(node);
            //                  }
            //                  else if (!old_dt) {
            //                          old_dt = appendDT.call(this);
            //                  }
            //                  old_dt.appendChild(node);
            this.DL.appendChild(node);
            //                  old_dd = null;
            //                  old_dt = node;
            return node;
        };
        
        // Reparse all every time
        // TODO: improve this
        if (this.DL) {
            while (this.DL.hasChildNodes()) {
                this.DL.removeChild(this.DL.firstChild);
            }
            if (this.options.title) {
                this.DL.appendChild(document.createTextNode(this.options.title));
            }
        }
        
        for (var i=0; i<this.db.length; i++) {
            var el = this.db[i];
            var node;
            if ('undefined' === typeof el.dd) {
                node = appendDT.call(this);
                //console.log('just created dt');
            }
            else {
                node = appendDD.call(this);
            }
            var content = this.htmlRenderer.render(el);
            node.appendChild(content);          
        }        
        return this.DL;
    };
    
    List.prototype.getRoot = function() {
        return this.DL;
    };
    
    // Cell Class
    Node.prototype = new Entity();
    Node.prototype.constructor = Node;
    
    function Node (node) {
        Entity.call(this, node);
        this.dt = ('undefined' !== typeof node.dt) ? node.dt : null;
        if ('undefined' !== typeof node.dd) {
            this.dd = node.dd;
        }
    }
    
})(
    ('undefined' !== typeof node) ? (('undefined' !== typeof node.window) ? node.window : node) : module.parent.exports, 
    ('undefined' !== typeof node) ? node : module.parent.exports
);

/**
 * # Table class for nodeGame window
 * Copyright(c) 2013 Stefano Balietti
 * MIT Licensed
 *
 * Creates an HTML table that can be manipulated by an api.
 *
 * www.nodegame.org
 * ---
 */
(function(exports, window, node) {

    "use strict";

    var document = window.document;

    exports.Table = Table;
    exports.Table.Cell = Cell;

    // For simple testing
    // module.exports = Table;

    var JSUS = node.JSUS;
    var NDDB = node.NDDB;
    var HTMLRenderer = node.window.HTMLRenderer;
    var Entity = node.window.HTMLRenderer.Entity;


    Table.prototype = JSUS.clone(NDDB.prototype);
    //Table.prototype = new NDDB();
    Table.prototype.constructor = Table;

    Table.H = ['x','y','z'];
    Table.V = ['y','x', 'z'];

    Table.log = node.log;

    function Table(options, data, parent) {
        options = options || {};

        Table.log = options.log || Table.log;
        this.defaultDim1 = options.defaultDim1 || 'x';
        this.defaultDim2 = options.defaultDim2 || 'y';
        this.defaultDim3 = options.defaultDim3 || 'z';

        this.table = options.table || document.createElement('table');
        this.id = options.id || 'table_' + Math.round(Math.random() * 1000);

        this.auto_update = ('undefined' !== typeof options.auto_update) ? options.auto_update : false;

        // Class for missing cells
        this.missing = options.missing || 'missing';
        this.pointers = {
            x: options.pointerX || 0,
            y: options.pointerY || 0,
            z: options.pointerZ || 0
        };

        this.header = [];
        this.footer = [];

        this.left = [];
        this.right = [];


        NDDB.call(this, options, data, parent);

        // From NDDB
        this.options = this.__options;
    }

    // TODO: improve init
    Table.prototype.init = function (options) {
        NDDB.prototype.init.call(this, options);

        options = options || this.options;
        if ('undefined' !== typeof options.id) {

            this.table.id = options.id;
            this.id = options.id;
        }
        if (options.className) {
            this.table.className = options.className;
        }
        this.initRenderer(options.render);
    };

    Table.prototype.initRenderer = function (options) {
        options = options || {};
        this.htmlRenderer = new HTMLRenderer(options);
        this.htmlRenderer.addRenderer(function(el) {
            if ('object' === typeof el.content) {
                var tbl = new Table();
                for (var key in el.content) {
                    if (el.content.hasOwnProperty(key)){
                        tbl.addRow([key,el.content[key]]);
                    }
                }
                return tbl.parse();
            }
        }, 2);
    };

    // TODO: make it 3D
    Table.prototype.get = function (x, y) {
        var out = this;
        if ('undefined' !== typeof x) {
            out = this.select('x','=',x);
        }
        if ('undefined' !== typeof y) {
            out = out.select('y','=',y);
        }

        return out.fetch();
    };

    Table.prototype.addClass = function (c) {
        if (!c) return;
        if (c instanceof Array) c = c.join(' ');
        this.forEach(function (el) {
            node.window.addClass(el, c);
        });

        if (this.auto_update) {
            this.parse();
        }

        return this;
    };

    // Depends on node.window
    Table.prototype.removeClass = function (c) {
        if (!c) return;

        var func;
        if (c instanceof Array) {
            func = function(el, c) {
                for (var i=0; i< c.length; i++) {
                    node.window.removeClass(el, c[i]);
                }
            };
        }
        else {
            func = node.window.removeClass;
        }

        this.forEach(function (el) {
            func.call(this,el,c);
        });

        if (this.auto_update) {
            this.parse();
        }

        return this;
    };

    Table.prototype._addSpecial = function (data, type) {
        if (!data) return;
        type = type || 'header';
        if ('object' !== typeof data) {
            return {content: data, type: type};
        }

        var out = [];
        for (var i=0; i < data.length; i++) {
            out.push({content: data[i], type: type});
        }
        return out;
    };


    Table.prototype.setHeader = function (header) {
        this.header = this._addSpecial(header);
    };

    Table.prototype.add2Header = function (header) {
        this.header = this.header.concat(this._addSpecial(header));
    };

    Table.prototype.setLeft = function (left) {
        this.left = this._addSpecial(left, 'left');
    };

    Table.prototype.add2Left = function (left) {
        this.left = this.left.concat(this._addSpecial(left, 'left'));
    };

    // TODO: setRight
    //Table.prototype.setRight = function (left) {
    //  this.right = this._addSpecial(left, 'right');
    //};

    Table.prototype.setFooter = function (footer) {
        this.footer = this._addSpecial(footer, 'footer');
    };

    Table._checkDim123 = function (dims) {
        var t = Table.H.slice(0);
        for (var i=0; i< dims.length; i++) {
            if (!JSUS.removeElement(dims[i],t)) return false;
        }
        return true;
    };

    /**
     * Updates the reference to the foremost element in the table.
     *
     * @param
     */
    Table.prototype.updatePointer = function (pointer, value) {
        if (!pointer) return false;
        if (!JSUS.in_array(pointer, Table.H)) {
            Table.log('Cannot update invalid pointer: ' + pointer, 'ERR');
            return false;
        }

        if (value > this.pointers[pointer]) {
            this.pointers[pointer] = value;
            return true;
        }

    };

    Table.prototype._add = function (data, dims, x, y, z) {
        if (!data) return false;
        if (dims) {
            if (!Table._checkDim123(dims)) {
                Table.log('Invalid value for dimensions. Accepted only: x,y,z.');
                return false;
            }
        }
        else {
            dims = Table.H;
        }

        var insertCell = function (content){
            //Table.log('content');
            //Table.log(x + ' ' + y + ' ' + z);
            //Table.log(i + ' ' + j + ' ' + h);

            var cell = {};
            cell[dims[0]] = i; // i always defined
            cell[dims[1]] = (j) ? y+j : y;
            cell[dims[2]] = (h) ? z+h : z;
            cell.content = content;
            //Table.log(cell);
            this.insert(new Cell(cell));
            this.updatePointer(dims[0],cell[dims[0]]);
            this.updatePointer(dims[1],cell[dims[1]]);
            this.updatePointer(dims[2],cell[dims[2]]);
        };

        // By default, only the second dimension is incremented
        x = x || this.pointers[dims[0]];
        y = y || this.pointers[dims[1]] + 1;
        z = z || this.pointers[dims[2]];

        if ('object' !== typeof data) data = [data];

        var cell = null;
        // Loop Dim1
        for (var i = 0; i < data.length; i++) {
            //Table.log('data_i');
            //Table.log(data[i]);
            if (data[i] instanceof Array) {
                // Loop Dim2
                for (var j = 0; j < data[i].length; j++) {
                    //Table.log(data[i]);
                    if (data[i][j] instanceof Array) {
                        //Table.log(data[i][j]);
                        //Table.log(typeof data[i][j]);
                        // Loop Dim3
                        for (var h = 0; h < data[i][j].length; h++) {
                            //Table.log('Here h');
                            insertCell.call(this, data[i][j][h]);
                        }
                        h=0; // reset h
                    }
                    else {
                        //Table.log('Here j');
                        insertCell.call(this, data[i][j]);
                    }
                }
                j=0; // reset j
            }
            else {
                //Table.log('Here i');
                insertCell.call(this, data[i]);
            }
        }

        //Table.log('After insert');
        //Table.log(this.db);

        // TODO: if coming from addRow or Column this should be done only at the end
        if (this.auto_update) {
            this.parse(true);
        }

    };

    Table.prototype.add = function (data, x, y) {
        if (!data) return;
        var cell = (data instanceof Cell) ? data : new Cell({
            x: x,
            y: y,
            content: data
        });
        var result = this.insert(cell);

        if (result) {
            this.updatePointer('x',x);
            this.updatePointer('y',y);
        }
        return result;
    };

    Table.prototype.addColumn = function (data, x, y) {
        if (!data) return false;
        return this._add(data, Table.V, x, y);
    };

    Table.prototype.addRow = function (data, x, y) {
        if (!data) return false;
        return this._add(data, Table.H, x, y);
    };

    //Table.prototype.bind = function (dim, property) {
    //this.binds[property] = dim;
    //};

    // TODO: Only 2D for now
    // TODO: improve algorithm, rewrite
    Table.prototype.parse = function () {

        // Create a cell element (td,th...)
        // and fill it with the return value of a
        // render value.
        var fromCell2TD = function (cell, el) {
            if (!cell) return;
            el = el || 'td';
            var TD = document.createElement(el);
            var content = this.htmlRenderer.render(cell);
            //var content = (!JSUS.isNode(c) || !JSUS.isElement(c)) ? document.createTextNode(c) : c;
            TD.appendChild(content);
            if (cell.className) TD.className = cell.className;
            return TD;
        };

        if (this.table) {
            while (this.table.hasChildNodes()) {
                this.table.removeChild(this.table.firstChild);
            }
        }

        var TABLE = this.table,
        TR,
        TD,
        i;

        // HEADER
        if (this.header && this.header.length > 0) {
            var THEAD = document.createElement('thead');
            TR = document.createElement('tr');
            // Add an empty cell to balance the left header column
            if (this.left && this.left.length > 0) {
                TR.appendChild(document.createElement('th'));
            }
            for (i=0; i < this.header.length; i++) {
                TR.appendChild(fromCell2TD.call(this, this.header[i],'th'));
            }
            THEAD.appendChild(TR);
            i=0;
            TABLE.appendChild(THEAD);
        }

        //console.log(this.table);
        //console.log(this.id);
        //console.log(this.db.length);

        // BODY
        if (this.length) {
            var TBODY = document.createElement('tbody');

            this.sort(['y','x']); // z to add first
            var trid = -1;
            // TODO: What happens if the are missing at the beginning ??
            var f = this.first();
            var old_x = f.x;
            var old_left = 0;

            for (i=0; i < this.db.length; i++) {
                //console.log('INSIDE TBODY LOOP');
                //console.log(this.id);
                if (trid !== this.db[i].y) {
                    TR = document.createElement('tr');
                    TBODY.appendChild(TR);
                    trid = this.db[i].y;
                    //Table.log(trid);
                    old_x = f.x - 1; // must start exactly from the first

                    // Insert left header, if any
                    if (this.left && this.left.length) {
                        TD = document.createElement('td');
                        //TD.className = this.missing;
                        TR.appendChild(fromCell2TD.call(this, this.left[old_left]));
                        old_left++;
                    }
                }

                // Insert missing cells
                if (this.db[i].x > old_x + 1) {
                    var diff = this.db[i].x - (old_x + 1);
                    for (var j=0; j < diff; j++ ) {
                        TD = document.createElement('td');
                        TD.className = this.missing;
                        TR.appendChild(TD);
                    }
                }
                // Normal Insert
                TR.appendChild(fromCell2TD.call(this, this.db[i]));

                // Update old refs
                old_x = this.db[i].x;
            }
            TABLE.appendChild(TBODY);
        }


        //FOOTER
        if (this.footer && this.footer.length > 0) {
            var TFOOT = document.createElement('tfoot');
            TR = document.createElement('tr');
            for (i=0; i < this.header.length; i++) {
                TR.appendChild(fromCell2TD.call(this, this.footer[i]));
            }
            TFOOT.appendChild(TR);
            TABLE.appendChild(TFOOT);
        }

        return TABLE;
    };

    Table.prototype.resetPointers = function (pointers) {
        pointers = pointers || {};
        this.pointers = {
            x: pointers.pointerX || 0,
            y: pointers.pointerY || 0,
            z: pointers.pointerZ || 0
        };
    };


    Table.prototype.clear = function (confirm) {
        if (NDDB.prototype.clear.call(this, confirm)) {
            this.resetPointers();
        }
    };

    // Cell Class
    Cell.prototype = new Entity();
    Cell.prototype.constructor = Cell;

    function Cell (cell){
        Entity.call(this, cell);
        this.x = ('undefined' !== typeof cell.x) ? cell.x : null;
        this.y = ('undefined' !== typeof cell.y) ? cell.y : null;
        this.z = ('undefined' !== typeof cell.z) ? cell.z : null;
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports, // Exports
    ('undefined' !== typeof window) ? window : module.parent.exports.window, // window
    ('undefined' !== typeof node) ? node : module.parent.exports.node // node
);