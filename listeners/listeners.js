// ## Game incoming listeners
// Incoming listeners are fired in response to incoming messages
(function (node, window) {
	
	if (!node) {
		console.log('nodegame-window: node object not found.');
		return false;
	}
	if (!window)
		node.err('window object not found.', 'nodegame-window');
		return false;
	}
	
	node.on('NODEGAME_GAME_CREATED', function() {
		window.init(node.conf.window);
	});
	
	node.on('HIDE', function(id) {
		var el = window.getElementById(id);
		if (!el) {
			node.log('Cannot hide element ' + id);
			return;
		}
		el.style.visibility = 'hidden';    
	});
	
	node.on('SHOW', function(id) {
		var el = window.getElementById(id);
		if (!el) {
			node.log('Cannot show element ' + id);
			return;
		}
		el.style.visibility = 'visible'; 
	});
	
	node.on('TOGGLE', function(id) {
		var el = window.getElementById(id);
		if (!el) {
			node.log('Cannot toggle element ' + id);
			return;
		}
		if (el.style.visibility === 'visible') {
			el.style.visibility = 'hidden';
		}
		else {
			el.style.visibility = 'visible';
		}
	});
	
	// Disable all the input forms found within a given id element
	node.on('INPUT_DISABLE', function(id) {
		window.toggleInputs(id, true);			
	});
	
	// Disable all the input forms found within a given id element
	node.on('INPUT_ENABLE', function(id) {
		window.toggleInputs(id, false);
	});
	
	// Disable all the input forms found within a given id element
	node.on('INPUT_TOGGLE', function(id) {
		window.toggleInputs(id);
	});
	
	node.log('node-window: listeners added');
	
})(
	'undefined' !== typeof node ? node : undefined
 ,  'undefined' !== typeof node.window ? node.window : undefined			
); 
// <!-- ends nodegame-window listener -->