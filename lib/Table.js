/**
 * # Table
 * Copyright(c) 2017 Stefano Balietti
 * MIT Licensed
 *
 * Creates an HTML table that can be manipulated by an api.
 *
 * Elements can be added individually, as a row, or as column.
 * They are tranformed into `Cell` objects containining the original
 * element and a reference to the HTMLElement (e.g. td, th, etc.)
 *
 * Internally, data is organized as a `NDDB` database.
 *
 * When `.parse()` method is called the current databaase structure is
 * processed to create the real HTML table. Each cell is passed to the
 * `HTMLRenderer` instance which tranforms it the correspondent HTML
 * element based on a user-defined render function.
 *
 * The HTML-renderer object renders cells into HTML following a pipeline
 * of decorator functions. By default, the following rendering operations
 * are applied to a cell in order:
 *
 * - if it is already an HTML element, returns it;
 * - if it contains a  #parse() method, tries to invoke it to generate HTML;
 * - if it is an object, tries to render it as a table of key:value pairs;
 * - if it is a string or number, creates an HTML text node and returns it
 *
 * @see NDDB
 * @see HTMLRendered
 *
 * www.nodegame.org
 */
(function(exports, window, node) {

    "use strict";

    var document = window.document;

    exports.Table = Table;
    exports.Table.Cell = Cell;

    var NDDB = node.NDDB;
    var HTMLRenderer = node.window.HTMLRenderer;
    var Entity = node.window.HTMLRenderer.Entity;

    Table.prototype = new NDDB();
    Table.prototype.constructor = Table;

    /**
     * ## Tan;e.
     *
     * Returns a new cell
     *
     */
    Table.cell = function(o) {
        return new Cell(o);
    };

    /**
     * ## Table constructor
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

//         // ### Table.row
//         // NDDB hash containing elements grouped by row index
//         // @see NDDB.hash
//         if (!this.row) {
//             this.hash('row', function(c) {
//                 return c.x;
//             });
//         }
//
//         // ### Table.col
//         // NDDB hash containing elements grouped by column index
//         // @see NDDB.hash
//         if (!this.col) {
//             this.hash('col', function(c) {
//                 return c.y;
//             });
//         }

        // ### Table.rowcol
        // NDDB index to access elements with row.col notation
        // @see NDDB.hash
        if (!this.rowcol) {
            this.index('rowcol', function(c) {
                return c.x + '.' + c.y;
            });
        }

        /**
         * ### Table.pointers
         *
         * References to last inserted cell coordinates
         */
        this.pointers = {
            x: options.pointerX || null,
            y: options.pointerY || null
        };

        /**
         * ### Table.header
         *
         * Array containing the header elements of the table
         */
        this.header = [];

        /**
         * ### Table.footer
         *
         * Array containing the footer elements of the table
         */
        this.footer = [];

        /**
         * ### Table.left
         *
         * Array containing elements to keep on the left border of the table
         */
        this.left = [];

        /**
         * ### Table.table
         *
         * Reference to the HTMLElement Table
         */
        this.table = options.table || document.createElement('table');

        if ('string' === typeof options.id) {
            this.table.id = options.id;
        }
        else if (options.id) {
            throw new TypeError('Table constructor: options.id must be ' +
                                'string or undefined.');
        }

        if ('string' === typeof options.className) {
            this.table.className = options.className;
        }
        else if (J.isArray(options.className)) {
            this.table.className = options.className.join(' ');
        }
        else if (options.className) {
            throw new TypeError('Table constructor: options.className must ' +
                                'be string, array, or undefined.');
        }

        /**
         * ### Table.missingClassName
         *
         * Class name for "missing" cells
         *
         * "Missing" cells are cells that are added automatically to complete
         * the table because one or more cells have been added with higher
         * row and column indexes.
         */
        this.missingClassName = 'missing';

        if ('string' === typeof options.missingClassName) {
            this.missingClassName = options.missingClassName;
        }
        else if (J.isArray(options.missingClassName)) {
            this.missingClassName = options.missingClassName.join(' ');
        }
        else if (options.missingClassName) {
            throw new TypeError('Table constructor: options.className must ' +
                                'be string, array, or undefined.');
        }

        /**
         * ### Table.autoParse
         *
         * If TRUE, whenever a new cell is added the table is updated.
         * Default: FALSE
         */
        this.autoParse = 'undefined' !== typeof options.autoParse ?
            options.autoParse : false;

        /**
         * ### Table.trs
         *
         * List of TR elements indexed by their order in the parsed table
         */
        this.trs = {};

        /**
         * ### Table.trCb
         *
         * Callback function applied to each TR HTML element
         *
         * Callback receives the HTML element, and the row index, or
         * 'thead' and 'tfoot' for header and footer.
         */
        if ('function' === typeof options.tr) {
            this.trCb = options.tr;
        }
        else if ('undefined' === typeof options.tr) {
            this.trCb = null;
        }
        else {
            throw new TypeError('Table constructor: options.tr must be ' +
                                'function or undefined.');
        }

        // Init renderer.
        this.initRenderer(options.render);
    }

    // ## Table methods

    /**
     * ### Table.initRenderer
     *
     * Creates the `HTMLRenderer` object and adds a renderer for objects
     *
     * Every cell in the table will be rendered according to the criteria
     * added to the renderer object.
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
            if (el.content && 'object' === typeof el.content) {
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
     * ### Table.renderCell
     *
     * Create a cell element (td, th, etc.) and renders its content
     *
     * It also adds an internal reference to the newly created TD/TH element,
     * stored under a `.HTMLElement` key.
     *
     * If the cell contains a `.className` attribute, this is added to
     * the HTML element.
     *
     * @param {Cell} cell The cell to transform in element
     * @param {string} tagName The name of the tag. Default: 'td'
     *
     * @return {HTMLElement} The newly created HTML Element (TD/TH)
     *
     * @see Table.htmlRenderer
     * @see Cell
     */
    Table.prototype.renderCell = function(cell, tagName) {
        var TD, content;
        if (!cell) return;
        tagName = tagName || 'td';
        TD = document.createElement(tagName);
        content = this.htmlRenderer.render(cell);
        TD.appendChild(content);
        if (cell.className) TD.className = cell.className;
        if (cell.id) TD.id = cell.id;
        if (cell.colspan) TD.setAttribute('colSpan', cell.colspan);
        cell.HTMLElement = TD;
        return TD;
    };

    /**
     * ### Table.get
     *
     * Returns the element at row column (row,col)
     *
     * @param {number} row The row number
     * @param {number} col The column number
     *
     * @return {Cell|array} The Cell or array of cells specified by indexes
     */
    Table.prototype.get = function(row, col) {
        validateXY('get', row, col, 'any');

        // TODO: check if we can use hashes.
        if ('undefined' === typeof row) {
            return this.select('y', '=', col);
        }
        if ('undefined' === typeof col) {
            return this.select('x', '=', row);
        }

        return this.rowcol.get(row + '.' + col);
    };

    /**
     * ### Table.getTR
     *
     * Returns a reference to the TR element at row (row)
     *
     * TR elements are generated only after the table is parsed.
     *
     * Notice! If the table structure is manipulated externally,
     * the return value of this method might be inaccurate.
     *
     * @param {number} row The row number
     *
     * @return {HTMLElement|boolean} The requested TR object, or FALSE if it
     *   cannot be found
     */
    Table.prototype.getTR = function(row) {
        if (row !== 'thead' && row !== 'tfoot') {
            validateXY('getTR', row, undefined, 'x');
        }
        return this.trs[row] || false;
    };

    /**
     * ### Table.setHeader
     *
     * Sets the names of the header elements on top of the table
     *
     * @param {string|array} header Array of strings representing the names
     *   of the header elements
     */
    Table.prototype.setHeader = function(header) {
        validateInput('setHeader', header, undefined, undefined, true);
        this.header = addSpecialCells(header);
    };

    /**
     * ### Table.setLeft
     *
     * Sets the element of a column that will be added to the left of the table
     *
     * @param {string|array} left Array of strings representing the names
     *   of the left elements
     */
    Table.prototype.setLeft = function(left) {
        validateInput('setLeft', left, undefined, undefined, true);
        this.left = addSpecialCells(left);
    };

    /**
     * ### Table.setFooter
     *
     * Sets the names of the footer elements at the bottom of the table
     *
     * @param {string|array} footer Array of strings representing the names
     *   of the footer elements
     */
    Table.prototype.setFooter = function(footer) {
        validateInput('setFooter', footer, undefined, undefined, true);
        this.footer = addSpecialCells(footer);
    };

    /**
     * ### Table.updatePointer
     *
     * Updates the reference to the foremost element in the table
     *
     * The pointer is updated only if the suggested value is larger than
     * the current one.
     *
     * @param {string} pointer The name of pointer ('x', 'y')
     * @param {number} value The new value for the pointer
     *
     * @return {boolean|number} The updated value of the pointer, or FALSE,
     *   if an invalid pointer was selected
     *
     * @see Table.pointers
     */
    Table.prototype.updatePointer = function(pointer, value) {
        if ('undefined' === typeof this.pointers[pointer]) {
            throw new Error('Table.updatePointer: invalid pointer: ' + pointer);
        }
        if (this.pointers[pointer] === null || value > this.pointers[pointer]) {
            this.pointers[pointer] = value;
        }
        return this.pointers[pointer];
    };

    /**
     * ### Table.addMultiple
     *
     * Primitive to add multiple cells in column or row form
     *
     * @param {array} data The cells to add
     * @param {string} dim The dimension of followed by the insertion:
     *   'y' inserts as a row, and 'x' inserts as a column.
     * @param {number} x Optional. The row at which to start the insertion.
     *   Default: the current x pointer
     * @param {number} y Optional. The column at which to start the insertion.
     *   Default: the current y pointer
     */
    Table.prototype.addMultiple = function(data, dim, x, y) {
        var i, lenI, j, lenJ;
        validateInput('addMultiple', data, x, y);
        if ((dim && 'string' !== typeof dim) ||
            (dim && 'undefined' === typeof this.pointers[dim])) {
            throw new TypeError('Table.addMultiple: dim must be a valid ' +
                                'dimension (x or y) or undefined.');
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
        i = -1;
        lenI = data.length;
        for ( ; ++i < lenI ; ) {

            if (!J.isArray(data[i])) {
                if (dim === 'x') this.add(data[i], x, y + i, 'x');
                else this.add(data[i], x + i, y, 'y');
            }
            else {
                // Loop Dim 2.
                j = -1;
                lenJ = data[i].length;
                for ( ; ++j < lenJ ; ) {
                    if (dim === 'x') this.add(data[i][j], x + i, y + j, 'x');
                    else this.add(data[i][j], x + j, y + i, 'y');
                }
            }
        }
        // Auto-parse.
        if (this.autoParse) this.parse();
    };

    /**
     * ### Table.add
     *
     * Adds a single cell to the table
     *
     * @param {object} content The content of the cell or Cell object
     */
    Table.prototype.add = function(content, x, y, dim) {
        var cell;
        validateInput('add', content, x, y);
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

        if (content && 'object' === typeof content &&
            'undefined' !== typeof content.content) {

            if ('undefined' === typeof content.x) content.x = x;
            if ('undefined' === typeof content.y) content.y = y;

            cell = new Cell(content);
        }
        else {
            cell = new Cell({
                x: x,
                y: y,
                content: content
            });
        }

        this.insert(cell);

        this.updatePointer('x', x);
        this.updatePointer('y', y);
    };

    /**
     * ### Table.addColumn
     *
     * Adds a new column into the table
     *
     * @param {array} data The array of data to add in column form
     * @param {number} x Optional. The row to which the column will be added.
     *   Default: row 0
     * @param {number} y Optional. The column next to which the new column
     *   will be added. Default: the last column in the table
     */
    Table.prototype.addColumn = function(data, x, y) {
        validateInput('addColumn', data, x, y);
        return this.addMultiple(data, 'y', x || 0, this.getNextPointer('y', y));
    };

    /**
     * ### Table.addRow
     *
     * Adds a new row into the table
     *
     * @param {array} data The array of data to add in row form
     * @param {number} x Optional. The row index at which the new row will be
     *   added. Default: after the last row
     * @param {number} y Optional. The column next to which the new row
     *   will be added. Default: column 0
     */
    Table.prototype.addRow = function(data, x, y) {
        validateInput('addRow', data, x, y);
        return this.addMultiple(data, 'x', this.getNextPointer('x', x), y || 0);
    };

    /**
     * ### Table.getNextPointer
     *
     * Returns the value of the pointer plus 1 for the requested dimension (x,y)
     *
     * @param {string} dim The dimension x or y
     * @param {value} value Optional. If set, returns this value
     *
     * @return {number} The requested pointer
     */
    Table.prototype.getNextPointer = function(dim, value) {
        if ('undefined' !== typeof value) return value;
        return this.pointers[dim] === null ? 0 : this.pointers[dim] + 1;
    };

    /**
     * ### Table.getCurrPointer
     *
     * Returns the value of the pointer for the requested dimension (x,y)
     *
     * @param {string} dim The dimension x or y
     * @param {value} value Optional. If set, returns this value
     *
     * @return {number} The requested pointer
     */
    Table.prototype.getCurrPointer = function(dim, value) {
        if ('undefined' !== typeof value) return value;
        return this.pointers[dim] === null ? 0 : this.pointers[dim];
    };

    /**
     * ### Table.parse
     *
     * Reads cells currently in database and builds up an HTML table
     *
     * It destroys the existing table, before parsing the database again.
     *
     * @see Table.db
     * @see Table.table
     * @see Cell
     */
    Table.prototype.parse = function() {
        var TABLE, TR, TD, THEAD, TBODY, TFOOT;
        var i, j, len;
        var trid, f, old_y, old_left;
        var diff;

        // TODO: we could find a better way to update a table, instead of
        // removing and re-inserting everything.
        if (this.table && this.table.children) {
            this.table.innerHTML = '';
            // TODO: which one is faster?
            // while (this.table.hasChildNodes()) {
            //     this.table.removeChild(this.table.firstChild);
            // }
        }

        TABLE = this.table;

        // HEADER
        if (this.header && this.header.length) {
            THEAD = document.createElement('thead');

            TR = document.createElement('tr');
            if (this.trCb) this.trCb(TR, 'thead');
            this.trs.thead = TR;

            // Add an empty cell to balance the left header column.
            if (this.left && this.left.length) {
                TR.appendChild(document.createElement('th'));
            }
            i = -1;
            len = this.header.length;
            for ( ; ++i < len ; ) {
                TR.appendChild(this.renderCell(this.header[i], 'th'));
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


            i = -1;
            len = this.db.length;
            for ( ; ++i < len ; ) {

                if (trid !== this.db[i].x) {
                    TR = document.createElement('tr');
                    if (this.trCb) this.trCb(TR, (trid+1));
                    this.trs[(trid+1)] = TR;

                    TBODY.appendChild(TR);

                    // Keep a reference to current TR idx.
                    trid = this.db[i].x;

                    old_y = f.y - 1; // must start exactly from the first

                    // Insert left header, if any.
                    if (this.left && this.left.length) {
                        TD = document.createElement('td');
                        //TD.className = this.missing;
                        TR.appendChild(this.renderCell(this.left[old_left]));
                        old_left++;
                    }
                }

                // Insert missing cells.
                if (this.db[i].y > old_y + 1) {
                    diff = this.db[i].y - (old_y + 1);
                    for (j = 0; j < diff; j++ ) {
                        TD = document.createElement('td');
                        TD.className = this.missingClassName;
                        TR.appendChild(TD);
                    }
                }
                // Normal insert.
                TR.appendChild(this.renderCell(this.db[i]));

                // Update old refs.
                old_y = this.db[i].y;
            }
            TABLE.appendChild(TBODY);
        }


        // FOOTER.
        if (this.footer && this.footer.length) {
            TFOOT = document.createElement('tfoot');

            TR = document.createElement('tr');
            if (this.trCb) this.trCb(TR, 'tfoot');
            this.trs.tfoot = TR;

            if (this.header && this.header.length) {
                TD = document.createElement('td');
                TR.appendChild(TD);
            }

            i = -1;
            len = this.footer.length;
            for ( ; ++i < len ; ) {
                TR.appendChild(this.renderCell(this.footer[i]));
            }
            TFOOT.appendChild(TR);
            TABLE.appendChild(TFOOT);
        }

        return TABLE;
    };

    /**
     * ### Table.resetPointers
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
     * ### Table.addClass
     *
     * Adds a CSS class to each HTML element in the table
     *
     * Cells not containing an HTML elements are skipped.
     *
     * @param {string|array} className The name of the class/classes.
     * @param {number} x Optional. Subsets only on dimension x
     * @param {number} y Optional. Subsets only on dimension y
     *
     * @return {Table} This instance for chaining
     */
    Table.prototype.addClass = function(className, x, y) {
        var db;
        if (J.isArray(className)) {
            className = className.join(' ');
        }
        else if ('string' !== typeof className) {
            throw new TypeError('Table.addClass: className must be string ' +
                                'or array.');
        }
        validateXY('addClass', x, y);

        db = this;
        if (!('undefined' === typeof x && 'undefined' === typeof y)) {
            if ('undefined' !== typeof x) db = db.select('x', '=', x);
            if ('undefined' !== typeof y) db = db.and('y', '=', y);
        }

        db.each(function(el) {
            W.addClass(el, className, true);
            if (el.HTMLElement) el.HTMLElement.className = el.className;
        });

        return this;
    };

    /**
     * ### Table.removeClass
     *
     * Removes a CSS class from each element cell in the table
     *
     * @param {string|array|null} className Optional. The name of the
     *   class/classes, or  null to remove all classes. Default: null.
     * @param {number} x Optional. Subsets only on dimension x
     * @param {number} y Optional. Subsets only on dimension y
     *
     * @return {Table} This instance for chaining
     */
    Table.prototype.removeClass = function(className, x, y) {
        var func, db;
        if (J.isArray(className)) {
            func = function(el, className) {
                for (var i = 0; i < className.length; i++) {
                    W.removeClass(el, className[i]);
                }
            };
        }
        else if ('string' === typeof className) {
            func = W.removeClass;
        }
        else if (null === className) {
            func = function(el) { el.className = ''; };
        }
        else {
            throw new TypeError('Table.removeClass: className must be ' +
                                'string, array, or null.');
        }

        validateXY('removeClass', x, y);

        db = this;
        if (!('undefined' === typeof x && 'undefined' === typeof y)) {
            if ('undefined' !== typeof x) db = db.select('x', '=', x);
            if ('undefined' !== typeof y) db = db.and('y', '=', y);
        }

        db.each(function(el) {
            func.call(this, el, className);
            if (el.HTMLElement) el.HTMLElement.className = el.className;
        });

        return this;
    };

    /**
     * ### Table.clear
     *
     * Removes all entries and indexes, and resets the pointers
     *
     * @see NDDB.clear
     */
    Table.prototype.clear = function() {
        NDDB.prototype.clear.call(this, true);
        this.resetPointers();
    };

    // ## Helper functions


    /**
     * ### validateXY
     *
     * Validates if x and y are correctly specified or throws an error
     *
     * @param {string} method The name of the method validating the input
     * @param {number} x Optional. The row index
     * @param {number} y Optional. The column index
     * @param {string} mode Optional. Additionally check for: 'both',
     *   'either', 'any', 'x', or 'y' parameter to be defined.
     */
    function validateXY(method, x, y, mode) {
        var xOk, yOk;
        if ('undefined' !== typeof x) {
            if ('number' !== typeof x || x < 0) {
                throw new TypeError('Table.' + method + ': x must be ' +
                                    'a non-negative number or undefined.');
            }
            xOk = true;
        }
        if ('undefined' !== typeof y) {
            if ('number' !== typeof y || y < 0) {
                throw new TypeError('Table.' + method + ': y must be ' +
                                    'a non-negative number or undefined.');
            }
            yOk = true;
        }
        if (mode === 'either' && xOk && yOk) {
            throw new Error('Table.' + method + ': either x OR y can ' +
                            'be defined.');
        }
        else if (mode === 'both' && (!xOk || !yOk)) {
            throw new Error('Table.' + method + ': both x AND y must ' +
                            'be defined.');
        }
        else if (mode === 'any' && (!xOk && !yOk)) {
            throw new Error('Table.' + method + ': either x or y must ' +
                            'be defined.');
        }
        else if (mode === 'x' && !xOk) {
            throw new Error('Table.' + method + ': x must be defined.');
        }
        else if (mode === 'y' && !yOk) {
            throw new Error('Table.' + method + ': y be defined.');
        }
    }

    /**
     * ### validateInput
     *
     * Validates user input and throws an error if input is not correct
     *
     * @param {string} method The name of the method validating the input
     * @param {mixed} data The data that will be inserted in the database
     * @param {number} x Optional. The row index
     * @param {number} y Optional. The column index
     * @param {boolean} dataArray TRUE, if data should be an array
     *
     * @return {boolean} TRUE, if input passes validation
     *
     * @see validateXY
     */
    function validateInput(method, data, x, y, dataArray) {
        validateXY(method, x, y);
        if (dataArray && !J.isArray(data)) {
            throw new TypeError('Table.' + method + ': data must be array.');
        }
    }

    /**
     * ### addSpecialCells
     *
     * Parses an array of data and returns an array of cells
     *
     * @param {array} data Array containing data to transform into cells
     *
     * @return {array} The array of cells
     */
    function addSpecialCells(data) {
        var out, i, len;
        out = [];
        i = -1;
        len = data.length;
        for ( ; ++i < len ; ) {
            out.push({content: data[i]});
        }
        return out;
    }


    // # Cell

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
         * ### Cell.x
         *
         * The row number
         */
        this.x = 'undefined' !== typeof cell.x ? cell.x : null;

        /**
         * ### Cell.y
         *
         * The column number
         */
        this.y = 'undefined' !== typeof cell.y ? cell.y : null;

        /**
         * ### Cell.tdElement
         *
         * Reference to the TD/TH element, if built already
         */
        this.HTMLElement = cell.HTMLElement || null;

        /**
         * ### Cell.colspan
         *
         * The colspan property, only if truthy
         */
        if (cell.colspan) this.colspan = cell.colspan;
    }

})(
    ('undefined' !== typeof node) ? node.window || node : module.exports,
    ('undefined' !== typeof window) ? window : module.parent.exports.window,
    ('undefined' !== typeof node) ? node : module.parent.exports.node
);
