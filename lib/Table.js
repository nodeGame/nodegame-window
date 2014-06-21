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

    // ## Helper Functions

    /**
     * ## fromCell2TD
     *
     * Create a cell element (td, th, etc.) and renders its content
     *
     * @param {Cell} cell The cell to transform in element
     * @param {string} tagName The name of the tag. Defaults, 'td'
     */
    function fromCell2TD(cell, tagName) {
        var TD, content;
        if (!cell) return;
        tagName = tagName || 'td';
        TD = document.createElement(tagName);
        content = this.htmlRenderer.render(cell);
        TD.appendChild(content);
        if (cell.className) TD.className = cell.className;
        return TD;
    }

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

        /**
         * ## Table.missing
         *
         * Class name for missing cells.
         *
         */
        this.missing = options.missing || 'missing';

        /**
         * ## Table.pointers
         *
         * References to last inserted cell coordinates
         */
        this.pointers = {
            x: options.pointerX || null,
            y: options.pointerY || null
        };

        /**
         * ## Table.header
         *
         * Array containing the header elements of the table
         */
        this.header = [];

        /**
         * ## Table.footer
         *
         * Array containing the footer elements of the table
         */
        this.footer = [];

        /**
         * ## Table.left
         *
         * Array containing elements to keep on the left border of the table
         */
        this.left = [];

        /**
         * ## Table.right
         *
         * Array containing elements to keep on the right border of the table
         */
        this.right = [];

        /**
         * ## Table.table
         *
         * Reference to the HTMLElement Table
         */
        this.table = options.table || document.createElement('table');

        if ('undefined' !== typeof options.id) {
            this.table.id = options.id;
        }

        if ('undefined' !== typeof options.className) {
            this.table.className = options.className;
        }


        // TODO: see if we need it here
        this.autoParse = 'undefined' !== typeof options.autoParse ?
            options.autoParse : false;

        // Init renderer.
        this.initRenderer(options.render);
    }

    /**
     * Table.initRenderer
     *
     * Creates the `HTMLRenderer` object and adds a renderer for objects.
     *
     * Every cell in the table will be rendered according to the criteria
     * added to the renderer object
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
                    if (el.content.hasOwnProperty(key)) {
                        tbl.addRow([key, el.content[key]]);
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
     * ## Table.setHeader
     *
     * Sets the names of the header elements on top of the table
     *
     * @param {string|array} Array of strings representing the names
     *   of the header elements
     */
    Table.prototype.setHeader = function(header) {
        this.header = this._addSpecial(header, 'header');
    };

    /**
     * ## Table.setLeft
     *
     * Sets the element of a column that will be added to the left of the table
     *
     * @param {string|array} Array of strings representing the names
     *   of the left elements
     */
    Table.prototype.setLeft = function(left) {
        this.left = this._addSpecial(left, 'left');
    };

    /**
     * ## Table.setFooter
     *
     * Sets the names of the footer elements at the bottom of the table
     *
     * @param {string|array} Array of strings representing the names
     *   of the footer elements
     */
    Table.prototype.setFooter = function(footer) {
        this.footer = this._addSpecial(footer, 'footer');
    };

    /**
     * Table.updatePointer
     *
     * Updates the reference to the foremost element in the table
     *
     * The pointer is updated only if the suggested value is larger than
     * the current one.
     *
     * @param {string} The name of pointer ('x', 'y')
     * @param {number} The new value for the pointer
     * @return {boolean|number} The updated value of the pointer, or FALSE,
     *   if an invalid pointer was selected
     *
     * @see Table.pointers
     */
    Table.prototype.updatePointer = function(pointer, value) {
        if ('undefined' === typeof this.pointers[pointer]) {
            node.err('Table.updatePointer: invalid pointer: ' + pointer);
            return false;
        }

        if (this.pointers[pointer] === null || value > this.pointers[pointer]) {
            this.pointers[pointer] = value;
        }
        return this.pointers[pointer];
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
     * ## Table.addMultiple
     *
     *
     * @api private
     */
    Table.prototype.addMultiple = function(data, dim, x, y) {
        var i, lenI, j, lenJ;

        if ((dim && 'string' !== typeof dim) ||
            (dim && 'undefined' === typeof this.pointers[dim])) {
            throw new TypeError('Table.addMultiple: dim must be a valid ' +
                                'string (x, y) or undefined.');
        }
        dim = dim || 'x';

        // Horizontal increment: dim === y.
        x = this.getCurrPointer('x', x);
        y = this.getNextPointer('y', y);

        // By default, only the second dimension is incremented, so we move
        x = 'undefined' !== typeof x ? x :
            this.pointers.x === null ? 0 : this.pointers.x;
        y = 'undefined' !== typeof y ? y :
            this.pointers.y === null ? 0 : this.pointers.y;

        if (!J.isArray(data)) data = [data];

        // Loop Dim 1.
        i = -1, lenI = data.length;
        for ( ; ++i < lenI ; ) {

            if (!J.isArray(data[i])) {
                if (dim === 'x') this.add(data[i], x, y + i, 'x');
                else this.add(data[i], x + i, y, 'y');
            }
            else {
                // Loop Dim 2.
                j = -1, lenJ = data[i].length;
                for ( ; ++j < lenJ ; ) {
                    if (dim === 'x') this.add(data[i][j], x + i, y + j, 'x');
                    else this.add(data[i][j], x + j, y + i, 'y');
                }
            }
        }

        if (this.autoParse) {
            this.parse();
        }

    };

    /**
     * ## Table.add
     *
     * Adds a single cell to the table
     *
     * @param {object} content The content of the cell or Cell object
     */
    Table.prototype.add = function(content, x, y, dim) {
        var cell, x, y;
        if (!content) return;
        if ((dim && 'string' !== typeof dim) ||
            (dim && 'undefined' === typeof this.pointers[dim])) {
            throw new TypeError('Table.add: dim must be a valid string ' +
                                '(x, y) or undefined.');
        }
        dim = dim || 'x';
        
        // Horizontal increment: dim === y.
        x = dim === 'y' ? 
            this.getCurrPointer('x', x) : this.getNextPointer('x', x);
        y = dim === 'y' ?
            this.getNextPointer('y', y) : this.getCurrPointer('y', y);
        
        cell = new Cell({
            x: x,
            y: y,
            content: content
        });

        this.insert(cell);

        this.updatePointer('x', x);
        this.updatePointer('y', y);
    };

    // TODO: check data properly
    Table.prototype.addColumn = function(data, x, y) {
        if (!data) return false;
        return this.addMultiple(data, 'y', x || 0, this.getNextPointer('y', y));
    };

    // TODO: check data properly
    Table.prototype.addRow = function(data, x, y) {
        if (!data) return false;
        return this.addMultiple(data, 'x', this.getNextPointer('x', x), y || 0);
    };

    Table.prototype.getNextPointer = function(dim, value) {
        if ('undefined' !== typeof value) return value;
        return this.pointers[dim] === null ? 0 : this.pointers[dim] + 1;
    };

    Table.prototype.getCurrPointer = function(dim, value) {
        if ('undefined' !== typeof value) return value;
        return this.pointers[dim] === null ? 0 : this.pointers[dim];
    };       

  // TODO: improve algorithm, rewrite
    Table.prototype.parse = function() {
        var TABLE, TR, TD, THEAD, TBODY, TFOOT;
        var i, j, len;
        var trid, f, old_y, old_left;
        var diff;

        // TODO: we could find a better way to update a table, instead of
        // removing and re-inserting everything.
        if (this.table) {
            while (this.table.hasChildNodes()) {
                this.table.removeChild(this.table.firstChild);
            }
        }

        TABLE = this.table;

        // HEADER
        if (this.header && this.header.length) {
            THEAD = document.createElement('thead');
            TR = document.createElement('tr');
            // Add an empty cell to balance the left header column.
            if (this.left && this.left.length) {
                TR.appendChild(document.createElement('th'));
            }
            i = -1, len = this.header.length;
            for ( ; ++i < len ; ) {
                TR.appendChild(fromCell2TD.call(this, this.header[i], 'th'));
            }
            THEAD.appendChild(TR);
            TABLE.appendChild(THEAD);
        }

        // BODY
        if (this.size()) {
            TBODY = document.createElement('tbody');

            this.sort(['x','y']);

            // Forces to create a new TR element.
            trid = -1;

            // TODO: What happens if the are missing at the beginning ??
            f = this.first();
            old_y = f.y;
            old_left = 0;


            i = -1, len = this.db.length;
            for ( ; ++i < len ; ) {

                if (trid !== this.db[i].x) {
                    TR = document.createElement('tr');
                    TBODY.appendChild(TR);

                    // Keep a reference to current TR idx.
                    trid = this.db[i].x;

                    old_y = f.y - 1; // must start exactly from the first

                    // Insert left header, if any.
                    if (this.left && this.left.length) {
                        TD = document.createElement('td');
                        //TD.className = this.missing;
                        TR.appendChild(fromCell2TD.call(this, this.left[old_left]));
                        old_left++;
                    }
                }

                // Insert missing cells.
                if (this.db[i].y > old_y + 1) {
                    diff = this.db[i].y - (old_y + 1);
                    for (j = 0; j < diff; j++ ) {
                        TD = document.createElement('td');
                        TD.className = this.missing;
                        TR.appendChild(TD);
                    }
                }
                // Normal Insert.
                TR.appendChild(fromCell2TD.call(this, this.db[i]));

                // Update old refs.
                old_y = this.db[i].y;
            }
            TABLE.appendChild(TBODY);
        }


        // FOOTER.
        if (this.footer && this.footer.length) {
            TFOOT = document.createElement('tfoot');
            TR = document.createElement('tr');

            
            if (this.header && this.header.length) {
                TD = document.createElement('td');
                TD.className = this.missing;
                TR.appendChild(TD);
            }

            i = -1, len = this.footer.length;
            for ( ; ++i < len ; ) {
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
            y: pointers.pointerY || 0
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

        if (this.autoParse) {
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

        if (this.autoParse) {
            this.parse();
        }

        return this;
    };


    // # Cell Class

    Cell.prototype = new Entity();
    Cell.prototype.constructor = Cell;

    /**
     * ## Cell constructor
     *
     * Creates a new Table Cell
     *
     * @param {object} cell An object containing the coordinates in the table
     *
     * @see Entity
     * @see Table
     */
    function Cell(cell) {
        // Adds property: className and content.
        Entity.call(this, cell);
        
        /**
         * ## Cell.x
         *
         * The row number 
         */
        this.x = 'undefined' !== typeof cell.x ? cell.x : null;

        /**
         * ## Cell.y
         *
         * The column number 
         */
        this.y = 'undefined' !== typeof cell.y ? cell.y : null;
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports,
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof node) ? node : module.parent.exports.node
);