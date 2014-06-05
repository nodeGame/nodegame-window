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
         * of the iframe document, which is read-only in IE < 9.
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
         * Maps frame names (e.g. 'ng_mainframe') to the URIs they are showing.
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
         * Reference to the _WaitScreen_ module
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

        /**
         * ### GamwWindow.textOnleave
         *
         * Text that displayed to the users on the _onbeforeunload_ event
         *
         * By default it is null, that means that it is left to the browser
         * default.
         *
         * Notice: some browser do not support displaying a custom text.
         *
         * @see GameWindow.promptOnleave
         */
        this.textOnleave = null;
        
        /**
         * ### node.setup.window
         *
         * Setup handler for the node.window object
         *
         * @see node.setup
         */
        node.registerSetup('window', function(conf) {           
            conf = conf || {};
            if ('undefined' === typeof conf.promptOnleave) {
                conf.promptOnleave = false;
            }
            if ('undefined' === typeof conf.noEscape) {
                conf.noEscape = true;
            }

            this.window.init(conf);

            return conf;
        });

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

        if (this.conf.textOnleave) {
            this.textOnleave = this.conf.textOnleave;
        }
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
        
        if (this.conf.waitScreen !== false) {
            if (this.waitScreen) {
                this.waitScreen.destroy();
                this.waitScreen = null;
            }
            this.waitScreen = new node.WaitScreen(this.conf.waitScreen);            
        }
        else if (this.waitScreen) {
            this.waitScreen.destroy();
            this.waitScreen = null;
        }

        this.setStateLevel('INITIALIZED');
    };

    /**
     * ### GameWindow.reset
     *
     * Resets the GameWindow to the initial state
     *
     * Clears the frame, header, lock, widgets and cache.
     *
     * @see Widgets.destroyAll
     */
    GameWindow.prototype.reset = function() {
        // Unlock screen, if currently locked.
        if (this.isScreenLocked()) {
            this.unlockScreen();
        }

        // Remove widgets, if Widgets exists.
        if (node.widgets) {
            node.widgets.destroyAll();
        }

        // Remove loaded frame, if one is found.
        if (this.getFrame()) {
            this.destroyFrame();
        }

        // Remove header, if one is found.
        if (this.getHeader()) {
            this.destroyHeader();
        }

        this.areLoading = 0;

        // Clear all caches.
        this.clearCache();
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
     *   'ng_mainframe'.
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

        frameName = frameName || 'ng_mainframe';

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
        
        headerName = headerName || 'ng_header';

        if ('string' !== typeof headerName) {
            throw new Error('GameWindow.generateHeader: headerName must be ' +
                            'string.');
        }
        
        if (document.getElementById(headerName)) {
            throw new Error('GameWindow.generateHeader: headerName must be ' +
                            'unique.');
        }
        
        header = this.addElement('div', root, headerName);

        this.setHeader(header, headerName, root);

        this.placeHeader('top');

        return header;
    };


    /**
     * ### GameWindow.placeHeader
     *
     * Place the on a side of the page
     *
     * @see GameWindow.generateHeader
     */
    GameWindow.prototype.placeHeader = function(position) {
        var validPositions
        if ('string' !== typeof position) {
            throw new TypeError('GameWindow.placeHeader: position must be ' +
                                'string.');
        }
        validPositions = { 
            'top': 'ng_header_position-horizontal-t',
            'bottom': 'ng_header_position-horizontal-b',
            'right': 'ng_header_position-vertical-r',
            'left': 'ng_header_position-vertical-l'
        };

        if ('undefined' === typeof validPositions[position]) {
            throw new Error('GameWindow.placeHeader: invalid header position: ' +
                            position  + '.');
        }
        if (!this.headerElement) {
            throw new Error('GameWindow.placeHeader: headerElement not found.');
        } 


        W.removeClass(this.headerElement, 'ng_header_position-[a-z\-]*');
        W.addClass(this.headerElement, validPositions[position]);

        if (this.frameElement) {
            W.removeClass(this.frameElement, 'ng_mainframe-header-[a-z\-]*');
            switch(position) {
            case 'right':
            case 'left':
                W.addClass(this.frameElement, 'ng_mainframe-header-vertical');
                break;
            case 'top':                
                W.addClass(this.frameElement, 'ng_mainframe-header-horizontal');
                this.getFrameRoot().insertBefore(this.headerElement,
                                                 this.frameElement);
                break;
            case 'bottom':
                W.addClass(this.frameElement, 'ng_mainframe-header-horizontal');
                this.headerElement.parentNode.insertBefore(this.frameElement,
                                                           this.headerElement);
                break;
            }

        }        
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
            throw new Error('GameWindow.clearHeader: cannot detect header.');
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

            // Add default CSS.
            if (node.conf.host) {
                this.addCSS(this.getFrameRoot(),
                            node.conf.host + '/stylesheets/nodegame.css');
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

/**
 * # GameWindow UI Behavior module
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Handles default behavior of the browser on certain DOM Events.
 *
 * http://www.nodegame.org
 * ---
 */
(function(window, node) {

    "use strict";

    var GameWindow = node.GameWindow;

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
        text = 'undefined' !== typeof text ? text : this.textOnleave;
        
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

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);

/**
 * # GameWindow Screen Locker
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Locks / Unlocks the screen.
 *
 * The _screen_ represents all the user can see on screen. 
 * It includes the _frame_ area, but also the _header_.
 *
 * http://www.nodegame.org
 * ---
 */
(function(window, node) {

    "use strict";

    var J = node.JSUS;

    var GameWindow = node.GameWindow;
    var screenLevels = node.constants.screenLevels;
    
    /**
     * ### GameWindow.lockScreen
     *
     * Locks the screen by opening the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     *
     * @param {string} text Optional. The text to be shown in the locked screen
     *
     * TODO: check if this can be called in any stage.
     */
    GameWindow.prototype.lockScreen = function(text) {
        var that;
        that = this;

        if (!this.waitScreen) {
            throw new Error('GameWindow.lockScreen: waitScreen not found.');
        }
        if (text && 'string' !== typeof text) {
            throw new TypeError('GameWindow.lockScreen: text must be string ' +
                                'or undefined');
        }
        if (!this.isReady()) {
            setTimeout(function() { that.lockScreen(text); }, 100);
        }
        this.setScreenLevel('LOCKING');
        text = text || 'Screen locked. Please wait...';
        this.waitScreen.lock(text);
        this.setScreenLevel('LOCKED');
    };

    /**
     * ### GameWindow.unlockScreen
     *
     * Unlocks the screen by removing the waitScreen widget on top
     *
     * Requires the waitScreen widget to be loaded.
     */
    GameWindow.prototype.unlockScreen = function() {
        if (!this.waitScreen) {
            throw new Error('GameWindow.unlockScreen: waitScreen not found.');
        }
        if (!this.isScreenLocked()) {
            throw new Error('GameWindow.unlockScreen: screen is not locked.');
        }
        this.setScreenLevel('UNLOCKING');
        this.waitScreen.unlock();
        this.setScreenLevel('ACTIVE');
    };

    /**
     * ### GameWindow.isScreenLocked
     *
     * TRUE, if the screen is locked.
     *
     * @see GameWindow.screenState
     */
    GameWindow.prototype.isScreenLocked = function() {
        return this.getScreenLevel() !== screenLevels.ACTIVE;
    };
})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);

/**
 * # GameWindow listeners
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * www.nodegame.org
 * ---
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
/**
 * # WaitScreen for nodeGame Window
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Covers the screen with a grey layer and displays a message
 *
 * www.nodegame.org
 * ---
 */

(function(exports, window) {

    "use strict";

    // Append under window.node.
    exports.WaitScreen = WaitScreen;

    // ## Meta-data

    WaitScreen.version = '0.7.0';
    WaitScreen.description = 'Show a standard waiting screen';

    // Helper functions

    function event_REALLY_DONE(text) {
        text = text || W.waitScreen.text.waiting;
        if (W.isScreenLocked()) {
            W.waitScreen.updateText(text);
        }
        else {
            W.lockScreen(text);
        }
    }

    function event_STEPPING(text) {
        text = text || W.waitScreen.text.stepping;
        if (W.isScreenLocked()) {
            W.waitScreen.updateText(text);
        }
        else {
            W.lockScreen(text);
        }
    }
     
    function event_PLAYING() {
        if (W.isScreenLocked()) {
            W.unlockScreen();
        }
    }

    function event_PAUSED(text) {
        text = text || W.waitScreen.text.paused;
        W.lockScreen(text);
    }
    
    function event_RESUMED() {
        if (W.isScreenLocked()) {
            W.unlockScreen();
        }
    }

    /**
     * ## WaitScreen constructor
     *
     * Instantiates a new WaitScreen object 
     *
     * @param {object} options Optional. Configuration options.
     */
    function WaitScreen(options) {
        options = options || {};
	this.id = options.id || 'ng_waitScreen';
        this.root = options.root || null;

	this.text = {
            waiting: options.waitingText ||
                'Waiting for other players to be done...',
            stepping: options.steppingText ||
                'Initializing game step, will be ready soon...',
            paused: options.pausedText ||
                'Game is paused. Please wait.'
        };
        
	this.waitingDiv = null;
        this.enable();
    }
    
    WaitScreen.prototype.lock = function(text) {
        if (!this.waitingDiv) {
            if (!this.root) {
                this.root = W.getFrameRoot() || document.body;
            }
	    this.waitingDiv = W.addDiv(this.root, this.id);
	}
	if (this.waitingDiv.style.display === 'none') {
	    this.waitingDiv.style.display = '';
	}
	this.waitingDiv.innerHTML = text;
    };

    WaitScreen.prototype.unlock = function() {
        if (this.waitingDiv) {
            if (this.waitingDiv.style.display === '') {
                this.waitingDiv.style.display = 'none';
            }
        }
    };

    WaitScreen.prototype.updateText = function(text, append) {
        append = append || false;
        if ('string' !== typeof text) {
            throw new TypeError('WaitScreen.updateText: text must be string.');
        }
        if (append) {
            this.waitingDiv.appendChild(document.createTextNode(text));
        }
        else {
            this.waitingDiv.innerHTML = text;
        }
    };

    WaitScreen.prototype.enable = function(disable) {
        if (disable === false || disable === null) {
            node.off('REALLY_DONE', event_REALLY_DONE);
            node.off('STEPPING', event_STEPPING);
            node.off('PLAYING', event_PLAYING);
            node.off('RESUMED', event_PAUSED);
            node.off('RESUMED', event_RESUMED);
        }
        else {
            node.on('REALLY_DONE', event_REALLY_DONE);
            node.on('STEPPING', event_STEPPING);
            node.on('PLAYING', event_PLAYING);
            node.on('RESUMED', event_PAUSED);
            node.on('RESUMED', event_RESUMED);
        }
    };

    WaitScreen.prototype.destroy = function() {
        if (W.isScreenLocked()) {
            this.unlock();
        }
        if (this.waitingDiv) {
            this.waitingDiv.parentNode.removeChild(this.waitingDiv);
        }
    };

})(
    ('undefined' !== typeof node) ? node : module.parent.exports.node,
    ('undefined' !== typeof window) ? window : module.parent.exports.window
);

/**
 * # GameWindow selector module
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * Utility functions to create and manipulate meaninful HTML select lists for
 * nodeGame.
 *
 * http://www.nodegame.org
 * ---
 */
(function(window, node) {

    "use strict";
    
    var J = node.JSUS;
    var constants = node.constants;
    var GameWindow = node.GameWindow;

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
     * Adds valid _to_ recipient options to a specified select element.
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
        opt.value = 'CHANNEL';
        opt.appendChild(document.createTextNode('CHANNEL'));
        toSelector.appendChild(opt);

        opt = document.createElement('option');
        opt.value = 'ROOM';
        opt.appendChild(document.createTextNode('ROOM'));
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

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);

/**
 * # GameWindow extras
 * Copyright(c) 2014 Stefano Balietti
 * MIT Licensed
 *
 * http://www.nodegame.org
 * ---
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
            throw new
                Error('GameWindow.writeln: could not determine where to write.');
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
            if (!container || !container.getElementsByTagName) {
                // Frame either not existing or not ready. No warning.
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
     *   Defaults, 5
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
     * ### GameWindow.addLoadingDots
     *
     * Appends _loading dots_ to an HTML element
     *
     * By invoking this method you lose access to the _stop_ function of the
     * _loading dots_ element.
     *
     * @param {HTMLElement} root The element to which the loading dots will be
     *   appended.
     * @param {number} len Optional. The maximum length of the loading dots.
     *   Defaults, 5
     * @param {string} id Optional The id of the span
     * @return {object} The span with the loading dots.
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

})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);

// Creates a new GameWindow instance in the global scope.
(function() {
    "use strict";
    node.window = new node.GameWindow();
    if ('undefined' !== typeof window) window.W = node.window;
})();

/**
 * # Canvas class for nodeGame window
 * Copyright(c) 2014 Stefano Balietti
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
 * Copyright(c) 2014 Stefano Balietti
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
     *
     */
    HTMLRenderer.prototype.reset = function() {
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

        this.tm.addTrigger(function(el) {
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

        this.tm.addTrigger(function(el) {
            if (!el) return;
            if (el.content && el.content.parse 
                && 'function' === typeof el.content.parse) {
                var html = el.content.parse();
                if (JSUS.isElement(html) || JSUS.isNode(html)) {
                    return html;
                }
            }
        });

        this.tm.addTrigger(function(el) {
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
    HTMLRenderer.prototype.clear = function(clear) {
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
    HTMLRenderer.prototype.addRenderer = function(renderer, pos) {
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
    HTMLRenderer.prototype.removeRenderer = function(renderer) {
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
     *
     */

    /**
     * ## Entity constructor
     *
     * Creates a new instace of Entity
     *
     * @param {object} The object to transform in entity
     */
    function Entity(e) {
        e = e || {};
        this.content = ('undefined' !== typeof e.content) ? e.content : '';
        this.className = ('undefined' !== typeof e.style) ? e.style : null;
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports,
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof node) ? node : module.parent.exports.node
);
/**
 * # List class for nodeGame window
 * Copyright(c) 2014 Stefano Balietti
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
 * Copyright(c) 2014 Stefano Balietti
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

    var J = node.JSUS;
    var NDDB = node.NDDB;
    var HTMLRenderer = node.window.HTMLRenderer;
    var Entity = node.window.HTMLRenderer.Entity;

    Table.prototype = new NDDB();
    Table.prototype.constructor = Table;

    Table.H = ['x', 'y', 'z'];
    Table.V = ['y', 'x', 'z'];

    Table.log = node.log;

    /**
     * Table constructor
     *
     * Creates a new Table object
     *
     * @param {object} options Optional. Configuration for NDDB
     * @param {array} data Optional. Array of initial items
     */
    function Table(options, data) {
        options = options || {};
        // Updates indexes on the fly.
        if (!options.update) options.update = {};
        if ('undefined' === typeof options.update.indexes) {
            options.update.indexes = true;
        }

        NDDB.call(this, options, data);

        if (!this.row) {
            this.index('row', function(c) {
                return c.x;
            });
        }
        if (!this.col) {
            this.index('col', function(c) {
                return c.y;
            });
        }
        if (!this.rowcol) {
            this.index('rowcol', function(c) {
                return c.x + '_' + c.y;
            });
        }

        this.defaultDim1 = options.defaultDim1 || 'x';
        this.defaultDim2 = options.defaultDim2 || 'y';
        this.defaultDim3 = options.defaultDim3 || 'z';

        this.table = options.table || document.createElement('table');
        this.id = options.id ||
            'table_' + Math.round(Math.random() * 1000);

        this.auto_update = 'undefined' !== typeof options.auto_update ?
            options.auto_update : false;

        // Class for missing cells.
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

        if ('undefined' !== typeof options.id) {
            this.table.id = options.id;
            this.id = options.id;
        }
        if (options.className) {
            this.table.className = options.className;
        }

        // Init renderer.
        this.initRenderer(options.render);
    }

    /**
     * Table.initRenderer
     *
     * Inits the `HTMLRenderer` object and adds a renderer for objects.
     *
     * @param {object} options Optional. Configuration for the renderer
     *
     * @see HTMLRenderer
     * @see HTMLRenderer.addRenderer
     */
    Table.prototype.initRenderer = function(options) {
        options = options || {};
        this.htmlRenderer = new HTMLRenderer(options);
        this.htmlRenderer.addRenderer(function(el) {
            var tbl, key;
            if ('object' === typeof el.content) {
                tbl = new Table();
                for (key in el.content) {
                    if (el.content.hasOwnProperty(key)){
                        tbl.addRow([key,el.content[key]]);
                    }
                }
                return tbl.parse();
            }
        }, 2);
    };

    /**
     * Table.get
     *
     * Returns the element at row column (x,y)
     *
     * @param {number} row The row number
     * @param {number} col The column number
     *
     * @see HTMLRenderer
     * @see HTMLRenderer.addRenderer
     */
    Table.prototype.get = function(row, col) {
        if ('undefined' !== typeof row && 'number' !== typeof row) {
            throw new TypeError('Table.get: row must be number.');
        }
        if ('undefined' !== typeof col && 'number' !== typeof col) {
            throw new TypeError('Table.get: col must be number.');
        }

        if ('undefined' === typeof row) {
            return this.col.get(col);
        }
        if ('undefined' === typeof col) {
            return this.row.get(row);
        }

        return this.rowcol.get(row + '_' + col);
    };

    /**
     * ## Table.addClass
     *
     * Adds a CSS class to each element cell in the table
     *
     * @param {string|array} The name of the class/classes.
     *
     * return {Table} This instance for chaining.
     */
    Table.prototype.addClass = function(className) {
        if ('string' !== typeof className && !J.isArray(className)) {
            throw new TypeError('Table.addClass: className must be string or ' +
                                'array.');
        }
        if (J.isArray(className)) {
            className = className.join(' ');
        }

        this.each(function(el) {
            W.addClass(el, className);
        });

        if (this.auto_update) {
            this.parse();
        }

        return this;
    };

    /**
     * ## Table.removeClass
     *
     * Removes a CSS class from each element cell in the table
     *
     * @param {string|array} The name of the class/classes.
     *
     * return {Table} This instance for chaining.
     */
    Table.prototype.removeClass = function(className) {
        var func;
        if ('string' !== typeof className && !J.isArray(className)) {
            throw new TypeError('Table.removeClass: className must be string ' +
                                'or array.');
        }

        if (J.isArray(className)) {
            func = function(el, className) {
                for (var i = 0; i < className.length; i++) {
                    W.removeClass(el, className[i]);
                }
            };
        }
        else {
            func = W.removeClass;
        }

        this.each(function(el) {
            func.call(this, el, className);
        });

        if (this.auto_update) {
            this.parse();
        }

        return this;
    };

    
    Table.prototype._addSpecial = function(data, type) {
        var out, i;
        if (!data) return;
        type = type || 'header';
        if ('object' !== typeof data) {
            return {content: data, type: type};
        }

        out = [];
        for (i = 0; i < data.length; i++) {
            out.push({content: data[i], type: type});
        }
        return out;
    };

    /**
     * ## Table.setHeader
     *
     * Set the headers for the table
     *
     * @param {string|array} Array of strings representing the header
     */
    Table.prototype.setHeader = function(header) {
        this.header = this._addSpecial(header, 'header');
    };

    Table.prototype.add2Header = function(header) {
        this.header = this.header.concat(this._addSpecial(header));
    };

    Table.prototype.setLeft = function(left) {
        this.left = this._addSpecial(left, 'left');
    };

    Table.prototype.add2Left = function(left) {
        this.left = this.left.concat(this._addSpecial(left, 'left'));
    };

    // TODO: setRight
    //Table.prototype.setRight = function(left) {
    //  this.right = this._addSpecial(left, 'right');
    //};

    Table.prototype.setFooter = function(footer) {
        this.footer = this._addSpecial(footer, 'footer');
    };

    Table._checkDim123 = function(dims) {
        var t = Table.H.slice(0);
        for (var i=0; i< dims.length; i++) {
            if (!J.removeElement(dims[i],t)) return false;
        }
        return true;
    };

    /**
     * Updates the reference to the foremost element in the table.
     *
     * @param
     */
    Table.prototype.updatePointer = function(pointer, value) {
        if (!pointer) return false;
        if (!J.in_array(pointer, Table.H)) {
            Table.log('Cannot update invalid pointer: ' + pointer, 'ERR');
            return false;
        }

        if (value > this.pointers[pointer]) {
            this.pointers[pointer] = value;
            return true;
        }

    };

    Table.prototype._add = function(data, dims, x, y, z) {
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

        var insertCell = function(content) {
            //Table.log('content');
            //Table.log(x + ' ' + y + ' ' + z);
            //Table.log(i + ' ' + j + ' ' + h);

            var cell = {};
            cell[dims[0]] = i; // i always defined
            cell[dims[1]] = (j) ? y + j : y;
            cell[dims[2]] = (h) ? z + h : z;
            cell.content = content;
            //Table.log(cell);
            this.insert(new Cell(cell));
            this.updatePointer(dims[0], cell[dims[0]]);
            this.updatePointer(dims[1], cell[dims[1]]);
            this.updatePointer(dims[2], cell[dims[2]]);
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

    Table.prototype.add = function(data, x, y) {
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

    Table.prototype.addColumn = function(data, x, y) {
        if (!data) return false;
        return this._add(data, Table.V, x, y);
    };

    Table.prototype.addRow = function(data, x, y) {
        if (!data) return false;
        return this._add(data, Table.H, x, y);
    };

    //Table.prototype.bind = function(dim, property) {
    //this.binds[property] = dim;
    //};

    // TODO: Only 2D for now
    // TODO: improve algorithm, rewrite
    Table.prototype.parse = function() {
        var TABLE, TR, TD, THEAD, TBODY, TFOOT;
        var i, trid, f, old_x, old_left;
        var diff, j;

        // Create a cell element (td,th...)
        // and fill it with the return value of a
        // render value.
        var fromCell2TD = function(cell, el) {
            var TD, content;
            if (!cell) return;
            el = el || 'td';
            TD = document.createElement(el);
            content = this.htmlRenderer.render(cell);
            //var content = (!J.isNode(c) || !J.isElement(c)) ? document.createTextNode(c) : c;
            TD.appendChild(content);
            if (cell.className) TD.className = cell.className;
            return TD;
        };

        if (this.table) {
            while (this.table.hasChildNodes()) {
                this.table.removeChild(this.table.firstChild);
            }
        }

        TABLE = this.table;

        // HEADER
        if (this.header && this.header.length > 0) {
            THEAD = document.createElement('thead');
            TR = document.createElement('tr');
            // Add an empty cell to balance the left header column.
            if (this.left && this.left.length > 0) {
                TR.appendChild(document.createElement('th'));
            }
            for (i=0; i < this.header.length; i++) {
                TR.appendChild(fromCell2TD.call(this, this.header[i], 'th'));
            }
            THEAD.appendChild(TR);
            TABLE.appendChild(THEAD);
            i = 0;
        }

        // BODY
        if (this.size()) {
            TBODY = document.createElement('tbody');

            this.sort(['y','x']); // z to add first
            trid = -1;
            // TODO: What happens if the are missing at the beginning ??
            f = this.first();
            old_x = f.x;
            old_left = 0;

            for (i=0; i < this.db.length; i++) {
                //console.log('INSIDE TBODY LOOP');
                //console.log(this.id);
                if (trid !== this.db[i].y) {
                    TR = document.createElement('tr');
                    TBODY.appendChild(TR);
                    trid = this.db[i].y;
                    //Table.log(trid);
                    old_x = f.x - 1; // must start exactly from the first

                    // Insert left header, if any.
                    if (this.left && this.left.length) {
                        TD = document.createElement('td');
                        //TD.className = this.missing;
                        TR.appendChild(fromCell2TD.call(this, this.left[old_left]));
                        old_left++;
                    }
                }

                // Insert missing cells.
                if (this.db[i].x > old_x + 1) {
                    diff = this.db[i].x - (old_x + 1);
                    for (j = 0; j < diff; j++ ) {
                        TD = document.createElement('td');
                        TD.className = this.missing;
                        TR.appendChild(TD);
                    }
                }
                // Normal Insert.
                TR.appendChild(fromCell2TD.call(this, this.db[i]));

                // Update old refs.
                old_x = this.db[i].x;
            }
            TABLE.appendChild(TBODY);
        }


        // FOOTER.
        if (this.footer && this.footer.length > 0) {
            TFOOT = document.createElement('tfoot');
            TR = document.createElement('tr');
            for (i=0; i < this.header.length; i++) {
                TR.appendChild(fromCell2TD.call(this, this.footer[i]));
            }
            TFOOT.appendChild(TR);
            TABLE.appendChild(TFOOT);
        }

        return TABLE;
    };

    /**
     * ## Table.resetPointers
     *
     * Reset all pointers to 0 or to the value of the input parameter
     *
     * @param {object} pointers Optional. Objects contains the new pointers
     */
    Table.prototype.resetPointers = function(pointers) {
        if (pointers && 'object' !== typeof pointers) {
            throw new TypeError('Table.resetPointers: pointers must be ' +
                                'object or undefined.');
        }
        pointers = pointers || {};
        this.pointers = {
            x: pointers.pointerX || 0,
            y: pointers.pointerY || 0,
            z: pointers.pointerZ || 0
        };
    };

    /**
     * ## Table.clear
     *
     * Removes all entries and indexes, and resets the pointers
     *
     * @param {boolean} confirm TRUE, to confirm the operation.
     *
     * @see NDDB.clear
     */
    Table.prototype.clear = function(confirm) {
        if (NDDB.prototype.clear.call(this, confirm)) {
            this.resetPointers();
        }
    };

    // Cell Class
    Cell.prototype = new Entity();
    Cell.prototype.constructor = Cell;

    /**
     * ## Cell.
     *
     * Creates a new Cell
     *
     * @param {object} cell An object containing the coordinates in the table
     *
     * @see Entity
     */
    function Cell(cell) {
        Entity.call(this, cell);
        this.x = ('undefined' !== typeof cell.x) ? cell.x : null;
        this.y = ('undefined' !== typeof cell.y) ? cell.y : null;
        this.z = ('undefined' !== typeof cell.z) ? cell.z : null;
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports,
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof node) ? node : module.parent.exports.node
);