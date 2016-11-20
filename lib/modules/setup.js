/**
 * # setup.window
 * Copyright(c) 2015 Stefano Balietti
 * MIT Licensed
 *
 * GameWindow setup functions
 *
 * http://www.nodegame.org
 */
(function(window, node) {

    var GameWindow = node.GameWindow;
    var J = node.JSUS;

    /**
     * ### GameWindow.addDefaultSetups
     *
     * Registers setup functions for GameWindow, the frame and the header
     */
    GameWindow.prototype.addDefaultSetups = function() {

        /**
         * ### node.setup.window
         *
         * Setup handler for the node.window object
         *
         * @see node.setup
         */
        node.registerSetup('window', function(conf) {
            this.window.init(conf);
            return conf;
        });

        /**
         * ### node.setup.page
         *
         * Manipulates the HTML page
         *
         * @see node.setup
         */
        node.registerSetup('page', function(conf) {
            var tmp, body;
            if (!conf) return;

            // Clear.
            if (conf.clearBody) this.window.clearPageBody();
            if (conf.clear) this.window.clearPage();
            if ('string' === typeof conf.title) {
                conf.title = { title: conf.title };
            }
            if ('object' === typeof conf.title) {
                // TODO: add option to animate it.
                document.title = conf.title.title;
                if (conf.title.addToBody) {
                    tmp = document.createElement('h1');
                    tmp.className = 'ng-page-title';
                    tmp.innerHTML = conf.title.title;
                    body = document.body;
                    if (body.innerHTML === '') body.appendChild(tmp);
                    else body.insertBefore(tmp, body.firstChild);
                }
            }
            return conf;
        });

        /**
         * ### node.setup.frame
         *
         * Manipulates the frame object
         *
         * @see node.setup
         */
        node.registerSetup('frame', function(conf) {
            var url, cb, options;
            var frameName, force, root, rootName;
            if (!conf) return;

            // Generate.
            if (conf.generate) {
                if ('object' === typeof conf.generate) {
                    if (conf.generate.root) {
                        if ('string' !== typeof conf.generate.root) {
                            node.warn('node.setup.frame: conf.generate.root ' +
                                      'must be string or undefined.');
                            return;
                        }
                        rootName = conf.generate.root;
                        force = conf.generate.force;
                        frameName = conf.generate.name;
                    }
                }
                else {
                    node.warn('node.setup.frame: conf.generate must be ' +
                              'object or undefined.');
                    return;
                }

                root = this.window.getElementById(rootName);
                if (!root) root = this.window.getScreen();
                if (!root) {
                    node.warn('node.setup.frame: could not find valid ' +
                              'root element to generate new frame.');
                    return;
                }

                this.window.generateFrame(root, frameName, force);
            }

            // Uri prefix.
            if ('undefined' !== typeof conf.uriPrefix) {
                this.window.setUriPrefix(conf.uriPrefix);
            }

            // Load.
            if (conf.load) {
                if ('object' === typeof conf.load) {
                    url = conf.load.url;
                    cb = conf.load.cb;
                    options = conf.load.options;
                }
                else if ('string' === typeof conf.load) {
                    url = conf.load;
                }
                else {
                    node.warn('node.setup.frame: conf.load must be string, ' +
                              'object or undefined.');
                    return;
                }
                this.window.loadFrame(url, cb, options);
            }

            // Clear and destroy.
            if (conf.clear) this.window.clearFrame();
            if (conf.destroy) this.window.destroyFrame();

            return conf;
        });

        /**
         * ### node.setup.header
         *
         * Manipulates the header object
         *
         * @see node.setup
         */
        node.registerSetup('header', function(conf) {
            var headerName, force, root, rootName;
            if (!conf) return;

            // Generate.
            if (conf.generate) {
                if ('object' === typeof conf.generate) {
                    if (conf.generate.root) {
                        if ('string' !== typeof conf.generate.root) {
                            node.warn('node.setup.header: conf.generate.root ' +
                                      'must be string or undefined.');
                            return;
                        }
                        rootName = conf.generate.root;
                        force = conf.generate.force;
                        headerName = conf.generate.name;
                    }
                }
                else {
                    node.warn('node.setup.header: conf.generate must be ' +
                              'object or undefined.');
                    return;
                }

                root = this.window.getElementById(rootName);
                if (!root) root = this.window.getScreen();
                if (!root) {
                    node.warn('node.setup.header: could not find valid ' +
                              'root element to generate new header.');
                    return;
                }

                this.window.generateHeader(root, headerName, force);
            }

            // Position.
            if (conf.position) {
                if ('string' !== typeof conf.position) {
                    node.warn('node.setup.header: conf.position ' +
                              'must be string or undefined.');
                    return;
                }
                this.window.setHeaderPosition(conf.position);
            }

            // Clear and destroy.
            if (conf.clear) this.window.clearHeader();
            if (conf.destroy) this.window.destroyHeader();

            return conf;
        });

    };
})(
    // GameWindow works only in the browser environment. The reference
    // to the node.js module object is for testing purpose only
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof window) ? window.node : module.parent.exports.node
);
