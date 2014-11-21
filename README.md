# nodegame-window: GameWindow

GameWindow provides a handy API to interface nodeGame with the browser window.

Creates a custom root element inside the HTML page, and insert an iframe element inside it.

Dynamic content can be loaded inside the iframe without losing the javascript state inside the page.

Loads and unloads special javascript/HTML snippets, called widgets, in the page.

Defines a number of predefined profiles associated with special configuration of widgets.

Depends on nodeGame-client and JSUS. GameWindow.Table and GameWindow.List depend also on NDDB.
Widgets can have custom dependencies, which are checked internally by the GameWindow engine.

## Usage

TODO

##

## Build

You can create a custom nodegame-window build using the make.js file in the bin directory.

```javascript
node make.js build -a // Full build, about 20Kb minified
node make.js build -B // Bare (minimal) build, about 8Kb minified
```

## Make help

  Usage: make.js [options] [command]

    Commands:

      clean
      Removes all files from build folder

      build [options] [options]
      Creates a nodegame-window custom build

    Options:

      -h, --help     output usage information
      -V, --version  output the version number


    Usage: build [options] [options]

    Options:

      -h, --help           output usage information
      -B, --bare           bare naked nodegame-window (only core)
      -a, --all            full build of nodegame-window (default)
      -C, --clean          clean build directory
      -A, --analyse        analyse build
      -o, --output <file>  output file (without .js)


## License

Copyright (C) 2014 Stefano Balietti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

