/**
 * 
 * # GameWindow
 * 
 * Copyright(c) 2012 Stefano Balietti
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
 * Defines a number of pre-defined profiles associated with special
 * configuration of widgets.
 * 
 * Depends on nodegame-client. 
 * GameWindow.Table and GameWindow.List depend on NDDB and JSUS.
 * 
 * Widgets can have custom dependencies, which are checked internally 
 * by the GameWindow engine.
 * 
 * 
 */
(function (window, node) {
		
var J = node.JSUS;

var Player = node.Player,
	PlayerList = node.PlayerList,
	GameState = node.GameState,
	GameMsg = node.GameMsg,
	GameMsgGenerator = node.GameMsgGenerator;

var DOM = J.get('DOM');

if (!DOM) {
	throw new Error('DOM object not found. Aborting');
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
 * The constructor performs the following operations:
 * 
 * 		- creates a root div element (this.root)
 * 		- creates an iframe element inside the root element	(this.frame)
 * 		- defines standard event listeners for showing and hiding elements
 * 
 */
function GameWindow() {
	var that = this;
	
	if ('undefined' === typeof window) {
		throw new Error('nodeWindow: no DOM found. Are we in a browser? Aborting.');
	}
	
	if ('undefined' === typeof node) {
		node.log('nodeWindow: nodeGame not found', 'ERR');
	}
	
	node.log('nodeWindow: loading...');
	
	this.frame = null; // contains an iframe 
	this.mainframe = 'mainframe';
	this.root = null;
	
	this.conf = {};
	
	this.state = node.is.LOADED;
	this.areLoading = 0; 

	// Cache for loaded iframes.  Every entry is a field with the URI as the key
	// and an object as a value with the fields
	//  - 'contents' (a string describing the innerHTML or null if not cached),
	//  - 'libsInjected' (a bool saying whether the given libraries have already been
	//    inserted into the page),
	//  - optionally 'cacheOnClose' (a bool telling whether to cache the frame when
	//    it is replaced by a new one).
	this.cache = {};

	// Currently loaded URIs in the internal frames.  Fields are frame names (e.g. 'mainframe'),
	// values are the URIs they are showing.
	this.currentURIs = {};

	// Libraries to be loaded for every frame and for specific frames.
	// globalLibs holds an array of strings with the path of the libraries,
	// frameLibs is a map from URIs to arrays like in globalLibs.
	this.globalLibs = [];
	this.frameLibs = {};

	// Init default behavior
	this.init();
	
};

// ## GameWindow methods

/**
 * ### GameWindow.init
 * 
 * Sets global variables based on local configuration.
 * 
 * Defaults:
 * 
 * 		- promptOnleave TRUE
 * 		- captures ESC key
 * 
 * @param {object} options Configuration options
 * 
 */
GameWindow.prototype.init = function (options) {
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
	else if (this.conf.noEscape === false){
		this.restoreEscape();
	}
	
};

/**
 * ### GameWindow.getElementById
 * 
 * Returns the element with id 'id'. Looks first into the iframe,
 * and then into the rest of the page.
 * 
 * @see GameWindow.getElementsByTagName
 */
GameWindow.prototype.getElementById = function (id) {
	var el = null; // @TODO: should be init to undefined instead ?
	if (this.frame && this.frame.getElementById) {
		el = this.frame.getElementById(id);
	}
	if (!el) {
		el = document.getElementById(id);
	}
	return el; 
};

/**
 * Returns a collection of elements with the tag name equal to @tag . 
 * Looks first into the iframe and then into the rest of the page.
 * 
 * @see GameWindow.getElementById
 * 
 */
GameWindow.prototype.getElementsByTagName = function (tag) {
	// @TODO: Should that be more similar to GameWindow.getElementById
	return (this.frame) ? this.frame.getElementsByTagName(tag) : document.getElementsByTagName(tag);
};

/**
 * ### GameWindow.setup
 * 
 * Setups the page with a predefined configuration of widgets.
 * 
 * @param {string} type The type of page to setup (MONITOR|PLAYER)
 * 
 */
GameWindow.prototype.setup = function (type){

	if (!this.root) {
		this.root = document.body;
		//this.root = this.generateNodeGameRoot();
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

		// Add default CSS
		if (node.conf.host) {
			this.addCSS(document.body, node.conf.host + '/stylesheets/monitor.css');
		}
		
		break;
		
	case 'PLAYER':
		
		//var maincss		= this.addCSS(this.root, 'style.css');
		this.header 	= this.generateHeader();
	    var mainframe 	= this.addIFrame(this.root,'mainframe');
	    
		node.game.vs 	= node.widgets.append('VisualState', this.header);
		node.game.timer = node.widgets.append('VisualTimer', this.header);
		//node.game.doneb = node.widgets.append('DoneButton', this.header);
		node.game.sd 	= node.widgets.append('StateDisplay', this.header);

		node.widgets.append('WaitScreen');
	    
		// Add default CSS
		if (node.conf.host) {
			this.addCSS(document.body, node.conf.host + '/stylesheets/player.css');
		}
	
		this.frame = window.frames[this.mainframe]; // there is no document yet
		var initPage = this.getBlankPage();
		if (this.conf.noEscape) {
			// TODO: inject the no escape code here
			// not working
			//this.addJS(initPage, node.conf.host + 'javascripts/noescape.js');
		}
		
		window.frames[this.mainframe].src = initPage;
	    
		break;
	}
	
};


/**
 * ### GameWindow.injectLibraries
 * 
 * Injects <script src="..."> lines into given iframe object, one for every given library.
 * 
 * @param {object} frameNode The node object of the iframe
 * @param {array} libs An array of strings giving the "src" attribute for the <script>
 *                     lines to insert
 * 
 */
GameWindow.prototype.injectLibraries = function (frameNode, libs) {
	var contentDocument = frameNode.contentDocument ? frameNode.contentDocument
	                                                : frameNode.contentWindow.document;

	var headNode = contentDocument.getElementsByTagName('head')[0];
	var scriptNode;
	var libIdx, lib;

	for (libIdx = 0; libIdx < libs.length; ++libIdx) {
		lib = libs[libIdx];
		scriptNode = document.createElement('script');
		scriptNode.src = lib;
		headNode.appendChild(scriptNode);
	}
};


/**
 * ### GameWindow.initLibs
 *
 * Specify which libraries should be loaded automatically in the iframes.
 * This method must be called before any calls to GameWindow.load and GameWindow.preCache .
 *
 * @param {array} globalLibs Array of strings describing library paths that
 *    should be loaded in every iframe.
 * @param {object} frameLibs Map from URIs to string arrays (as above) specifying
 *    libraries that should only be loaded for iframes displaying the given URI.
 *    This must not contain any elements that are also in globalLibs.
 *
 */
GameWindow.prototype.initLibs = function(globalLibs, frameLibs) {
	this.globalLibs = globalLibs || [];
	this.frameLibs = frameLibs || {};
}


/**
 * ### GameWindow.preCache
 *
 * Loads the HTML content of the given URIs into the cache.
 *
 * @param {array} uris The URIs to cache
 * @param {function} callback The function to call once the caching is done
 *
 */
GameWindow.prototype.preCache = function(uris, callback) {
	// Don't preload if no URIs are given:
	if (!uris || !uris.length) {
		if(callback) callback();
		return;
	}

	var that = this;

	// Keep count of loaded URIs:
	var loadedCount = 0;

	for (var uriIdx = 0; uriIdx < uris.length; ++uriIdx) {
		var currentUri = uris[uriIdx];

		//console.log('DEBUG: Caching "' + currentUri + '"...');

		// Create an invisible internal frame for the current URI:
		var iframe = document.createElement('iframe');
		iframe.style.visibility = 'hidden';
		var iframeName = 'tmp_iframe_' + uriIdx;
		iframe.id = iframeName;
		iframe.name = iframeName;
		document.body.appendChild(iframe);

		// Register the onload handler:
		iframe.onload = (function(uri, thisIframe) {
			return function() {
				// Store the contents in the cache:
				var frameDocumentElement =
					(thisIframe.contentDocument ? thisIframe.contentDocument : thisIframe.contentWindow.document)
					.documentElement;
				that.cache[uri] = { contents: frameDocumentElement.innerHTML,
				                    libsInjected: false,
				                    cacheOnClose: false };

				// Remove the internal frame:
				document.body.removeChild(thisIframe);

				// Increment loaded URIs counter:
				++ loadedCount;
				if (loadedCount >= uris.length) {
					// All requested URIs have been loaded at this point.
					//console.log('DEBUG: preCache done!');
					if (callback) callback();
				}
			};
		})(currentUri, iframe);

		// Start loading the page:
		window.frames[iframeName].location = currentUri;
	}
};


/**
 * ### GameWindow.load
 * 
 * Loads content from an uri (remote or local) into the iframe, 
 * and after it is loaded executes the callback function. 
 * 
 * The third parameter is an options object with the following fields
 * (any fields left out assume the default setting):
 *
 *  - frame (string): The name of the frame in which to load the uri (default: default iframe of the game)
 *  - cache (object): Caching options.  Fields:
 *      * loadMode (string): 'reload' (default; reload page without the cache),
 *                           'cache' (get the page from cache if possible)
 *      * storeMode (string): 'off' (default; don't cache page),
 *                            'onLoad' (cache given page after it is loaded)
 *                            'onClose' (cache given page after it is replaced by a new page)
 * 
 * Warning: Security policies may block this methods, if the 
 * content is coming from another domain.
 * 
 * @param {string} uri The uri to load
 * @param {function} func The callback function to call once the DOM is ready
 * @param {object} opts The options object
 * 
 */
GameWindow.prototype.load = GameWindow.prototype.loadFrame = function (uri, func, opts) {
	if (!uri) return;

	// Default options:
	var frame = this.mainframe;
	var loadCache = GameWindow.defaults.cacheDefaults.loadCache;
	var storeCacheNow = GameWindow.defaults.cacheDefaults.storeCacheNow;
	var storeCacheLater = GameWindow.defaults.cacheDefaults.storeCacheLater;

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
	var iframe = document.getElementById(frame);
	var frameNode;
	var frameDocumentElement;
	// Query readiness (so we know whether onload is going to be called):
	var frameReady = iframe.contentWindow.document.readyState;
	// ...reduce it to a boolean:
	frameReady = (frameReady === 'interactive' || frameReady === 'complete');

	// If the last frame requested to be cached on closing, do that:
	var lastURI = this.currentURIs[frame];
	if ((lastURI in this.cache) && this.cache[lastURI].cacheOnClose) {
		frameNode = document.getElementById(frame);
		frameDocumentElement =
		  (frameNode.contentDocument ? frameNode.contentDocument : frameNode.contentWindow.document)
		  .documentElement;

		this.cache[lastURI].contents = frameDocumentElement.innerHTML;

		// The libraries were injected into the contents in the last W.loadFrame call
		// and the contents were stored to the cache right now, so we can set the
		// libsInjected flag:
		this.cache[lastURI].libsInjected = true;
	}

	// Create entry for this URI in cache object and store cacheOnClose flag:
	if(!(uri in this.cache)) this.cache[uri] = { contents: null, libsInjected: false, cacheOnClose: false };
	this.cache[uri].cacheOnClose = storeCacheLater;

	// Update frame's currently showing URI:
	this.currentURIs[frame] = uri;
	
	this.state = node.is.LOADING;
	this.areLoading++;  // keep track of nested call to loadFrame
	
	var that = this;
			
	// Add the onload event listener:
	iframe.onload = function() {
		if (that.conf.noEscape) {
			
			// TODO: inject the no escape code here
			
			//that.addJS(iframe.document, node.conf.host + 'javascripts/noescape.js');
			//that.addJS(that.getElementById('mainframe'), node.conf.host + 'javascripts/noescape.js');
		}

		frameNode = document.getElementById(frame);
		frameDocumentElement =
		  (frameNode.contentDocument ? frameNode.contentDocument : frameNode.contentWindow.document)
		  .documentElement;

		if (loadCache && that.cache[uri].contents !== null) {
			// Load frame from cache:
			frameDocumentElement.innerHTML = that.cache[uri].contents;
			//console.log("DEBUG: Loaded in onload from '"+uri+"'");
		}

		// Inject libraries:
		//console.log("DEBUG: Before injection: " + frameDocumentElement.innerHTML);
		if (!that.cache[uri].libsInjected || !loadCache) {
			that.injectLibraries(frameNode, that.globalLibs.concat(uri in that.frameLibs ? that.frameLibs[uri] : []));
		}
		//console.log("DEBUG: After injection: " + frameDocumentElement.innerHTML);

		if (storeCacheNow) {
			// Store frame in cache:
			that.cache[uri].contents = frameDocumentElement.innerHTML;
			that.cache[uri].libsInjected = true;
			//console.log("DEBUG: Stored as '"+uri+"'");
		}

		//console.log("DEBUG: Calling updateStatus from onload...");
		that.updateStatus(func, frame);
	};

	// Cache lookup:
	if (loadCache && this.cache[uri].contents !== null) {
		// Load iframe contents at this point only if the iframe is already "ready"
		// (see definition of frameReady), otherwise the contents would be cleared
		// once the iframe becomes ready.  In that case, iframe.onload will handle the
		// filling of the contents.
		// TODO: Fix code duplication between here and onload function.
		if (frameReady) {
			// Load frame from cache:
			frameNode = document.getElementById(frame);
			frameDocumentElement =
			  (frameNode.contentDocument ? frameNode.contentDocument : frameNode.contentWindow.document)
			  .documentElement;

			frameDocumentElement.innerHTML = that.cache[uri].contents;
			//console.log("DEBUG: Loaded in loadFrame from '"+uri+"'");

			// Inject libraries:
			if (!that.cache[uri].libsInjected) {
				that.injectLibraries(frameNode, that.globalLibs.concat(uri in that.frameLibs ? that.frameLibs[uri] : []));

				// Store changes in cache:
				if (storeCacheNow) {
					that.cache[uri].contents = frameDocumentElement.innerHTML;
					that.cache[uri].libsInjected = true;
				}
			}
			
			// Update status (onload isn't called if frame was already ready):
			//console.log("DEBUG: Calling updateStatus from loadFrame...");
			this.updateStatus(func, frame);
		}
	}
	else {
		//console.log('DEBUG: URI "' + uri + '" WAS NOT CACHED!');
		// Update the frame location:
		window.frames[frame].location = uri;
	}
	
	
	// Adding a reference to nodeGame also in the iframe
	window.frames[frame].window.node = node;
//		console.log('the frame just as it is');
//		console.log(window.frames[frame]);
	// Experimental
//		if (uri === 'blank') {
//			window.frames[frame].src = this.getBlankPage();
//			window.frames[frame].location = '';
//		}
//		else {
//			window.frames[frame].location = uri;
//		}
	
					
};


GameWindow.prototype.updateStatus = function(func, frame) {
	// Update the reference to the frame obj
	this.frame = window.frames[frame].document;
		
	if (func) {
		func.call(node.game); // TODO: Pass the right this reference
		//node.log('Frame Loaded correctly!');
	}
		
	this.areLoading--;

	if (this.areLoading === 0) {
		this.state = node.is.LOADED;
		node.emit('WINDOW_LOADED');
	}
	else {
		node.log('Attempt to update state, before the window object was loaded', 'DEBUG');
	}
};
	
/**
 * Creates and adds a container div with id 'gn_header' to 
 * the root element. 
 * 
 * If an header element has already been created, deletes it, 
 * and creates a new one.
 * 
 * @TODO: Should be always added as first child
 * 
 */
GameWindow.prototype.generateHeader = function () {
	if (this.header) {
		this.header.innerHTML = '';
		this.header = null;
	}
	
	return this.addElement('div', this.root, 'gn_header');
};


// Overriding Document.write and DOM.writeln and DOM.write
GameWindow.prototype._write = DOM.write;
GameWindow.prototype._writeln = DOM.writeln;
/**
 * ### GameWindow.write
 * 
 * Appends a text string, an HTML node or element inside
 * the specified root element. 
 * 
 * If no root element is specified, the default screen is 
 * used.
 * 
 * @see GameWindow.writeln
 * 
 */
GameWindow.prototype.write = function (text, root) {		
	var root = root || this.getScreen();
	if (!root) {
		node.log('Could not determine where writing', 'ERR');
		return false;
	}
	return this._write(root, text);
};

/**
 * ### GameWindow.writeln
 * 
 * Appends a text string, an HTML node or element inside
 * the specified root element, and adds a break element
 * immediately afterwards.
 * 
 * If no root element is specified, the default screen is 
 * used.
 * 
 * @see GameWindow.write
 * 
 */
GameWindow.prototype.writeln = function (text, root, br) {
	var root = root || this.getScreen();
	if (!root) {
		node.log('Could not determine where writing', 'ERR');
		return false;
	}
	return this._writeln(root, text, br);
};


/**
 * ### GameWindow.toggleInputs
 * 
 * Enables / Disables all input in a container with id @id.
 * If no container with id @id is found, then the whole document is used.
 * 
 * If @op is defined, all the input are set to @op, otherwise, the disabled
 * property is toggled. (i.e. false means enable, true means disable) 
 * 
 */
GameWindow.prototype.toggleInputs = function (id, op) {
	
	if ('undefined' !== typeof id) {
		var container = this.getElementById(id);
	}
	if ('undefined' === typeof container) {
		var container = this.frame.body;
	}
	
	var inputTags = ['button', 'select', 'textarea', 'input'];

	var j=0;
	for (;j<inputTags.length;j++) {
		var all = container.getElementsByTagName(inputTags[j]);
		var i=0;
		var max = all.length;
		for (; i < max; i++) {
			
			// If op is defined do that
			// Otherwise toggle
			state = ('undefined' !== typeof op) ? op 
												: all[i].disabled ? false 
																  : true;
			
			if (state) {
				all[i].disabled = state;
			}
			else {
				all[i].removeAttribute('disabled');
			}
		}
	}
};

/**
 * Creates a div element with the given id and 
 * tries to append it in the following order to:
 * 
 * 		- the specified root element
 * 		- the body element
 * 		- the last element of the document
 * 
 * If it fails, it creates a new body element, appends it
 * to the document, and then appends the div element to it.
 * 
 * Returns the newly created root element.
 * 
 * @api private
 * 
 */
GameWindow.prototype._generateRoot = function (root, id) {
	var root = root || document.body || document.lastElementChild;
	if (!root) {
		this.addElement('body', document);
		root = document.body;
	}
	this.root = this.addElement('div', root, id);
	return this.root;
};


/**
 * Creates a div element with id 'nodegame' and returns it.
 * 
 * @see GameWindow._generateRoot()
 * 
 */
GameWindow.prototype.generateNodeGameRoot = function (root) {
	return this._generateRoot(root, 'nodegame');
};

/**
 * Creates a div element with id 'nodegame' and returns it.
 * 
 * @see GameWindow._generateRoot()
 * 
 */
GameWindow.prototype.generateRandomRoot = function (root, id) {
	return this._generateRoot(root, this.generateUniqueId());
};

// Useful

/**
 * Creates an HTML button element that will emit the specified
 * nodeGame event when clicked and returns it.
 * 
 */
GameWindow.prototype.getEventButton = function (event, text, id, attributes) {
	if (!event) return;
	var b = this.getButton(id, text, attributes);
	b.onclick = function () {
		node.emit(event);
	};
	return b;
};

/**
 * Adds an EventButton to the specified root element.
 * 
 * If no valid root element is provided, it is append as last element
 * in the current screen.
 * 
 * @see GameWindow.getEventButton
 * 
 */
GameWindow.prototype.addEventButton = function (event, text, root, id, attributes) {
	if (!event) return;
	if (!root) {
//			var root = root || this.frame.body;
//			root = root.lastElementChild || root;
		var root = this.getScreen();
	}
	var eb = this.getEventButton(event, text, id, attributes);
	return root.appendChild(eb);
};


//Useful API

/**
* Creates an HTML select element already populated with the 
* of the data of other players.
* 
* @TODO: adds options to control which players/servers to add.
* 
* @see GameWindow.addRecipientSelector
* @see GameWindow.addStandardRecipients
* @see GameWindow.populateRecipientSelector
* 
*/
GameWindow.prototype.getRecipientSelector = function (id) {
	var toSelector = document.createElement('select');
	if ('undefined' !== typeof id) {
		toSelector.id = id;
	}
	this.addStandardRecipients(toSelector);
	return toSelector;
};

/**
* Appends a RecipientSelector element to the specified root element.
* 
* Returns FALSE if no valid root element is found.
* 
* @TODO: adds options to control which players/servers to add.
* 
* @see GameWindow.addRecipientSelector
* @see GameWindow.addStandardRecipients 
* @see GameWindow.populateRecipientSelector
* 
*/
GameWindow.prototype.addRecipientSelector = function (root, id) {
	if (!root) return false;
	var toSelector = this.getRecipientSelector(id);
	return root.appendChild(toSelector);		
};

/**
* Adds an ALL and a SERVER option to a specified select element.
* 
* @TODO: adds options to control which players/servers to add.
* 
* @see GameWindow.populateRecipientSelector
* 
*/
GameWindow.prototype.addStandardRecipients = function (toSelector) {
		
	var opt = document.createElement('option');
	opt.value = 'ALL';
	opt.appendChild(document.createTextNode('ALL'));
	toSelector.appendChild(opt);
	
	var opt = document.createElement('option');
	opt.value = 'SERVER';
	opt.appendChild(document.createTextNode('SERVER'));
	toSelector.appendChild(opt);
	
};

/**
* Adds all the players from a specified playerList object to a given
* select element.
* 
* @see GameWindow.addStandardRecipients 
* 
*/
GameWindow.prototype.populateRecipientSelector = function (toSelector, playerList) {
	if ('object' !==  typeof playerList || 'object' !== typeof toSelector) return;

	this.removeChildrenFromNode(toSelector);
	this.addStandardRecipients(toSelector);
	
	var players, opt;
	
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
* Creates an HTML select element with all the predefined actions
* (SET,GET,SAY,SHOW*) as options and returns it.
* 
* *not yet implemented
* 
* @see GameWindow.addActionSelector
* 
*/
GameWindow.prototype.getActionSelector = function (id) {
	var actionSelector = document.createElement('select');
	if ('undefined' !== typeof id ) {
		actionSelector.id = id;
	}
	this.populateSelect(actionSelector, node.actions);
	return actionSelector;
};

/**
* Appends an ActionSelector element to the specified root element.
* 
* @see GameWindow.getActionSelector
* 
*/
GameWindow.prototype.addActionSelector = function (root, id) {
	if (!root) return;
	var actionSelector = this.getActionSelector(id);
	return root.appendChild(actionSelector);
};

/**
* Creates an HTML select element with all the predefined targets
* (HI,TXT,DATA, etc.) as options and returns it.
* 
* *not yet implemented
* 
* @see GameWindow.addActionSelector
* 
*/
GameWindow.prototype.getTargetSelector = function (id) {
	var targetSelector = document.createElement('select');
	if ('undefined' !== typeof id ) {
		targetSelector.id = id;
	}
	this.populateSelect(targetSelector, node.targets);
	return targetSelector;
};

/**
* Appends a Target Selector element to the specified root element.
* 
* @see GameWindow.getTargetSelector
* 
*/
GameWindow.prototype.addTargetSelector = function (root, id) {
	if (!root) return;
	var targetSelector = this.getTargetSelector(id);
	return root.appendChild(targetSelector);
};


/**
* @experimental
* 
* Creates an HTML text input element where a nodeGame state can
* be inserted. This method should be improved to automatically
* show all the available states of a game.
* 
* @see GameWindow.addActionSelector
*/
GameWindow.prototype.getStateSelector = function (id) {
	var stateSelector = this.getTextInput(id);
	return stateSelector;
};

/**
* @experimental
* 
* Appends a StateSelector to the specified root element.
* 
* @see GameWindow.getActionSelector
* 
*/
GameWindow.prototype.addStateSelector = function (root, id) {
	if (!root) return;
	var stateSelector = this.getStateSelector(id);
	return root.appendChild(stateSelector);
};


// Do we need it?

/**
 * Overrides JSUS.DOM.generateUniqueId
 * 
 * @experimental
 * @TODO: it is not always working fine. 
 * @TODO: fix doc
 * 
 */
GameWindow.prototype.generateUniqueId = function (prefix) {
	var id = '' + (prefix || J.randomInt(0, 1000));
	var found = this.getElementById(id);
	
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
 * Binds the ESC key to a function that always returns FALSE.
 * 
 * This prevents socket.io to break the connection with the
 * server.
 * 
 * @param {object} windowObj Optional. The window container in which binding the ESC key
 */
GameWindow.prototype.noEscape = function (windowObj) {
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
 * Removes the the listener on the ESC key.
 * 
 * @param {object} windowObj Optional. The window container in which binding the ESC key
 * @see GameWindow.noEscape()
 */
GameWindow.prototype.restoreEscape = function (windowObj) {
	windowObj = windowObj || window;
	windowObj.document.onkeydown = null;
};



/**
 * ### GameWindow.promptOnleave
 * 
 * Captures the onbeforeunload event, and warns the user
 * that leaving the page may halt the game.
 * 
 * @param {object} windowObj Optional. The window container in which binding the ESC key
 * @param {string} text Optional. A text to be displayed in the alert message. 
 * 
 * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
 * 
 */
GameWindow.prototype.promptOnleave = function (windowObj, text) {
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
 * Removes the onbeforeunload event listener.
 * 
 * @param {object} windowObj Optional. The window container in which binding the ESC key
 * 
 * @see GameWindow.promptOnleave
 * @see https://developer.mozilla.org/en/DOM/window.onbeforeunload
 * 
 */
GameWindow.prototype.restoreOnleave = function (windowObj) {
	windowObj = windowObj || window;
	windowObj.onbeforeunload = null;
};

// Do we need these?

/**
 * Returns the screen of the game, i.e. the innermost element
 * inside which to display content. 
 * 
 * In the following order the screen can be:
 * 
 * 		- the body element of the iframe 
 * 		- the document element of the iframe 
 * 		- the body element of the document 
 * 		- the last child element of the document
 * 
 */
GameWindow.prototype.getScreen = function() {
	var el = this.frame;
	if (el) {
		el = this.frame.body || el;
	}
	else {
		el = document.body || document.lastElementChild;
	}
	return 	el;
};

/**
 * Returns the document element of the iframe of the game.
 * 
 * @TODO: What happens if the mainframe is not called mainframe?
 */
GameWindow.prototype.getFrame = function() {
	return this.frame = window.frames['mainframe'].document;
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
