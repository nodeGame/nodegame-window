// Creates a new GameWindow instance in the global scope.
(function() {
    "use strict";
    node.window = new node.GameWindow();
    if ('undefined' !== typeof window) window.W = node.window;
})();
