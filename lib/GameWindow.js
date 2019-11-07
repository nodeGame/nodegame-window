/**
 * # GameWindow
 * Copyright(c) 2019 Stefano Balietti <ste@nodegame.org>
 * MIT Licensed
 *
 * API to interface nodeGame with the browser window
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
 */
(function(window, node) {

    "use strict";

    var DOM;

    var constants, windowLevels, screenLevels;
    var CB_EXECUTED, WIN_LOADING, lockedUpdate;

    if (!J) throw new Error('GameWindow: JSUS not found');
    DOM = J.require('DOM');
    if (!DOM) throw new Error('GameWindow: J.require("DOM") failed');

    constants = node.constants;
    windowLevels = constants.windowLevels;
    screenLevels = constants.screenLevels;

    CB_EXECUTED = constants.stageLevels.CALLBACK_EXECUTED;

    WIN_LOADING = windowLevels.LOADING;

    // Allows just one update at the time to the counter of loading frames.
    lockedUpdate = false;

    GameWindow.prototype = DOM;
    GameWindow.prototype.constructor = GameWindow;

    // Configuration object.
    GameWindow.defaults = {};

    // Default settings.
    GameWindow.defaults.promptOnleaveText = '';
    GameWindow.defaults.promptOnleave = true;
    GameWindow.defaults.noEscape = true;
    GameWindow.defaults.waitScreen = undefined;
    GameWindow.defaults.disableRightClick = false;
    GameWindow.defaults.cacheDefaults = {
        loadCache:       true,
        storeCacheNow:   false,
        storeCacheLater: false
    };
    GameWindow.defaults.infoPanel = undefined;

    function onLoadStd(iframe, cb) {
        var iframeWin;
        iframeWin = iframe.contentWindow;

        function completed(event) {
            var iframeDoc;
            iframeDoc = J.getIFrameDocument(iframe);

            // Detaching the function to avoid double execution.
            iframe.removeEventListener('load', completed, false);
            iframeWin.removeEventListener('load', completed, false);
            if (cb) {
                // Some browsers fire onLoad too early.
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

            // IE < 10 (also 11?) gives 'Permission Denied' if trying to access
            // the iframeDoc from the context of the function above.
            // We need to re-get it from the DOM.
            iframeDoc = J.getIFrameDocument(iframe);

            // readyState === "complete" works also in oldIE.
            if (event.type === 'load' ||
                iframeDoc.readyState === 'complete') {

                // Detaching the function to avoid double execution.
                iframe.detachEvent('onreadystatechange', completed );
                iframeWin.detachEvent('onload', completed );

                if (cb) {
                    // Some browsers fire onLoad too early.
                    // A small timeout is enough.
                    setTimeout(function() { cb(); }, 120);
                }
            }
        }

        // Ensure firing before onload, maybe late but safe also for iframes.
        iframe.attachEvent('onreadystatechange', completed);

        // A fallback to window.onload, that will always work.
        iframeWin.attachEvent('onload', completed);
    }

    function onLoad(iframe, cb) {
        // IE
        if (W.isIE) {
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
     * Creates the GameWindow object
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

        node.silly('node-window: loading...');

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
         * You can get this element also by:
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
         * ### GameWindow.headerPosition
         *
         * The relative position of the header on the screen
         *
         * Available positions: 'top', 'bottom', 'left', 'right'.
         *
         * @see GameWindow.setHeaderPosition
         */
        this.headerPosition = null;

        /**
         * ### GameWindow.defaultHeaderPosition
         *
         * The default header position. 'top'.
         */
        this.defaultHeaderPosition = 'top';

        /**
         * ### GameWindow.conf
         *
         * Object containing the current configuration
         */
        this.conf = {};

        /**
         * ### GameWindow.uriChannel
         *
         * The uri of the channel on the server
         *
         * It is not the socket.io channel, but the HTTP address.
         *
         * @see GameWindow.loadFrame
         */
        this.uriChannel = null;

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
         * ### GameWindow.cacheSupported
         *
         * Flag that direct access to the iframe content is allowed
         *
         * Usually false, on IEs
         *
         * @see testdirectFrameDocumentAccess
         */
        this.directFrameDocumentAccess = null;

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
         * Maps frame names (e.g. 'ng_mainframe') to the (processed) URIs
         * that they are showing.
         *
         * @see GameWindow.preCache
         * @see GameWindow.processUri
         *
         * TODO: check: this is still having the test frame, should it be
         * removed instead?
         */
        this.currentURIs = {};

        /**
         * ### GameWindow.unprocessedUri
         *
         * The uri parameter passed to `loadFrame`, still unprocessed
         *
         * @see GameWindow.currentURIs
         * @see GameWindow.processUri
         */
        this.unprocessedUri = null;

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
         * ### GameWindow.uriPrefix
         *
         * A prefix added to every loaded uri that does not begin with `/`
         *
         * Useful for example to add a language path (e.g. a language
         * directory) that matches a specific context of a view.
         *
         * @see GameWindow.loadFrame
         * @see LanguageSelector (widget)
         */
        this.uriPrefix = null;

        /**
         * ### GameWindow.stateLevel
         *
         * The window's state level
         *
         * @see constants.windowLevels
         */
        this.stateLevel = null;

        /**
         * ### GameWindow.waitScreen
         *
         * Reference to the _WaitScreen_ module
         *
         * @see node.widgets.WaitScreen
         */
        this.waitScreen = null;

        /**
         * ### GameWindow.listenersAdded
         *
         * TRUE, if listeners were added already
         *
         * @see GameWindow.addDefaultListeners
         */
        this.listenersAdded = null;

        /**
         * ### GameWindow.screenState
         *
         * Level describing whether the user can interact with the frame
         *
         * The _screen_ represents all the user can see on screen.
         * It includes the _frame_ area, but also the _header_.
         *
         * @see node.widgets.WaitScreen
         * @see node.constants.screenLevels
         */
        this.screenState = node.constants.screenLevels.ACTIVE;

        /**
         * ### GameWindow.styleElement
         *
         * A style element for on-the-fly styling
         *
         * @see GameWindow.cssRule
         */
        this.styleElement = null;

        /**
         * ### GameWindow.isIE
         *
         * Boolean flag saying whether we are in IE or not
         */
        this.isIE = !!document.createElement('span').attachEvent;

        /**
         * ### GameWindow.headerOffset
         *
         * Contains the current offset (widht or height) for the header
         *
         * Content below/above/next to it needs to be slided accordingly.
         *
         * @see W.adjustHeaderOffset
         */
        this.headerOffset = 0;

        /**
         * ### GameWindow.willResizeFrame
         *
         * Boolean flag saying whether a call to resize the frame is in progress
         *
         * @see W.adjustFrameHeight
         */
        this.willResizeFrame = false;

        // Add setup functions.
        this.addDefaultSetups();

        // Adding listeners.
        this.addDefaultListeners();

        // Hide noscript tag (necessary for IE8).
        setTimeout(function(){
            (function (scriptTag) {
                if (scriptTag.length >= 1) scriptTag[0].style.display = 'none';
            })(document.getElementsByTagName('noscript'));
        }, 1000);

        // Init.
        this.init(GameWindow.defaults);

        node.silly('node-window: created.');
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
        var stageLevels;
        var stageLevel;

        this.setStateLevel('INITIALIZING');
        options = options || {};
        this.conf = J.merge(this.conf, options);

        if (this.conf.promptOnleave) {
            this.promptOnleave();
        }
        else if (this.conf.promptOnleave === false) {
            this.restoreOnleave();
        }

        if ('undefined' === typeof this.conf.noEscape || this.conf.noEscape) {
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

            stageLevels = constants.stageLevels;
            stageLevel = node.game.getStageLevel();
            if (stageLevel !== stageLevels.UNINITIALIZED) {
                if (node.game.paused) {
                    this.lockScreen(this.waitScreen.defaultTexts.paused);
                }
                else {
                    if (stageLevel === stageLevels.DONE) {
                        this.lockScreen(this.waitScreen.defaultTexts.waiting);
                    }
                    else if (stageLevel !== stageLevels.PLAYING) {
                        this.lockScreen(this.waitScreen.defaultTexts.stepping);
                    }
                }
            }
        }
        else if (this.waitScreen) {
            this.waitScreen.destroy();
            this.waitScreen = null;
        }

        if (this.conf.defaultHeaderPosition) {
            this.defaultHeaderPosition = this.conf.defaultHeaderPosition;
        }

        if (this.conf.disableRightClick) {
            this.disableRightClick();
        }
        else if (this.conf.disableRightClick === false) {
            this.enableRightClick();
        }

        if ('undefined' !== typeof this.conf.disableBackButton) {
            this.disableBackButton(this.conf.disableBackButton);
        }

        if ('undefined' !== typeof this.conf.uriPrefix) {
            this.setUriPrefix(this.conf.uriPrefix);
        }

        this.setStateLevel('INITIALIZED');

        node.silly('node-window: inited.');
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
        if (this.isScreenLocked()) this.unlockScreen();

        // Remove widgets, if widgets exists.
        if (node.widgets) node.widgets.destroyAll();

        // Remove loaded frame, if one is found.
        if (this.getFrame()) this.destroyFrame();

        // Remove header, if one is found.
        if (this.getHeader()) this.destroyHeader();

        this.areLoading = 0;

        // Clear all caches.
        this.clearCache();

        node.silly('node-window: reseted');
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
            throw new TypeError('GameWindow.setStateLevel: level must ' +
                                'be string. Found: ' + level);
        }
        if ('undefined' === typeof windowLevels[level]) {
            throw new Error('GameWindow.setStateLevel: unrecognized level: ' +
                            level);
        }
        this.stateLevel = windowLevels[level];
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
        return this.stateLevel;
    };

    /**
     * ### GameWindow.isReady
     *
     * Returns TRUE if the GameWindow is ready
     *
     * The window is ready if its state is either INITIALIZED or LOADED.
     *
     * @return {boolean} TRUE if the window is ready
     */
    GameWindow.prototype.isReady = function() {
        return this.stateLevel === windowLevels.LOADED ||
            this.stateLevel === windowLevels.INITIALIZED;
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
            throw new TypeError('GameWindow.setScreenLevel: level must ' +
                                'be string. Found: ' + level);
        }
        if ('undefined' === typeof screenLevels[level]) {
            throw new Error('GameWindow.setScreenLevel: unrecognized level: ' +
                            level);
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
        if (!this.frameName || this.stateLevel === WIN_LOADING) {
            iframe = this.getFrame();
            this.frameName = iframe ? iframe.name || iframe.id : null;
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
        if (!this.frameWindow || this.stateLevel === WIN_LOADING) {
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
     * @see GameWindow.testDirectFrameDocumentAccess
     */
    GameWindow.prototype.getFrameDocument = function() {
        var iframe;
        if (!this.frameDocument || this.stateLevel === WIN_LOADING) {
            iframe = this.getFrame();
            if (!iframe) return null;
            this.frameDocument = this.getIFrameDocument(iframe);
        }
        // Some IEs give permission denied when accessing the frame document
        // directly. We need to re-get it from the DOM.
        if (this.directFrameDocumentAccess) return this.frameDocument;
        else return J.getIFrameDocument(this.getFrame());
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
     *   will be appended. Default: this.frameRoot or document.body
     * @param {string} frameName Optional. The name of the iframe. Default:
     *   'ng_mainframe'
     * @param {boolean} force Optional. Will create the frame even if an
     *   existing one is found. Default: FALSE
     *
     * @return {IFrameElement} The newly created iframe
     *
     * @see GameWindow.frameElement
     * @see GameWindow.frameWindow
     * @see GameWindow.frameDocument
     * @see GameWindow.setFrame
     * @see GameWindow.clearFrame
     * @see GameWindow.destroyFrame
     *
     * @emit FRAME_GENERATED
     */
    GameWindow.prototype.generateFrame = function(root, frameName, force) {
        var iframe;
        if (this.frameElement) {
            if (!force) {
                throw new Error('GameWindow.generateFrame: frame is ' +
                                'already existing. Use force to regenerate.');
            }
            this.destroyFrame();
        }

        root = root || this.frameRoot || document.body;

        if (!J.isElement(root)) {
            throw new Error('GameWindow.generateFrame: root must be ' +
                            'undefined or HTMLElement. Found: ' + root);
        }

        frameName = frameName || 'ng_mainframe';

        if ('string' !== typeof frameName || frameName.trim() === '') {
            throw new Error('GameWindow.generateFrame: frameName must be ' +
                            'undefined or a non-empty string. Found: ' +
                            frameName);
        }

        if (document.getElementById(frameName)) {
            throw new Error('GameWindow.generateFrame: frameName is not ' +
                            'unique in DOM: ' + frameName);
        }

        iframe = W.add('iframe', root, frameName);
        // Method .replace does not add the uri to the history.
        iframe.contentWindow.location.replace('about:blank');

        // For IE8.
        iframe.frameBorder = 0;

        // Avoid scrolling.
        iframe.scrolling = "no";

        this.setFrame(iframe, frameName, root);

        if (this.getHeader()) adaptFrame2HeaderPosition();

        // Emit event.
        node.events.ng.emit('FRAME_GENERATED', iframe);

        // Add listener on resizing the page.
        document.body.onresize = function() {
            W.adjustFrameHeight(0, 120);
        };

        return iframe;
    };

    /**
     * ### GameWindow.generateInfoPanel
     *
     * Appends a configurable div element at to "top" of the page
     *
     * @param {Element} root Optional. The HTML element to which the info
     *   panel will be appended. Default:
     *
     *   - above the main frame, or
     *   - below the header, or
     *   - inside _documents.body_.
     *
     * @param {string} frameName Optional. The name of the iframe. Default:
     *   'ng_mainframe'
     * @param {boolean} force Optional. Will create the frame even if an
     *   existing one is found. Default: FALSE
     *
     * @return {InfoPanel} A reference to the InfoPanel object
     *
     * @see GameWindow.infoPanel
     *
     * @emit INFOPANEL_GENERATED
     */
    GameWindow.prototype.generateInfoPanel = function(root, options, force) {
        var infoPanelDiv;

        if (this.infoPanel) {
            if (!force) {
                throw new Error('GameWindow.generateInfoPanel: info panel is ' +
                                'already existing. Use force to regenerate.');
            }
            else {
                this.infoPanel.destroy();
                this.infoPanel = null;
            }
        }
        options = options || {};

        this.infoPanel = new node.InfoPanel(options);
        infoPanelDiv = this.infoPanel.infoPanelDiv;

        root = options.root;
        if (root) {
            if (!J.isElement(root)) {
                throw new Error('GameWindow.generateInfoPanel: root must be ' +
                                'undefined or HTMLElement. Found: ' + root);
            }
            root.appendChild(infoPanelDiv);
        }
        else if (this.frameElement) {
            document.body.insertBefore(infoPanelDiv, this.frameElement);
        }
        else if (this.headerElement) {
           J.insertAfter(this.headerElement, infoPanelDiv);
        }
        else {
            document.body.appendChild(infoPanelDiv);
        }

        // Emit event.
        node.events.ng.emit('INFOPANEL_GENERATED', this.infoPanel);

        return this.infoPanel;
    };

    /**
     * ### GameWindow.setFrame
     *
     * Sets the new default frame and update other references
     *
     * @param {IFrameElement} iframe The new default frame
     * @param {string} frameName The name of the iframe
     * @param {Element} root The HTML element to which the iframe is appended
     *
     * @return {IFrameElement} The new default iframe
     *
     * @see GameWindow.generateFrame
     */
    GameWindow.prototype.setFrame = function(iframe, iframeName, root) {
        if (!J.isElement(iframe)) {
            throw new TypeError('GameWindow.setFrame: iframe must be ' +
                                'HTMLElement. Found: ' + iframe);
        }
        if ('string' !== typeof iframeName) {
            throw new TypeError('GameWindow.setFrame: iframeName must be ' +
                                'string. Found: ' + iframeName);
        }
        if (!J.isElement(root)) {
            throw new TypeError('GameWindow.setFrame: root must be ' +
                                'HTMLElement. Found: ' + root);
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
        if (this.frameRoot) this.frameRoot.removeChild(this.frameElement);
        this.frameElement = null;
        this.frameWindow = null;
        this.frameDocument = null;
        this.frameRoot = null;

        // Destroy lost widgets.
        node.widgets.garbageCollection();
    };

    /**
     * ### GameWindow.clearFrame
     *
     * Clears the content of the frame
     */
    GameWindow.prototype.clearFrame = function() {
        var iframe, frameName, frameDocument;
        iframe = this.getFrame();
        if (!iframe) {
            throw new Error('GameWindow.clearFrame: frame not found');
        }

        frameName = iframe.name || iframe.id;
        iframe.onload = null;

        // Method .replace does not add the uri to the history.
        //iframe.contentWindow.location.replace('about:blank');

        frameDocument = this.getFrameDocument();
        frameDocument.documentElement.innerHTML = '';

        if (this.directFrameDocumentAccess) {
            frameDocument.documentElement.innerHTML = '';
        }
        else {
            J.removeChildrenFromNode(frameDocument.documentElement);
        }

// TODO: cleanup refactor.
//         try {
//             this.getFrameDocument().documentElement.innerHTML = '';
//         }
//         catch(e) {
//             // IE < 10 gives 'Permission Denied' if trying to access
//             // the iframeDoc from the context of the function above.
//             // We need to re-get it from the DOM.
//             if (J.getIFrameDocument(iframe).documentElement) {
//                 J.removeChildrenFromNode(
//                     J.getIFrameDocument(iframe).documentElement);
//             }
//         }

        this.frameElement = iframe;
        this.frameWindow = window.frames[frameName];
        this.frameDocument = W.getIFrameDocument(iframe);

        // Destroy lost widgets.
        node.widgets.garbageCollection();
    };

    /**
     * ### GameWindow.generateHeader
     *
     * Adds a a div element and sets it as the header of the page
     *
     * @param {Element} root Optional. The HTML element to which the header
     *   will be appended. Default: _document.body_ or
     *   _document.lastElementChild_
     * @param {string} headerName Optional. The name (id) of the header.
     *   Default: 'ng_header'
     * @param {boolean} force Optional. Destroys the existing header,
     *   if found. Default: FALSE
     *
     * @return {Element} The header element
     */
    GameWindow.prototype.generateHeader = function(root, headerName, force) {
        var header;

        if (this.headerElement) {
            if (!force) {
                throw new Error('GameWindow.generateHeader: header is ' +
                                'already existing. Use force to regenerate.');
            }
            this.destroyHeader();
        }

        root = root || document.body || document.lastElementChild;

        if (!J.isElement(root)) {
            throw new Error('GameWindow.generateHeader: root must be ' +
                            'undefined or HTMLElement. Found: ' + root);
        }

        headerName = headerName || 'ng_header';

        if ('string' !== typeof headerName) {
            throw new Error('GameWindow.generateHeader: headerName must be ' +
                            'string. Found: ' + headerName);
        }

        if (document.getElementById(headerName)) {
            throw new Error('GameWindow.generateHeader: headerName is not ' +
                            'unique in DOM: ' + headerName);
        }

        header = this.add('div', root, headerName);

        // If generateHeader is called after generateFrame, and the default
        // header position is not bottom, we need to move the header in front.
        if (this.frameElement && this.defaultHeaderPosition !== 'bottom') {
            this.getFrameRoot().insertBefore(header, this.frameElement);
        }

        this.setHeader(header, headerName, root);
        this.setHeaderPosition(this.defaultHeaderPosition);

        return header;
    };


    /**
     * ### GameWindow.setHeaderPosition
     *
     * Sets the header's position on the screen
     *
     * Positioning of the frame element is also affected, if existing, or if
     * added later.
     *
     * @param {string} position New position, one of
     *   'top', 'bottom', 'left', 'right'
     *
     * @see GameWindow.generateHeader
     * @see GameWindow.headerPosition
     * @see GameWindow.defaultHeaderPosition
     * @see adaptFrame2HeaderPosition
     */
    GameWindow.prototype.setHeaderPosition = (function() {
        var validPositions;
        // Map: position - css class.
        validPositions = {
            top: 'ng_header_position-horizontal-t',
            bottom: 'ng_header_position-horizontal-b',
            right: 'ng_header_position-vertical-r',
            left: 'ng_header_position-vertical-l'
        };

        return function(position) {
            var pos, oldPos;
            if ('string' !== typeof position) {
                throw new TypeError('GameWindow.setHeaderPosition: position ' +
                                    'must be string. Found: ' + position);
            }
            pos = position.toLowerCase();

            // Do something only if there is a change in the position.
            if (this.headerPosition === pos) return;

            if ('undefined' === typeof validPositions[pos]) {
                node.err('GameWindow.setHeaderPosition: invalid header ' +
                         'position: ' + pos);
                return;
            }
            if (!this.headerElement) {
                throw new Error('GameWindow.setHeaderPosition: headerElement ' +
                                'not found.');
            }

            W.removeClass(this.headerElement, 'ng_header_position-[a-z-]*');
            W.addClass(this.headerElement, validPositions[pos]);

            oldPos = this.headerPosition;

            // Store the new position in a reference variable
            // **before** adaptFrame2HeaderPosition is called
            this.headerPosition = pos;

            if (this.frameElement) adaptFrame2HeaderPosition(oldPos);
        };
    })();

    /**
     * ### GameWindow.setHeader
     *
     * Sets the new header element and update related references
     *
     * @param {HTMLElement} header The new header
     * @param {string} headerName The name of the header
     * @param {HTMLElement} root The element to which the header is appended
     *
     * @return {HTMLElement} The header
     *
     * @see GameWindow.generateHeader
     */
    GameWindow.prototype.setHeader = function(header, headerName, root) {
        if (!J.isElement(header)) {
            throw new Error(
                'GameWindow.setHeader: header must be HTMLElement. Found: ' +
                    header);
        }
        if ('string' !== typeof headerName) {
            throw new Error('GameWindow.setHeader: headerName must be ' +
                            'string. Found: ' + headerName);
        }
        if (!J.isElement(root)) {
            throw new Error('GameWindow.setHeader: root must be ' +
                            'HTMLElement. Found: ' + root);
        }

        this.headerElement = header;
        this.headerName = headerName;
        this.headerRoot = root;

        // Emit event.
        node.events.ng.emit('HEADER_GENERATED', header);

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
        this.headerPosition = null;
        this.headerOffset = 0;
        this.adjustHeaderOffset(true);
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
            throw new Error('GameWindow.clearHeader: cannot detect header');
        }
        this.headerElement.innerHTML = '';

        // Destroy lost widgets.
        node.widgets.garbageCollection();
    };

    /**
     * ### GameWindow.initLibs
     *
     * Specifies the libraries to be loaded automatically in the iframe
     *
     * Multiple calls to _initLibs_ append the new libs to the list.
     * Deletion must be done manually.
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
        if (globalLibs && !J.isArray(globalLibs)) {
            throw new TypeError('GameWindow.initLibs: globalLibs must be ' +
                                'array or undefined. Found: ' + globalLibs);
        }
        if (frameLibs && 'object' !== typeof frameLibs) {
            throw new TypeError('GameWindow.initLibs: frameLibs must be ' +
                                'object or undefined. Found: ' + frameLibs);
        }
        if (!globalLibs && !frameLibs) {
            throw new Error('GameWindow.initLibs: frameLibs and frameLibs ' +
                            'cannot be both undefined.');
        }
        this.globalLibs = this.globalLibs.concat(globalLibs || []);
        J.mixin(this.frameLibs, frameLibs);
    };

    /**
     * ### GameWindow.preCacheTest
     *
     * Tests whether preChace is supported by the browser
     *
     * Results are stored in _GameWindow.cacheSupported_.
     *
     * @param {function} cb Optional. The function to call once the test if
     *   finished. It will be called regardless of success or failure.
     * @param {string} uri Optional. The URI to test. Default:
     *   '/pages/testpage.htm'
     *
     * @see GameWindow.cacheSupported
     */
    GameWindow.prototype.preCacheTest = function(cb, uri) {
        var iframe, iframeName;
        uri = uri || '/pages/testpage.htm';
        if ('string' !== typeof uri) {
            throw new TypeError('GameWindow.precacheTest: uri must string ' +
                                'or undefined. Found: ' + uri);
        }
        iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframeName = 'preCacheTest';
        iframe.id = iframeName;
        iframe.name = iframeName;
        document.body.appendChild(iframe);
        iframe.contentWindow.location.replace(uri);
        onLoad(iframe, function() {
            //var iframe, docElem;
            try {
                W.getIFrameDocument(iframe).documentElement.innerHTML = 'a';
                // This passes in IE8, but the rest of the caching doesn't.
                // We want this test to fail in IE8.
                //iframe = document.getElementById(iframeName);
                //docElem = W.getIFrameDocument(iframe);
                //docElem.innerHTML = 'a';
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
     * All uri to precache are parsed with `GameWindow.processUri` before
     * being loaded.
     *
     * @param {string|array} uris The URI(s) to cache
     * @param {function} callback Optional. The function to call once the
     *   caching is done
     *
     * @see GameWindow.cacheSupported
     * @see GameWindow.preCacheTest
     * @see GameWindow.processUri
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
                                'or array. Found: ' + uris);
        }
        if (callback && 'function' !== typeof callback) {
            throw new TypeError('GameWindow.preCache: callback must be ' +
                                'function or undefined. Found: ' + callback);
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
            currentUri = this.processUri(uris[uriIdx]);

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
     * ### GameWindow.getElementById | gid
     *
     * Returns the element with the given id
     *
     * Looks first into the iframe and then into the rest of the page.
     *
     * @param {string} id The id of the element
     *
     * @return {Element|null} The element in the page, or null if none is found
     *
     * @see GameWindow.getElementsByTagName
     */
    GameWindow.prototype.getElementById =
        GameWindow.prototype.gid = function(id) {

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
     * If set, it will look up in iframe, otherwsie into the rest of the page.
     *
     * @param {string} tag The tag of the elements
     *
     * @return {array|null} The elements in the page, or null if none is found
     *
     * @see GameWindow.getElementById
     * @see GameWindow.frameDocument
     */
    GameWindow.prototype.getElementsByTagName = function(tag) {
        var frameDocument;
        frameDocument = this.getFrameDocument();
        return frameDocument ? frameDocument.getElementsByTagName(tag) :
            document.getElementsByTagName(tag);
    };

    /**
     * ### GameWindow.getElementsByClassName
     *
     * Returns a list of elements with given class name
     *
     * If set, it will look up in iframe, otherwsie into the rest of the page.
     *
     * @param {string} className The requested className
     * @param {string} tag Optional. If set only elements with
     *   the specified tag name will be searched
     *
     * @return {array} Array of elements with the requested class name
     *
     * @see GameWindow.getElementByTagName
     * @see GameWindow.frameDocument
     */
    GameWindow.prototype.getElementsByClassName = function(className, tag) {
        var doc;
        doc = this.getFrameDocument() || document;
        return J.getElementsByClassName(doc, className, tag);
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
     *  - cache (object): Caching options. Fields:
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
     * Notice: If called multiple times within the same stage/step, it will
     * cause the `VisualTimer` widget to reload the timer.
     *
     * @param {string} uri The uri to load
     * @param {function} func Optional. The function to call once the DOM is
     *   ready
     * @param {object} opts Optional. The options object
     *
     * @see GameWindow.uriPrefix
     * @see GameWindow.uriChannel
     */
    GameWindow.prototype.loadFrame = function(uri, func, opts) {
        var that;
        var loadCache;
        var storeCacheNow, storeCacheLater;
        var autoParse, autoParsePrefix, autoParseMod;
        var iframe, iframeName, iframeDocument, iframeWindow;
        var frameDocumentElement, frameReady;
        var lastURI;

        if ('string' !== typeof uri) {
            throw new TypeError('GameWindow.loadFrame: uri must be ' +
                                'string. Found: ' + uri);
        }
        if (func && 'function' !== typeof func) {
            throw new TypeError('GameWindow.loadFrame: func must be function ' +
                                'or undefined. Found: ' + func);
        }
        if (opts && 'object' !== typeof opts) {
            throw new TypeError('GameWindow.loadFrame: opts must be object ' +
                                'or undefined. Found: ' + opts);
        }
        opts = opts || {};

        iframe = this.getFrame();
        iframeName = this.frameName;

        if (!iframe) {
            throw new Error('GameWindow.loadFrame: no frame found');
        }

        if (!iframeName) {
            throw new Error('GameWindow.loadFrame: frame has no name');
        }

        this.setStateLevel('LOADING');
        that = this;

        // Save ref to iframe window for later.
        iframeWindow = iframe.contentWindow;
        // Query readiness (so we know whether onload is going to be called):
        iframeDocument = W.getIFrameDocument(iframe);
        frameReady = iframeDocument.readyState;
        // ...reduce it to a boolean:
        //frameReady = frameReady === 'interactive'||frameReady === 'complete';
        frameReady = frameReady === 'complete';

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
                                    'load mode: ' + opts.cache.loadMode);
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
                                    'store mode: ' + opts.cache.storeMode);
                }
            }
        }

        if ('undefined' !== typeof opts.autoParse) {
            if ('object' !== typeof opts.autoParse) {
                throw new TypeError('GameWindow.loadFrame: opts.autoParse ' +
                                    'must be object or undefined. Found: ' +
                                    opts.autoParse);
            }
            if ('undefined' !== typeof opts.autoParsePrefix) {
                if ('string' !== typeof opts.autoParsePrefix) {
                    throw new TypeError('GameWindow.loadFrame: opts.' +
                                        'autoParsePrefix must be string ' +
                                        'or undefined. Found: ' +
                                        opts.autoParsePrefix);
                }
                autoParsePrefix = opts.autoParsePrefix;
            }
            if ('undefined' !== typeof opts.autoParseMod) {
                if ('string' !== typeof opts.autoParseMod) {
                    throw new TypeError('GameWindow.loadFrame: opts.' +
                                        'autoParseMod must be string ' +
                                        'or undefined. Found: ' +
                                        opts.autoParseMod);
                }
                autoParseMod = opts.autoParseMod;
            }
            autoParse = opts.autoParse;
        }

        // Store unprocessed uri parameter.
        this.unprocessedUri = uri;

        if (this.cacheSupported === null) {
            this.preCacheTest(function() {
                that.loadFrame(uri, func, opts);
            });
            return;
        }

        // Adapt the uri if necessary. Important! Must follow
        // the assignment to unprocessedUri AND preCacheTest.
        uri = this.processUri(uri);

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

                // Check if direct access to the content of the frame is
                // allowed. Usually IEs do not allow this. Notice, this
                // is different from preCaching, and that a newly
                // generated frame (about:blank) will always be accessible.
                if (that.directFrameDocumentAccess === null) {
                    testDirectFrameDocumentAccess(that);
                }

                // Handles caching.
                handleFrameLoad(that, uri, iframe, iframeName, loadCache,
                                storeCacheNow, function() {

                                    // Executes callback, autoParses,
                                    // and updates GameWindow state.
                                    that.updateLoadFrameState(func,
                                                              autoParse,
                                                              autoParseMod,
                                                              autoParsePrefix);
                                });
            });
        }

        // Cache lookup:
        if (loadCache) {
            // Load iframe contents at this point only if the iframe is already
            // "ready" (see definition of frameReady), otherwise the contents
            // would be cleared once the iframe becomes ready. In that case,
            // iframe.onload handles the filling of the contents.
            if (frameReady) {
                // Handles caching.
                handleFrameLoad(this, uri, iframe, iframeName, loadCache,
                                storeCacheNow, function() {

                                    // Executes callback
                                    // and updates GameWindow state.
                                    that.updateLoadFrameState(func,
                                                              autoParse,
                                                              autoParseMod,
                                                              autoParsePrefix);
                                });
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
     * ### GameWindow.processUri
     *
     * Parses a uri string and adds channel uri and prefix, if defined
     *
     * @param {string} uri The uri to process
     *
     * @return {string} uri The processed uri
     *
     * @see GameWindow.uriPrefix
     * @see GameWindow.uriChannel
     */
    GameWindow.prototype.processUri = function(uri) {
        if (uri.charAt(0) !== '/' && uri.substr(0,7) !== 'http://') {
            if (this.uriPrefix) uri = this.uriPrefix + uri;
            if (this.uriChannel) uri = this.uriChannel + uri;
        }
        return uri;
    };

    /**
     * ### GameWindow.updateLoadFrameState
     *
     * Sets window state after a new frame has been loaded
     *
     * The method performs the following operations:
     *
     * - decrements the counter of loading iframes
     * - executes a given callback function
     * - auto parses the elements specified (if any)
     * - set the window state as loaded (eventually)
     *
     * @param {function} func Optional. A callback function
     * @param {object} autoParse Optional. An object containing elements
     *    to replace in the HTML DOM.
     * @param {string} autoParseMod Optional. Modifier for search and replace
     * @param {string} autoParsePrefix Optional. Custom prefix to add to the
     *    keys of the elements in autoParse object
     *
     * @see GameWindow.searchReplace
     * @see updateAreLoading
     *
     * @emit FRAME_LOADED
     * @emit LOADED
     */
    GameWindow.prototype.updateLoadFrameState = function(func, autoParse,
                                                         autoParseMod,
                                                         autoParsePrefix) {

        var loaded, stageLevel;
        loaded = updateAreLoading(this, -1);
        if (loaded) this.setStateLevel('LOADED');
        if (func) func.call(node.game);
        if (autoParse) {
            this.searchReplace(autoParse, autoParseMod, autoParsePrefix);
        }

        // ng event emitter is not used.
        node.events.ee.game.emit('FRAME_LOADED');
        node.events.ee.stage.emit('FRAME_LOADED');
        node.events.ee.step.emit('FRAME_LOADED');

        if (loaded) {
            stageLevel = node.game.getStageLevel();
            if (stageLevel === CB_EXECUTED) node.emit('LOADED');
        }
        else {
            node.silly('game-window: ' + this.areLoading + ' frames ' +
                       'still loading.');
        }
    };

    /**
     * ### GameWindow.clearPageBody
     *
     * Removes all HTML from body, and resets GameWindow
     *
     * @see GameWindow.reset
     */
    GameWindow.prototype.clearPageBody = function() {
        this.reset();
        document.body.innerHTML = '';
    };

    /**
     * ### GameWindow.clearPage
     *
     * Removes all HTML from page and resets GameWindow
     *
     * @see GameWindow.reset
     */
    GameWindow.prototype.clearPage = function() {
        this.reset();
        try {
            document.documentElement.innerHTML = '';
        }
        catch(e) {
            this.removeChildrenFromNode(document.documentElement);
        }
    };

    /**
     * ### GameWindow.setUriPrefix
     *
     * Sets the variable uriPrefix
     *
     * @see GameWindow.uriPrefix
     */
    GameWindow.prototype.setUriPrefix = function(uriPrefix) {
        if (uriPrefix !== null && 'string' !== typeof uriPrefix) {
            throw new TypeError('GameWindow.setUriPrefix: uriPrefix must be ' +
                                'string or null. Found: ' + uriPrefix);
        }
        this.conf.uriPrefix = this.uriPrefix = uriPrefix;
    };

    /**
     * ### GameWindow.setUriChannel
     *
     * Sets the variable uriChannel
     *
     * Trailing and preceding slashes are added if missing.
     *
     * @param {string|null} uriChannel The current uri of the channel,
     *   or NULL to delete it
     *
     * @see GameWindow.uriChannel
     */
    GameWindow.prototype.setUriChannel = function(uriChannel) {
        if ('string' === typeof uriChannel) {
            if (uriChannel.charAt(0) !== '/') uriChannel = '/' + uriChannel;
            if (uriChannel.charAt(uriChannel.length-1) !== '/') {
                uriChannel = uriChannel + '/';
            }
        }
        else if (uriChannel !== null) {
            throw new TypeError('GameWindow.uriChannel: uriChannel must be ' +
                                'string or null. Found: ' + uriChannel);
        }

        this.uriChannel = uriChannel;
    };

    /**
     * ### GameWindow.adjustFrameHeight
     *
     * Resets the min-height style of the iframe to fit its content properly
     *
     * Takes into the available height of the page, and the actual
     * content of the iframe, which is stretched to either:
     *
     *  - (almost) till the end of the page,
     *  - or to fit its content, if larger than page height (with scrollbar).
     *
     * @param {number} userMinHeight Optional. If set minHeight cannot be
     *   less than this value. Default: 0
     * @param {number} delay. If set, a timeout is created before the
     *   the frame is actually adjusted. Multiple calls will be
     *   evaluated only once at the end of a new timeout. Default: undefined
     *
     * @see W.willResizeFrame
     * @see W.adjustHeaderOffset
     */
    GameWindow.prototype.adjustFrameHeight = (function() {
        var nextTimeout, adjustIt;

        adjustIt = function(userMinHeight) {
            var iframe, minHeight, contentHeight;

            W.adjustHeaderOffset();

            iframe = W.getFrame();
            // Iframe might have been destroyed already, e.g. in a test.
            if (!iframe || !iframe.contentWindow) return;
            // Frame might be loading slowly, let's try again later.
            if (!iframe.contentWindow.document.body) {
                W.adjustFrameHeight(userMinHeight, 120);
                return;
            }


            if (W.conf.adjustFrameHeight === false) {
                minHeight = '100vh';
            }
            else {

                // Try to find out how tall the frame should be.
                minHeight = window.innerHeight || window.clientHeight;

                contentHeight = iframe.contentWindow.document.body.offsetHeight;
                // Rule of thumb.
                contentHeight += 60;

                if (W.headerPosition === "top") contentHeight += W.headerOffset;

                if (minHeight < contentHeight) minHeight = contentHeight;
                if (minHeight < (userMinHeight || 0)) minHeight = userMinHeight;
                minHeight += 'px';
            }

            // Adjust min-height based on content.
            iframe.style['min-height'] = minHeight;
        };

        return function(userMinHeight, delay) {
            if ('undefined' === typeof delay) {
                adjustIt(userMinHeight);
                return;
            }
            if (W.willResizeFrame) {
                nextTimeout = true;
                return;
            }
            W.willResizeFrame = setTimeout(function() {
                W.willResizeFrame = null;
                // If another timeout call was requested, do nothing now.
                if (nextTimeout) {
                    nextTimeout = false;
                    W.adjustFrameHeight(userMinHeight, delay);
                }
                else {
                    adjustIt(userMinHeight);
                }
            }, delay);
        };

    })();

    /**
     * ### GameWindow.adjustHeaderOffset
     *
     * Slides frame and/or infoPanel so that the header does not overlap
     *
     * Adjusts the CSS padding of the elements depending of the header
     * position, but only if the size of of the header has changed from
     * last time.
     *
     * @param {boolean} force Optional. If TRUE, padding is adjusted
     *   regardless of whether the size of the header has changed
     *   from last time
     *
     * @see W.headerOffset
     */
    GameWindow.prototype.adjustHeaderOffset = function(force) {
        var position, frame, header, infoPanel, offset, offsetPx;

        header = W.getHeader();
        position = W.headerPosition;

        // Do not apply padding if nothing has changed.
        if (!force &&
            (!header && W.headerOffset ||
             (position === "top" &&
              header.offsetHeight === W.headerOffset))) {

            return;
        }

        frame = W.getFrame();
        infoPanel = W.infoPanel;
        // No frame nor infoPanel, nothing to do.
        if (!frame && !infoPanel) return;

        switch(position) {
        case 'top':
            offset = header ? header.offsetHeight : 0;
            offsetPx = offset + 'px';
            if (infoPanel && infoPanel.isVisible) {
                infoPanel.infoPanelDiv.style['padding-top'] = offsetPx;
                frame.style['padding-top'] = 0;
            }
            else {
                if (infoPanel && infoPanel.infoPanelDiv) {
                    infoPanel.infoPanelDiv.style['padding-top'] = 0;
                }
                frame.style['padding-top'] = offsetPx;
            }
            break;
        case 'bottom':
            offset = header ? header.offsetHeight : 0;
            offsetPx = offset + 'px';
            frame.style['padding-bottom'] = offsetPx;
            if (infoPanel && infoPanel.infoPanelDiv) {
                infoPanel.infoPanelDiv.style['padding-top'] = 0;
            }
            break;
        case 'right':
            offset = header ? header.offsetWidth : 0;
            offsetPx = offset + 'px';
            if (frame) frame.style['padding-right'] = offsetPx;
            if (infoPanel && infoPanel.isVisible) {
                infoPanel.infoPanelDiv.style['padding-right'] = offsetPx;
            }
            break;
        case 'left':
            offset = header ? header.offsetWidth : 0;
            offsetPx = offset + 'px';
            if (frame) frame.style['padding-left'] = offsetPx;
            if (infoPanel && infoPanel.isVisible) {
                infoPanel.infoPanelDiv.style['padding-left'] = offsetPx;
            }
            break;
        default:
            // When header is destroyed, for example.
            if (position !== null) {
                throw new Error('GameWindow.adjustHeaderOffset: invalid ' +
                                'header position. Found: ' + position);
            }
            if (header) {
                throw new Error('GameWindow.adjustHeaderOffset: something ' +
                                'is wrong. Header found, but position is ' +
                                'null.');
            }
            // Remove all padding.
            if (frame) frame.style.padding = 0;
            if (infoPanel && infoPanel.infoPanelDiv) {
                infoPanel.infoPanelDiv.padding = 0;
            }
        }

        // Store the value of current offset.
        W.headerOffset = offset;
    };


    // ## Helper functions

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
     * @param {iframe} iframe The target iframe
     * @param {string} frameName ID of the iframe
     * @param {bool} loadCache Whether to load from cache
     * @param {bool} storeCache Whether to store to cache
     * @param {function} func Callback
     *
     * @see GameWindow.loadFrame
     *
     * @api private
     */
    function handleFrameLoad(that, uri, iframe, frameName, loadCache,
                             storeCache, func) {

        var iframeDocumentElement;
        var afterScripts;

        // Needed for IE8.
        iframe = W.getElementById(frameName);
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
            // Disable right click in loaded iframe document, if necessary.
            if (that.conf.rightClickDisabled) {
                J.disableRightClick(that.frameDocument);
            }
            // Track onkeydown Escape.
            if (that.conf.noEscape) {
                that.frameDocument.onkeydown = document.onkeydown;
            }
        }

        // Remove on-the-fly style element reference.
        that.styleElement = null;

        // (Re-)Inject libraries and reload scripts:
        removeLibraries(iframe);
        afterScripts = function() {
            injectLibraries(iframe, that.globalLibs.concat(
                that.frameLibs.hasOwnProperty(uri) ? that.frameLibs[uri] : []));

            if (storeCache) {
                // Store frame in cache:
                that.cache[uri].contents = iframeDocumentElement.innerHTML;
            }

            func();

            // Important. We need a timeout (2nd param), because some changes
            // might take time to be reflected in the DOM.
            W.adjustFrameHeight(0, 120);
        };

        if (loadCache) reloadScripts(iframe, afterScripts);
        else afterScripts();
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
     * @param {function} func Callback
     *
     * @api private
     */
    function reloadScripts(iframe, func) {
        var contentDocument;
        var headNode;
        var tag, scriptNodes, scriptNodeIdx, scriptNode;
        var attrIdx, attr;
        var numLoading;
        var needsLoad;

        contentDocument = W.getIFrameDocument(iframe);
        headNode = W.getIFrameAnyChild(iframe);

        // Start counting loading tags at 1 instead of 0 and decrement the
        // count after the loop.
        // This way the callback cannot be called before the loop finishes.
        numLoading = 1;

        scriptNodes = contentDocument.getElementsByTagName('script');
        for (scriptNodeIdx = 0; scriptNodeIdx < scriptNodes.length;
             scriptNodeIdx++) {

            // Remove tag:
            tag = scriptNodes[scriptNodeIdx];
            tag.parentNode.removeChild(tag);

            // Reinsert tag for reloading:
            scriptNode = document.createElement('script');
            if (tag.innerHTML) scriptNode.innerHTML = tag.innerHTML;
            needsLoad = false;
            for (attrIdx = 0; attrIdx < tag.attributes.length; attrIdx++) {
                attr = tag.attributes[attrIdx];
                scriptNode.setAttribute(attr.name, attr.value);
                if (attr.name === 'src') needsLoad = true;
            }
            if (needsLoad) {
                //scriptNode.async = true;
                ++numLoading;
                scriptNode.onload = function(sn) {
                    return function() {
                        sn.onload = null;
                        --numLoading;
                        if (numLoading <= 0) func();
                    };
                }(scriptNode);
            }
            headNode.appendChild(scriptNode);
        }
        --numLoading;
        if (numLoading <= 0) func();
    }

    /**
     * ### injectLibraries
     *
     * Injects scripts into the iframe
     *
     * Inserts `<script class="injectedlib" src="...">` lines into given
     * iframe object, one for every given library.
     *
     * @param {HTMLIFrameElement} iframe The target iframe
     * @param {array} libs An array of strings giving the "src" attribute for
     *   the `<script>` lines to insert
     *
     * @api private
     */
    function injectLibraries(iframe, libs) {
        var headNode;
        var scriptNode;
        var libIdx, lib;

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
     * Updates the counter of loading frames
     *
     * @param {GameWindow} that A reference to the GameWindow instance
     * @param {number} update The number to add to the counter
     *
     * @see GameWindow.lockedUpdate
     *
     * @api private
     */
    function updateAreLoading(that, update) {
        that.areLoading = that.areLoading + update;
        return that.areLoading === 0;
    }

    /**
     * ### adaptFrame2HeaderPosition
     *
     * Sets a CSS class to the frame element depending on the header position
     *
     * The frame element must exists or an error will be thrown.
     *
     * @param {string} oldHeaderPos Optional. The previous position of the
     *   header
     *
     * @api private
     */
    function adaptFrame2HeaderPosition(oldHeaderPos) {
        var position, frame, header;

        frame = W.getFrame();
        if (!frame) return;

        header = W.getHeader();

        // If no header is found, simulate the 'top' position
        // to better fit the whole screen.
        position = W.headerPosition || 'top';

        // When we move from bottom to any other configuration,
        // we need to move the header before the frame.
        if (oldHeaderPos === 'bottom' && position !== 'bottom') {
            W.getFrameRoot().insertBefore(W.headerElement, frame);
        }

        W.removeClass(frame, 'ng_mainframe-header-[a-z-]*');
        switch(position) {
        case 'right':
            W.addClass(frame, 'ng_mainframe-header-vertical-r');
            break;
        case 'left':
            W.addClass(frame, 'ng_mainframe-header-vertical-l');
            break;
        case 'top':
            W.addClass(frame, 'ng_mainframe-header-horizontal-t');
            if (header) W.getFrameRoot().insertBefore(header, frame);
            break;
        case 'bottom':
            W.addClass(frame, 'ng_mainframe-header-horizontal-b');
            if (header) {
                W.getFrameRoot().insertBefore(header, frame.nextSibling);
            }
            break;
        }
    }

    /**
     * ### testDirectFrameDocumentAccess
     *
     * Tests whether the content of the frameDocument can be accessed directly
     *
     * The value of the test is stored under `directFrameDocumentAccess`.
     *
     * Some IEs give 'Permission denied' when accessing the frame document
     * directly. In such a case, we need to re-get it from the DOM.
     *
     * @param {GameWindow} that This instance
     *
     * @see GameWindow.directFrameDocumentAccess
     */
    function testDirectFrameDocumentAccess(that) {
        try {
            that.frameDocument.getElementById('test');
            that.directFrameDocumentAccess = true;
        }
        catch(e) {
            that.directFrameDocumentAccess = false;
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
