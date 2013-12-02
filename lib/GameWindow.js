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
 * Depends on JSUS and nodegame-client.
 * ---
 */
(function(window, node) {

    "use strict";

    var J = node.JSUS;

    if (!J) {
        throw new Error('GameWindow: JSUS object not found. Aborting');
    }

    var DOM = J.get('DOM');
    
    if (!DOM) {
        throw new Error('GameWindow: JSUS DOM object not found. Aborting.');
    }

    var constants = node.constants;
    var windowLevels = constants.windowLevels;


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
            throw new Error('GameWindow: no window found. Are you in a ' +
                            'browser?');
        }

        if ('undefined' === typeof node) {
            throw new Error('GameWindow: nodeGame not found');
        }

        node.log('node-window: loading...');

        // ## GameWindow properties

        /**
         * ### GameWindow.frameName
         *
         * The name (and also id) of the iframe where the pages are loaded
         */
        this.frameName = null;

        /**
         * ### GameWindow.frameElement
         *
         * A reference to the iframe object of type _HTMLIFrameElement_
         *
         * You can this element also by:
         *
         * - document.getElementById(this.frameName)
         *
         * This is the element that contains the _Window_ object of the iframe.
         *
         * @see this.frameName
         * @see this.frameWindow
         * @see this.frameDocument
         */
        this.frameElement = null;

        /**
         * ### GameWindow.frameWindow
         *
         * A reference to the iframe Window object
         *
         * You can get this element also by:
         *
         * - window.frames[this.frameName]
         */
        this.frameWindow = null;

        /**
         * ### GameWindow.frameDocument
         *
         * A reference to the iframe Document object
         *
         * You can get this element also by:
         *
         * - JSUS.getIFrameDocument(this.frameElement)
         *
         * @see this.frameElement
         * @see this.frameWindow
         */
        this.frameDocument = null;

        /**
         * ### GameWindow.root
         *
         * A reference to the HTML element to which the iframe is appended
         *
         * By default, this element is a reference to document.body.
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
         *
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

        /**
         * ### GameWindow.waitScreen
         *
         * Reference to the _WaitScreen_ widget, if one is appended in the page 
         *
         * @see node.widgets.WaitScreen
         */
        this.waitScreen = null;

        // Init.
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

        this.frameName = options.frameName || 'mainframe';

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
     * ### GameWindow.getFrame
     *
     * Returns a reference to the HTML element of the frame of the game
     *
     * @return {HTMLIFrameElement} The iframe element of the game
     */
    GameWindow.prototype.getFrame = function() {
        return this.frameElement ? this.frameElement :
            document.getElementById(this.frameName);
    };

    /**
     * ### GameWindow.getFrameWindow
     *
     * Returns a reference to the window object of the frame of the game
     *
     * @return {Window} The window object of the iframe of the game
     */
    GameWindow.prototype.getFrameWindow = function() {
        return this.frameWindow ? this.frameWindow :
            document.getElementById(this.frameName);
    };

    /**
     * ### GameWindow.getFrameDocument
     *
     * Returns a reference to the document object of the iframe
     *
     * @return {Document} The document object of the iframe of the game
     */
    GameWindow.prototype.getFrameDocument = function() {
        return this.frameDocument ? this.frameDocument : 
            this.getIFrameDocument(this.getFrame());
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
     * ### GameWindow.clearFrame
     *
     * Clear the content of the frame
     */
    GameWindow.prototype.clearFrame = function() {
        var iframe, frameName;
        iframe = this.getFrame();
        if (!iframe) {
            throw new Error('GameWindow.clearFrame: cannot detect frame.');
        }
        frameName = iframe.name || iframe.id;
        iframe.onload = null;
        iframe.src = 'about:blank';
        this.frameElement = iframe;
        this.frameWindow = window.frames[frameName];
        this.frameDocument = W.getIFrameDocument(iframe);
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

                this.frameObj = this.addIFrame(this.getFrameRoot(),
                                               this.frameName);

                this.frameDocument = this.getIFrameDocument(this.frameObj);

                // Ste 1 Dec. was:
                // // At this point, there is no document in the iframe yet.
                // this.frame = window.frames[this.frameName];

                initPage = this.getBlankPage();
                if (this.conf.noEscape) {
                    // TODO: inject the no escape code here
                }
                window.frames[this.frameName].src = initPage;
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
     * @param {HTMLIFrameElement} iframe The target iframe
     *
     * @see injectLibraries
     *
     * @api private
     */
    function removeLibraries(iframe) {
        var idx;
        var contentDocument;
        var scriptNodes, scriptNode;

        contentDocument = W.getIFrameDocument(iframe);

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
     * @param {HTMLIFrameElement} iframe The target iframe
     *
     * @api private
     */
    function reloadScripts(iframe) {
        var contentDocument;
        var headNode;
        var tag, scriptNodes, scriptNodeIdx, scriptNode;
        var attrIdx, attr;

        contentDocument = W.getIFrameDocument(iframe);

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
     * @param {HTMLIFrameElement} iframe The target iframe
     * @param {array} libs An array of strings giving the "src" attribute for
     *   the `<script>` lines to insert
     *
     * @api private
     */
    function injectLibraries(iframe, libs) {
        var contentDocument;
        var headNode;
        var scriptNode;
        var libIdx, lib;

        contentDocument = W.getIFrameDocument(iframe);

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
     * Loads the HTML content of the given URI(s) into the cache
     *
     * @param {string|array} uris The URI(s) to cache
     * @param {function} callback Optional. The function to call once the
     *   caching is done
     */
    GameWindow.prototype.preCache = function(uris, callback) {
        var that;
        var loadedCount;
        var currentUri, uriIdx;
        var iframe, iframeName;

        if ('string' === typeof uris) {
            uris = [ uris ];
        }

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
            iframe.style.display = 'none';
            iframeName = 'tmp_iframe_' + uriIdx;
            iframe.id = iframeName;
            iframe.name = iframeName;
            document.body.appendChild(iframe);

            // Register the onload handler:
            iframe.onload = (function(uri, thisIframe) {
                return function() {
                    var frameDocumentElement;

                    frameDocumentElement = W.getIFrameDocument(thisIframe)
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
     * ### GameWindow.clearCache
     *
     * Empties the cache
     */
    GameWindow.prototype.clearCache = function() {
        this.cache = {};
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
        frameDocumentElement = W.getIFrameDocument(frameNode).documentElement;

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

// THIS CONTAINS CODE TO PERFORM TO CATCH THE ONLOAD EVENT UNDER DIFFERENT
// BROWSERS

//    var onLoad, detach, completed;
//
//    var iframeTest = document.createElement('iframe');
//    iframe.style.display = 'none';
//    document.body.appendChild(iframeTest);
//    
//    // The ready event handler.
//    completed = function(event) {
//
//	// readyState === "complete" works also in oldIE.
//	if (document.addEventListener || 
//            event.type === "load" || 
//            document.readyState === 'complete') {
//
//	    detach();
//	    
//	
//	}
//    };
//
//  
//
//    // Standards-based browsers support DOMContentLoaded.
//    if (document.addEventListener) {
//
//        detach = function() {
//            document.removeEventListener('DOMContentLoaded', completed, false);
//	    window.removeEventListener('load', completed, false);
//        };
//
//        onLoad = function() {
//	    // Use the handy event callback
//	    document.addEventListener('DOMContentLoaded', completed, false);
//            
//	    // A fallback to window.onload, that will always work
//	    window.addEventListener('load', completed, false);
//        };
//        
//	
//    }
//    // If IE event model is used.
//    else {
//
//        detach = function() {
//            document.detachEvent('onreadystatechange', completed );
//	    window.detachEvent('onload', completed );
//        };
//
//        onLoad = function() {
//            // Ensure firing before onload, maybe late but safe also for iframes.
//	    document.attachEvent('onreadystatechange', completed );
//
//	    // A fallback to window.onload, that will always work.
//	    window.attachEvent('onload', completed );
//        };




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
     *          'cache' (default; get the page from cache if possible),
     *          'reload' (reload page without the cache)
     *      * storeMode (string):
     *          'off' (default; don't cache page),
     *          'onLoad' (cache given page after it is loaded),
     *          'onClose' (cache given page after it is replaced by a new page)
     *
     * Warning: Security policies may block this method if the
     * content is coming from another domain.
     *
     * @param {string} uri The uri to load
     * @param {function} func Optional. The function to call once the DOM is
     *   ready
     * @param {object} opts Optional. The options object
     */
    GameWindow.prototype.loadFrame = function(uri, func, opts) {
        var that;
        var frame;
        var loadCache;
        var storeCacheNow, storeCacheLater;
        var iframe, iframeDocument;
        var frameNode, frameDocumentElement, frameReady;
        var lastURI;

        if ('string' !== typeof uri) {
            throw new TypeError('GameWindow.loadFrame: uri must be string.');
        }
        this.setStateLevel('LOADING');

        that = this;

        // Default options:
        frame = this.frameName;
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
        iframeDocument = W.getIFrameDocument(iframe);
        frameReady = iframeDocument.readyState;
        // ...reduce it to a boolean:
        frameReady = frameReady === 'interactive' || frameReady === 'complete';

        // If the last frame requested to be cached on closing, do that:
        lastURI = this.currentURIs[frame];

        if (this.cache.hasOwnProperty(lastURI) &&
                this.cache[lastURI].cacheOnClose) {

            frameNode = document.getElementById(frame);
            frameDocumentElement = W.getIFrameDocument(frameNode)
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
            // Remove onload hanlder for this frame.
            // Buggy Opera 11.52 fires the onload twice.            
            iframe.onload = null;

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
     * - updates the frameDocument reference
     * - executes a given callback function
     * - decrements the counter of loading iframes
     * - set the window state as loaded (eventually)
     *
     * @param {function} func Optional. A callback function
     * @param {string} frameName The name of the iframe of reference
     *
     * @see GameWindow.frameDocument
     */
    GameWindow.prototype.updateLoadFrameState = function(func, frameName) {
        // Update the reference to the frame document.
        this.frameDocument = window.frames[frameName].document;
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
        if (this.frameDocument && this.frameDocument.getElementById) {
            el = this.frameDocument.getElementById(id);
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
        return this.frameDocument ?
            this.frameDocument.getElementsByTagName(tag) :
            document.getElementsByTagName(tag);
    };



    //Expose GameWindow prototype to the global object.
    node.GameWindow = GameWindow;

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
