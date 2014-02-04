/**
 * # GameWindow
 * Copyright(c) 2014 Stefano Balietti
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
    var screenLevels = constants.screenLevels;

    // Allows just one update at the time to the counter of loading frames.
    var lockedUpdate = false;

    GameWindow.prototype = DOM;
    GameWindow.prototype.constructor = GameWindow;

    // Configuration object.
    GameWindow.defaults = {};

    // Default settings.
    GameWindow.defaults.promptOnleave = true;
    GameWindow.defaults.noEscape = true;
    GameWindow.defaults.cacheDefaults = {
        loadCache:       true,
        storeCacheNow:   false,
        storeCacheLater: false
    };

    function onLoadStd(iframe, cb) {
        var iframeWin;
        iframeWin = iframe.contentWindow;

        function completed(event) {
            // Detaching the function to avoid double execution.
            iframe.removeEventListener('load', completed, false);
            iframeWin.removeEventListener('load', completed, false);
            if (cb) {
                // Some browsers fires onLoad too early.
                // A small timeout is enough.                
                setTimeout(function() { cb(); }, 120);
            }
        }

        // Use the handy event callback
        iframe.addEventListener('load', completed, false);

        // A fallback to window.onload, that will always work
        iframeWin.addEventListener('load', completed, false);
    }

    function onLoadIE(iframe, cb) {
        var iframeWin;
        iframeWin = iframe.contentWindow;
        // We cannot get the iframeDoc here and use it in completed. See below.

        function completed(event) {
            var iframeDoc;

            // IE < 10 gives 'Permission Denied' if trying to access
            // the iframeDoc from the context of the function above.
            // We need to re-get it from the DOM.
            iframeDoc = JSUS.getIFrameDocument(iframe);

            // readyState === "complete" works also in oldIE.
            if (event.type === 'load' ||
                iframeDoc.readyState === 'complete') {

                // Detaching the function to avoid double execution.
                iframe.detachEvent('onreadystatechange', completed );
                iframeWin.detachEvent('onload', completed );

                if (cb) {
                    // Some browsers fires onLoad too early.
                    // A small timeout is enough.
                    setTimeout(function() { cb(); }, 120);
                }
            }
        }

        // Ensure firing before onload, maybe late but safe also for iframes.
        iframe.attachEvent('onreadystatechange', completed );

        // A fallback to window.onload, that will always work.
        iframeWin.attachEvent('onload', completed );
    }

    function onLoad(iframe, cb) {
        // IE
        if (iframe.attachEvent) {
            onLoadIE(iframe, cb);
        }
        // Standards-based browsers support DOMContentLoaded.
        else {
            onLoadStd(iframe, cb);
        }
    }

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
         * Under normal circumstances, this element is a reference to
         * _document.body_.
         */
        this.frameRoot = null;

        /**
         * ### GameWindow.headerElement
         *
         * A reference to the HTMLDivElement representing the header
         */
        this.headerElement = null;

        /**
         * ### GameWindow.headerName
         *
         * The name (id) of the header element
         */
        this.headerName = null;

        /**
         * ### GameWindow.headerRoot
         *
         * The name (id) of the header element
         */
        this.headerRoot = null;

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
         * ### GameWindow.cacheSupported
         *
         * Flag that marks whether caching is supported by the browser
         *
         * Caching requires to modify the documentElement.innerHTML property
         * of the iframe document. This property is read-only in IE < 9.
         */
        this.cacheSupported = null;


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
         *
         * @see GameWindow.preCache
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

        /**
         * ### GamwWindow.screenState
         *
         * Levels describing whether the user can interact with the frame.
         *
         * The _screen_ represents all the user can see on screen. 
         * It includes the _frame_ area, but also the _header_.
         *
         * @see node.widgets.WaitScreen
         * @see node.constants.screenLevels
         */
        this.screenState = node.constants.screenLevels.ACTIVE;

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
                                'level must be string.');
        }
        if ('undefined' === typeof windowLevels[level]) {
            throw new Error('GameWindow.setStateLevel: unrecognized level: ' +
                            level + '.');
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
     * Returns TRUE if the state is either INITIALIZED or LOADED or LOCKED.
     *
     * @return {boolean} Whether the window is ready
     */
    GameWindow.prototype.isReady = function() {
        return this.state === windowLevels.INITIALIZED ||
            this.state === windowLevels.LOADED;
    };

    /**
     * ### GameWindow.setScreenLevel
     *
     * Validates and sets window's state level
     *
     * @param {string} level The level of the update
     *
     * @see constants.screenLevels
     */
    GameWindow.prototype.setScreenLevel = function(level) {
        if ('string' !== typeof level) {
            throw new TypeError('GameWindow.setScreenLevel: ' +
                                'level must be string.');
        }
        if ('undefined' === typeof screenLevels[level]) {
            throw new Error('GameWindow.setScreenLevel: unrecognized level: ' +
                           level + '.');
        }

        this.screenState = screenLevels[level];
    };

    /**
     * ### GameWindow.getScreenLevel
     *
     * Returns the current screen level
     *
     * @return {number} The screen level
     *
     * @see constants.screenLevels
     */
    GameWindow.prototype.getScreenLevel = function() {
        return this.screenState;
    };

    /**
     * ### GameWindow.getFrame
     *
     * Returns a reference to the HTML element of the frame of the game
     *
     * If no reference is found, tries to retrieve and update it using the
     * _frameName_ variable.
     *
     * @return {HTMLIFrameElement} The iframe element of the game
     *
     * @see GameWindow.frameName
     */
    GameWindow.prototype.getFrame = function() {
        if (!this.frameElement) {
            if (this.frameName) {
                this.frameElement = document.getElementById(this.frameName);
            }
        }
        return this.frameElement;
    };

    /**
     * ### GameWindow.getFrameName
     *
     * Returns the name of the frame of the game
     *
     * If no name is found, tries to retrieve and update it using the
     *  _GameWindow.getFrame()_.
     *
     * @return {string} The name of the frame of the game.
     *
     * @see GameWindow.getFrame
     */
    GameWindow.prototype.getFrameName = function() {
        var iframe;
        if (!this.frameName) {
            iframe = this.getFrame();
            this.frameName = iframe ?iframe.name || iframe.id : null;
        }
        return this.frameName;
    };

    /**
     * ### GameWindow.getFrameWindow
     *
     * Returns a reference to the window object of the frame of the game
     *
     * If no reference is found, tries to retrieve and update it using
     * _GameWindow.getFrame()_.
     *
     * @return {Window} The window object of the iframe of the game
     *
     * @see GameWindow.getFrame
     */
    GameWindow.prototype.getFrameWindow = function() {
        var iframe;
        if (!this.frameWindow) {
            iframe = this.getFrame();
            this.frameWindow = iframe ? iframe.contentWindow : null;
        }
        return this.frameWindow;
    };

    /**
     * ### GameWindow.getFrameDocument
     *
     * Returns a reference to the document object of the iframe
     *
     * If no reference is found, tries to retrieve and update it using the
     * _GameWindow.getFrame()_.
     *
     * @return {Document} The document object of the iframe of the game
     *
     * @see GameWindow.getFrame
     */
    GameWindow.prototype.getFrameDocument = function() {
        var iframe;
        if (!this.frameDocument) {
            iframe = this.getFrame();
            this.frameDocument = iframe ? this.getIFrameDocument(iframe) :
                null;
        }
        return this.frameDocument;
            
    };

    /**
     * ### GameWindow.getFrameRoot
     *
     * Returns a reference to the root element for the iframe
     *
     * If none is found tries to retrieve and update it using 
     * _GameWindow.getFrame()_.
     *
     * @return {Element} The root element in the iframe
     */
    GameWindow.prototype.getFrameRoot = function() {
        var iframe;
        if (!this.frameRoot) {
            iframe = this.getFrame();
            this.frameRoot = iframe ? iframe.parentNode : null;
        }
        return this.frameRoot;
    };

    /**
     * ### GameWindow.generateFrame
     *
     * Appends a new iframe to _documents.body_ and sets it as the default one
     *
     * @param {Element} root Optional. The HTML element to which the iframe
     *   will be appended. Defaults, this.frameRoot or document.body.
     * @param {string} frameName Optional. The name of the iframe. Defaults,
     *   'mainframe'.
     * @param {boolean} force Optional. Will create the frame even if an
     *   existing one is found. Defaults, FALSE.
     * @return {IFrameElement} The newly created iframe
     *
     * @see GameWindow.frameElement
     * @see GameWindow.frameWindow
     * @see GameWindow.frameDocument
     * @see GameWindow.setFrame
     * @see GameWindow.clearFrame
     * @see GameWindow.destroyFrame
     */
    GameWindow.prototype.generateFrame = function(root, frameName, force) {
        var iframe;
        if (!force && this.frameElement) {
            throw new Error('GameWindow.generateFrame: a frame element is ' +
                            'already existing. It cannot be duplicated.');
        }

        root = root || this.frameRoot || document.body;

        if (!J.isElement(root)) {
            throw new Error('GameWindow.generateFrame: invalid root element.');
        }

        frameName = frameName || 'mainframe';

        if ('string' !== typeof frameName) {
            throw new Error('GameWindow.generateFrame: frameName must be ' +
                            'string.');
        }

        if (document.getElementById(frameName)) {
            throw new Error('GameWindow.generateFrame: frameName must be ' +
                            'unique.');
        }

        iframe = W.addIFrame(root, frameName);
        // Method .replace does not add the uri to the history.
        iframe.contentWindow.location.replace('about:blank');

        return this.setFrame(iframe, frameName, root);
    };

    /**
     * ### GameWindow.setFrame
     *
     * Sets the new default frame and update other references
     *
     * @param {IFrameElement} iframe. The new default frame.
     * @param {string} frameName The name of the iframe. 
     * @param {Element} root The HTML element to which the iframe is appended.
     * @return {IFrameElement} The new default iframe
     * @see GameWindow.generateFrame
     */
    GameWindow.prototype.setFrame = function(iframe, iframeName, root) {
        if (!J.isElement(iframe)) {
            throw new Error('GameWindow.setFrame: iframe must be HTMLElement.');
        }
        if ('string' !== typeof iframeName) {
            throw new Error('GameWindow.setFrame: iframeName must be string.');
        }
        if (!J.isElement(root)) {
            throw new Error('GameWindow.setFrame: invalid root element.');
        }

        this.frameRoot = root;
        this.frameName = iframeName;
        this.frameElement = iframe;
        this.frameWindow = iframe.contentWindow;
        this.frameDocument = W.getIFrameDocument(iframe);

        return iframe;
    };

    /**
     * ### GameWindow.destroyFrame
     *
     * Clears the content of the frame and removes the element from the page
     *
     * @see GameWindow.clearFrame
     */
    GameWindow.prototype.destroyFrame = function() {
        this.clearFrame();
        this.frameRoot.removeChild(this.frameElement);
        this.frameElement = null;
        this.frameWindow = null;
        this.frameDocument = null;
        this.frameRoot = null;
    };

    /**
     * ### GameWindow.clearFrame
     *
     * Clears the content of the frame
     */
    GameWindow.prototype.clearFrame = function() {
        var iframe, frameName;
        iframe = this.getFrame();
        if (!iframe) {
            throw new Error('GameWindow.clearFrame: cannot detect frame.');
        }
        frameName = iframe.name || iframe.id;
        iframe.onload = null;
        // Method .replace does not add the uri to the history.
        iframe.contentWindow.location.replace('about:blank');
        this.frameElement = iframe;
        this.frameWindow = window.frames[frameName];
        this.frameDocument = W.getIFrameDocument(iframe);
    };

    /**
     * ### GameWindow.generateHeader
     *
     * Adds a a div element and sets it as the header of the page.
     *
     * @param {Element} root Optional. The HTML element to which the header
     *   will be appended. Defaults, _ document.body_ or
     *   _document.lastElementChild_.
     * @param {string} headerName Optional. The name (id) of the header.
     *   Defaults, 'gn_header'..
     * @param {boolean} force Optional. Will create the header even if an
     *   existing one is found. Defaults, FALSE.
     * @return {Element} The header element
     */
    GameWindow.prototype.generateHeader = function(root, headerName, force) {
        var header;

        if (!force && this.headerElement) {
            throw new Error('GameWindow.generateHeader: a header element is ' +
                            'already existing. It cannot be duplicated.'); 
        }
        
        root = root || document.body || document.lastElementChild;

        if (!J.isElement(root)) {
            throw new Error('GameWindow.generateHeader: invalid root element.');
        }
        
        headerName = headerName || 'gn_header';

        if ('string' !== typeof headerName) {
            throw new Error('GameWindow.generateHeader: headerName must be ' +
                            'string.');
        }
        
        if (document.getElementById(headerName)) {
            throw new Error('GameWindow.generateHeader: headerName must be ' +
                            'unique.');
        }
        
        header = this.addElement('div', root, headerName);

        return this.setHeader(header, headerName, root);
    };

    /**
     * ### GameWindow.setHeader
     *
     * Sets the new header element and update related references
     *
     * @param {Element} header. The new header.
     * @param {string} headerName The name of the header.
     * @param {Element} root The HTML element to which the header is appended.
     * @return {Element} The new header
     *
     * @see GameWindow.generateHeader
     */
    GameWindow.prototype.setHeader = function(header, headerName, root) {
        if (!J.isElement(header)) {
            throw new Error('GameWindow.setHeader: header must be HTMLElement.');
        }
        if ('string' !== typeof headerName) {
            throw new Error('GameWindow.setHeader: headerName must be string.');
        }
        if (!J.isElement(root)) {
            throw new Error('GameWindow.setHeader: invalid root element.');
        }
 
        this.headerElement = header;
        this.headerName = headerName;
        this.headerRoot = root;
            
        return this.headerElement;
    };

    /**
     * ### GameWindow.getHeader
     *
     * Returns a reference to the header element, if defined
     *
     * @return {Element} The header element
     */
    GameWindow.prototype.getHeader = function() {
        if (!this.headerElement) {
            this.headerElement = this.headerName ? 
                document.getElementById(this.headerName) : null;
        }
        return this.headerElement;
    };
    
    /**
     * ### GameWindow.getHeaderName
     *
     * Returns the name (id) of the header element
     *
     * @return {string} The name (id) of the header
     */
    GameWindow.prototype.getHeaderName = function() {
        var header;
        if (!this.headerName) {
            header = this.getHeader();
            this.headerName = header ? header.id : null;
        }
        return this.headerName;
    };

    /**
     * ### GameWindow.getHeaderRoot
     *
     * Returns the HTML element to which the header is appended
     *
     * @return {HTMLElement} The HTML element to which the header is appended
     */
    GameWindow.prototype.getHeaderRoot = function() {
        var header;
        if (!this.headerRoot) {
            header = this.getHeader();
            this.headerRoot = header ? header.parentNode: null;
        }
        return this.headerRoot;
    };

    /**
     * ### GameWindow.destroyHeader
     *
     * Clears the content of the header and removes the element from the page
     *
     * @see GameWindow.clearHeader
     */
    GameWindow.prototype.destroyHeader = function() {
        this.clearHeader();
        this.headerRoot.removeChild(this.headerElement);
        this.headerElement = null;
        this.headerName = null;
        this.headerRoot = null;
    };

    /**    
     * ### GameWindow.clearHeader
     *
     * Clears the content of the header
     */
    GameWindow.prototype.clearHeader = function() {
        var header;
        header = this.getHeader();
        if (!header) {
            throw new Error('GameWindow.clearHeadr: cannot detect header.');
        }
        this.headerElement.innerHTML = '';
    };

    /**
     * ### GameWindow.setupFrame
     *
     * Sets up the page with a predefined configuration of widgets
     *
     * Available setup profiles are:
     *
     * - MONITOR: frame
     * - PLAYER: header + frame
     * - SOLO_PLAYER: (like player without header)
     *
     * @param {string} type The type of setup
     */
    GameWindow.prototype.setupFrame = function(profile) {

        if ('string' !== typeof profile) {
            throw new TypeError('GameWindow.setup: profile must be string.');
        }

        switch (profile) {

        case 'MONITOR':

            if (!this.getFrame()) {
                this.generateFrame();
            }

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
                    this.headerElement);
            node.game.timer = node.widgets.append('VisualTimer',
                    this.headerElement);
            node.game.stateDisplay = node.widgets.append('StateDisplay',
                    this.headerElement);

            // Will continue in SOLO_PLAYER.

        /* falls through */
        case 'SOLO_PLAYER':

            if (!this.getFrame()) {
                this.generateFrame();
            }

            // Adding the WaitScreen.
            node.widgets.append('WaitScreen');

            // Add default CSS.
            if (node.conf.host) {
                this.addCSS(this.getFrameRoot(),
                            node.conf.host + '/stylesheets/player.css');
            }

            break;

        default:
            throw new Error('GameWindow.setupFrame: unknown profile type: ' +
                            profile + '.');
        }
    };

    /**
     * ### GameWindow.initLibs
     *
     * Specifies the libraries to be loaded automatically in the iframes
     *
     * This method must be called before any call to GameWindow.loadFrame.
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
     * Tests wether preChace is supported by the browser.
     *
     * Results are stored in _GameWindow.cacheSupported_.
     *
     * @param {function} cb Optional. The function to call once the test if
     *   finished. It will be called regardless of success or failure.
     * @param {string} uri Optional. The URI to test. Defaults,  
     *   '/pages/testpage.htm';
     *
     * @see GameWindow.cacheSupported
     */
    GameWindow.prototype.preCacheTest = function(cb, uri) {
        var iframe, iframeName;
        uri = uri || '/pages/testpage.htm';
        if ('string' !== typeof uri) {
            throw new TypeError('GameWindow.precacheTest: uri must string or ' +
                                'undefined.');
        }
        iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframeName = 'preCacheTest';
        iframe.id = iframeName;
        iframe.name = iframeName;
        document.body.appendChild(iframe);
        iframe.contentWindow.location.replace(uri);
        onLoad(iframe, function() {
            try {
                W.getIFrameDocument(iframe).documentElement.innerHTML = 'a';
                W.cacheSupported = true;
            }
            catch(e) {
                W.cacheSupported = false;
            }
            document.body.removeChild(iframe);
            if (cb) cb();
        });
    };

    /**
     * ### GameWindow.preCache
     *
     * Loads the HTML content of the given URI(s) into the cache
     *
     * If caching is not supported by the browser, the callback will be
     * executed anyway. 
     *
     * @param {string|array} uris The URI(s) to cache
     * @param {function} callback Optional. The function to call once the
     *   caching is done
     *
     * @see GameWindow.cacheSupported
     * @see GameWindow.preCacheTest
     */
    GameWindow.prototype.preCache = function(uris, callback) {
        var that;
        var loadedCount;
        var currentUri, uriIdx;
        var iframe, iframeName;

        if ('string' === typeof uris) {
            uris = [ uris ];
        }

        if (!J.isArray(uris)) {
            throw new TypeError('GameWindow.preCache: uris must be string ' +
                                'or array.');
        }
        if (callback && 'function' !== typeof callback) {
            throw new TypeError('GameWindow.preCache: callback must be ' +
                                'function or undefined.');
        }

        // Don't preload if an empty array is passed.
        if (!uris.length) {
            if (callback) callback();
            return;
        }

        that = this;

        // Before proceeding with caching, check if caching is supported.
        if (this.cacheSupported === null) {
            this.preCacheTest(function() {
                that.preCache(uris, callback);
            });
            return;
        }
        else if (this.cacheSupported === false) {
            node.warn('GameWindow.preCache: caching is not supported by ' +
                      'your browser.');
            if (callback) callback();
            return;
        }

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

            (function(uri, thisIframe) {
                // Register the onLoad handler:
                onLoad(thisIframe, function() {
                    var frameDocument, frameDocumentElement;

                    frameDocument = W.getIFrameDocument(thisIframe);
                    frameDocumentElement = frameDocument.documentElement;

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
                });
            })(currentUri, iframe);

            // Start loading the page:
            // Method .replace does not add the uri to the history.
            window.frames[iframeName].location.replace(currentUri);
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
        var el, frameDocument;

        frameDocument = this.getFrameDocument();
        el = null;
        if (frameDocument && frameDocument.getElementById) {
            el = frameDocument.getElementById(id);
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
        var frameDocument;
        frameDocument = this.getFrameDocument();
        return frameDocument ? frameDocument.getElementsByTagName(tag) :
            document.getElementsByTagName(tag);
    };

    /**
     * ### GameWindow.loadFrame
     *
     * Loads content from an uri (remote or local) into the iframe,
     * and after it is loaded executes the callback function
     *
     * The third parameter is an options object with the following fields
     * (any fields left out assume the default setting):
     *
     *  - cache (object): Caching options.  Fields:
     *      * loadMode (string):
     *          'cache' (default; get the page from cache if possible),
     *          'reload' (reload page without the cache)
     *      * storeMode (string):
     *          'off' (default; don't cache page),
     *          'onLoad' (cache given page after it is loaded),
     *          'onClose' (cache given page after it is replaced by a new page)
     *
     * Warning: Security policies may block this method if the content is
     * coming from another domain.
     *
     * @param {string} uri The uri to load
     * @param {function} func Optional. The function to call once the DOM is
     *   ready
     * @param {object} opts Optional. The options object
     */
    GameWindow.prototype.loadFrame = function(uri, func, opts) {
        var that;
        var loadCache;
        var storeCacheNow, storeCacheLater;
        var iframe, iframeName, iframeDocument, iframeWindow;
        var frameDocumentElement, frameReady;
        var lastURI;

        if ('string' !== typeof uri) {
            throw new TypeError('GameWindow.loadFrame: uri must be string.');
        }
        if (func && 'function' !== typeof func) {
            throw new TypeError('GameWindow.loadFrame: func must be function ' +
                                'or undefined.');
        }
        if (opts && 'object' !== typeof opts) {
            throw new TypeError('GameWindow.loadFrame: opts must be object ' +
                                'or undefined.');
        }
        opts = opts || {};

        iframe = this.getFrame();
        iframeName = this.frameName;

        if (!iframe) {
            throw new Error('GameWindow.loadFrame: no frame found.');
        }
        
        if (!iframeName) {
            throw new Error('GameWindow.loadFrame: frame has no name.');
        }

        this.setStateLevel('LOADING');
        that = this;

        // Save ref to iframe window for later.
        iframeWindow = iframe.contentWindow;
        // Query readiness (so we know whether onload is going to be called):
        iframeDocument = W.getIFrameDocument(iframe);
        frameReady = iframeDocument.readyState;
        // ...reduce it to a boolean:
        frameReady = frameReady === 'interactive' || frameReady === 'complete';

        // Begin loadFrame caching section.

        // Default options.
        loadCache = GameWindow.defaults.cacheDefaults.loadCache;
        storeCacheNow = GameWindow.defaults.cacheDefaults.storeCacheNow;
        storeCacheLater = GameWindow.defaults.cacheDefaults.storeCacheLater;

        // Caching options.
        if (opts.cache) {
            if (opts.cache.loadMode) {
                
                if (opts.cache.loadMode === 'reload') {
                    loadCache = false;
                }
                else if (opts.cache.loadMode === 'cache') {
                    loadCache = true;
                }
                else {
                    throw new Error('GameWindow.loadFrame: unkown cache ' +
                                    'load mode: ' + opts.cache.loadMode + '.');
                }
            }
            if (opts.cache.storeMode) {
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
                else {
                    throw new Error('GameWindow.loadFrame: unkown cache ' +
                                    'store mode: ' + opts.cache.storeMode + '.');
                }
            }
        }

        if (this.cacheSupported === null) {            
            this.preCacheTest(function() {
                that.loadFrame(uri, func, opts);
            });
            return;           
        }

        if (this.cacheSupported === false) {
            storeCacheNow = false;
            storeCacheLater = false;
            loadCache = false;
        }
        else {
            // If the last frame requested to be cached on closing, do that:
            lastURI = this.currentURIs[iframeName];

            if (this.cache.hasOwnProperty(lastURI) &&
                this.cache[lastURI].cacheOnClose) {

                frameDocumentElement = iframeDocument.documentElement;
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
        }

        // End loadFrame caching section.

        // Update frame's currently showing URI:
        this.currentURIs[iframeName] = uri;

        // Keep track of nested call to loadFrame.
        updateAreLoading(this, 1);

        // Add the onLoad event listener:
        if (!loadCache || !frameReady) {
            onLoad(iframe, function() {
                // Handles caching.
                handleFrameLoad(that, uri, iframe, iframeName, loadCache,
                                storeCacheNow);
                // Executes callback and updates GameWindow state.
                that.updateLoadFrameState(func);
            });
        }

        // Cache lookup:
        if (loadCache) {
            // Load iframe contents at this point only if the iframe is already
            // "ready" (see definition of frameReady), otherwise the contents
            // would be cleared once the iframe becomes ready.  In that case,
            // iframe.onload handles the filling of the contents.
            if (frameReady) {
                // Handles chaching.
                handleFrameLoad(this, uri, iframe, iframeName, loadCache,
                                storeCacheNow);

                // Executes callback and updates GameWindow state.
                this.updateLoadFrameState(func);
            }
        }
        else {
            // Update the frame location:
            iframeWindow.location.replace(uri);
        }

        // Adding a reference to nodeGame also in the iframe.
        iframeWindow.node = node;
    };

    /**
     * ### GameWindow.updateLoadFrameState
     *
     * Sets window state after a new frame has been loaded
     *
     * The method performs the following operations:
     *
     * - executes a given callback function
     * - decrements the counter of loading iframes
     * - set the window state as loaded (eventually)
     *
     * @param {function} func Optional. A callback function
     *
     * @see updateAreLoading
     */
    GameWindow.prototype.updateLoadFrameState = function(func) {
        if (func) {
            func.call(node.game);
        }

        updateAreLoading(this, -1);

        if (this.areLoading === 0) {
            this.setStateLevel('LOADED');
            node.emit('WINDOW_LOADED');
            // The listener will take care of emitting PLAYING,
            // if all conditions are met.
        }
        else {
            node.silly('GameWindow.updateLoadFrameState: ' + this.areLoading +
                       ' loadFrame processes open.');
        }
    };

    /* Private helper functions follow */

    /**
     * ### handleFrameLoad
     *
     * Handles iframe contents loading
     *
     * A helper method of GameWindow.loadFrame.
     * Puts cached contents into the iframe or caches new contents if requested.
     * Handles reloading of script tags and injected libraries.
     * Must be called with the current GameWindow instance.
     * Updates the references to _frameWindow_ and _frameDocument_ if the
     * iframe name is equal to _frameName_.
     *
     * @param {GameWindow} that The GameWindow instance
     * @param {uri} uri URI to load
     * @param {string} frameName ID of the iframe
     * @param {bool} loadCache Whether to load from cache
     * @param {bool} storeCache Whether to store to cache
     *
     * @see GameWindow.loadFrame
     *
     * @api private
     */
    function handleFrameLoad(that, uri, iframe, frameName, loadCache,
                             storeCache) {

        var iframeDocumentElement;

        // iframe = W.getElementById(frameName);
        iframeDocumentElement = W.getIFrameDocument(iframe).documentElement;

        if (loadCache) {
            // Load frame from cache:
            iframeDocumentElement.innerHTML = that.cache[uri].contents;
        }
        
        // Update references to frameWindow and frameDocument
        // if this was the frame of the game.
        if (frameName === that.frameName) {
            that.frameWindow = iframe.contentWindow;
            that.frameDocument = that.getIFrameDocument(iframe);
        }
        
        // (Re-)Inject libraries and reload scripts:
        removeLibraries(iframe);
        if (loadCache) {
            reloadScripts(iframe);
        }
        injectLibraries(iframe, that.globalLibs.concat(
                that.frameLibs.hasOwnProperty(uri) ? that.frameLibs[uri] : []));

        if (storeCache) {
            // Store frame in cache:
            that.cache[uri].contents = iframeDocumentElement.innerHTML;
        }
    }

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
        
        // Old IEs do not have getElementsByClassName.
        scriptNodes = W.getElementsByClassName(contentDocument, 'injectedlib',
                                               'script');
        
        // It was. To check.
        // scriptNodes = contentDocument.getElementsByClassName('injectedlib');
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

        headNode = W.getIFrameAnyChild(iframe);

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

        headNode = W.getIFrameAnyChild(iframe);

        for (libIdx = 0; libIdx < libs.length; libIdx++) {
            lib = libs[libIdx];
            scriptNode = document.createElement('script');
            scriptNode.className = 'injectedlib';
            scriptNode.src = lib;
            headNode.appendChild(scriptNode);
        }
    }

    /**
     * ### updateAreLoading
     *
     * Updates the counter of loading frames in a secure way
     *
     * Ensure atomicity of the operation by using the _lockedUpdate_ semaphore.
     *
     * @param {GameWindow} that A reference to the GameWindow instance
     * @param {number} update The number to add to the counter
     *
     * @see GameWindow.lockedUpdate
     * @api private
     */
    function updateAreLoading(that, update) {
        if (!lockedUpdate) {
            lockedUpdate = true;
            that.areLoading = that.areLoading + update;
            lockedUpdate = false;
        }
        else {
            setTimeout(function() {
                updateAreLoading.call(that, update);
            }, 300);
        }
    }

    //Expose GameWindow prototype to the global object.
    node.GameWindow = GameWindow;

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
