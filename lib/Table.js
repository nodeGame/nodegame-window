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

    // ## Helper Functions

    function insertCell(content, dims, y, z, i, j, h) {
        var cell;
        cell = {};
        cell[dims[0]] = i; // i always defined
        cell[dims[1]] = (j) ? y + j : y;
        cell[dims[2]] = (h) ? z + h : z;
        cell.content = content;
        this.insert(new Cell(cell));
        this.updatePointer(dims[0], cell[dims[0]]);
        this.updatePointer(dims[1], cell[dims[1]]);
        this.updatePointer(dims[2], cell[dims[2]]);
    }

    // Create a cell element (td,th...)
    // and fill it with the return value of a
    // render value.
    function fromCell2TD(cell, el) {
        var TD, content;
        if (!cell) return;
        el = el || 'td';
        TD = document.createElement(el);
        content = this.htmlRenderer.render(cell);
        TD.appendChild(content);
        if (cell.className) TD.className = cell.className;
        return TD;
    };

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
            x: options.pointerX || 0,
            y: options.pointerY || 0,
            z: options.pointerZ || 0
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
        this.auto_update = 'undefined' !== typeof options.auto_update ?
            options.auto_update : false;

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
                    if (el.content.hasOwnProperty(key)) {
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

    /**
     * Table.updatePointer
     *
     * Updates the reference to the foremost element in the table
     *
     * The pointer is updated only if the suggested value is larger than
     * the current one
     *
     * @param {string} The name of pointer ('x', 'y', 'z')
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

        if (value > this.pointers[pointer]) {
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
     * ## Table._add
     *
     *  
     * @api private
     */
    Table.prototype._add = function(data, dims, x, y, z) {
        var cell;
        var i, lenI, j, lenJ, h, lenH;

        // By default, only the second dimension is incremented.
        x = x || this.pointers[dims[0]];
        y = y || this.pointers[dims[1]] + 1;
        z = z || this.pointers[dims[2]];

        if (!J.isArray(data)) data = [data];

        cell = null;

        // Loop Dim 1.
        i = -1, lenI = data.length;
        for ( ; ++i < lenI ; ) {

            if (!J.isArray(data[i])) {
                 insertCell.call(this, data[i], dims, y, z, i);
            }
            else {                
                // Loop Dim 2.
                j = -1, lenJ = data[i].length;
                for ( ; ++j < lenJ ; ) {

                    if (!J.isArray(data[i][j])) {
                        insertCell.call(this, data[i][j], dims, y, z, i, j, h);
                    }
                    else {
                        // Loop Dim 3.
                        h = -1, lenH = data[i][j].length;
                        for ( ; ++h < lenH ; ) {
                            insertCell.call(this, data[i][j][h], dims, y, z, i, j);
                        }
                        // Reset h.
                        h = 0;
                    }
                }
                // Reset j.
                j = 0;
            }
        }

        if (this.auto_update) {
            this.parse(true);
        }

    };

    /**
     * ## Table.add
     *
     * Adds a single cell to the table
     *
     * @param {Cell|object} content The content of the cell or Cell object 
     */
    Table.prototype.add = function(content, x, y) {
        var cell, res;
        if (!content) return;
        cell = (content instanceof Cell) ? content : new Cell({
            x: x,
            y: y,
            content: content
        });
        res = this.insert(cell);
        if (res) {
            this.updatePointer('x', x);
            this.updatePointer('y', y);
        }
        return res;
    };

    // TODO: check data properly
    Table.prototype.addColumn = function(data, x, y) {
        if (!data) return false;
        return this._add(data, Table.V, x, y);
    };

    // TODO: check data properly
    Table.prototype.addRow = function(data, x, y) {
        if (!data) return false;
        return this._add(data, Table.H, x, y);
    };


    // TODO: Only 2D for now
    // TODO: improve algorithm, rewrite
    Table.prototype.parse = function() {
        var TABLE, TR, TD, THEAD, TBODY, TFOOT;
        var i, j, len;
        var trid, f, old_x, old_left;
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
        if (this.header && this.header.length > 0) {
            THEAD = document.createElement('thead');
            TR = document.createElement('tr');
            // Add an empty cell to balance the left header column.
            if (this.left && this.left.length > 0) {
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

            this.sort(['y','x']); // z to add first
            trid = -1;

            // TODO: What happens if the are missing at the beginning ??
            f = this.first();
            old_x = f.x;
            old_left = 0;


            i = -1, len = this.db.length;
            for ( ; ++i < len ; ) {

                if (trid !== this.db[i].y) {
                    TR = document.createElement('tr');
                    TBODY.appendChild(TR);
                    trid = this.db[i].y;

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