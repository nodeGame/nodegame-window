# nodegame-window: GameWindow

GameWindow provides a handy API to interface nodeGame with the browser window.

---

Creates a custom root element inside the HTML page, and insert an iframe element inside it.

Dynamic content can be loaded inside the iframe without losing the javascript state inside the page.

Loads and unloads special javascript/HTML snippets, called widgets, in the page.

Defines a number of pre-defined profiles associated with special configuration of widgets.

Depends on nodeGame-client and JSUS. GameWindow.Table and GameWindow.List depend also on NDDB.
Widgets can have custom dependencies, which are checked internally by the GameWindow engine.

## Usage

TODO

## License

Copyright (C) 2012 Stefano Balietti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
