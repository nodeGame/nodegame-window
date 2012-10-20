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
 * Loads and unloads special javascript/HTML snippets, called widgets,
 * in the page.
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
GameWindow.prototype = DOM;
GameWindow.prototype.constructor = GameWindow;

// Configuration object
GameWindow.defaults = {};

// Default settings
GameWindow.defaults.promptOnleave = true;
GameWindow.defaults.noEscape = true;


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
	
	this.state = GameState.iss.LOADED;
	this.areLoading = 0; 
	
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
 * ## GameWindow.load
 * 
 * Loads content from an uri (remote or local) into the iframe, 
 * and after it is loaded executes the callback function. 
 * 
 * The third parameter is the id of the frame in which to load the content. 
 * If it is not specified, the default iframe of the game is assumed.
 * 
 * Warning: Security policies may block this methods, if the 
 * content is coming from another domain.
 * 
 * @param {string} uri The uri to load
 * @param {function} func The callback function to call once the DOM is ready
 * @param {string} frame The name of the frame in which loading the uri
 * 
 */
GameWindow.prototype.load = GameWindow.prototype.loadFrame = function (uri, func, frame) {
	if (!uri) return;
	frame =  frame || this.mainframe;
	
	this.state = GameState.iss.LOADING;
	this.areLoading++; // keep track of nested call to loadFrame
	
	var that = this;	
			
	// First add the onload event listener
	var iframe = document.getElementById(frame);
	iframe.onload = function () {
		if (that.conf.noEscape) {
			
			// TODO: inject the no escape code here
			
			//that.addJS(iframe.document, node.conf.host + 'javascripts/noescape.js');
			//that.addJS(that.getElementById('mainframe'), node.conf.host + 'javascripts/noescape.js');
		}
		that.updateStatus(func, frame);
	};

	// Then update the frame location
	window.frames[frame].location = uri;
	
	
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
	//console.log('ARE LOADING: ' + this.areLoading);
	if (this.areLoading === 0) {
		this.state = GameState.iss.LOADED;
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
	
	var opt;
	var pl = new PlayerList({}, playerList);
	try {
		pl.forEach( function(p) {
			opt = document.createElement('option');
			opt.value = p.id;
			opt.appendChild(document.createTextNode(p.name || p.id));
			toSelector.appendChild(opt);
		});
	}
	catch (e) {
		node.log('Bad Formatted Player List. Discarded. ' + p, 'ERR');
	}
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