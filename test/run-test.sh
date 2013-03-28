#!/bin/bash
#
# Do the testing procedure for nodegame-window.
# Run this in the same directory as this file (nodegame-window/test).

echo "Linking test game to nodegame-server"
ln -sft ../node_modules/nodegame-server/games/ ../../testergame/ || exit 1

echo "Copying code to nodegame-client"
cp ../lib/* ../node_modules/nodegame-client/node_modules/nodegame-window/lib/ || exit 2

echo "Running multibuild in nodegame-client"
(cd ../node_modules/nodegame-client/ && node bin/make.js multibuild) || exit 3

echo "Starting server"
{
    node server.js &
    server_pid=$!
} || exit 4

# Wait for the server to initialize:
sleep 3

echo "Running mocha-phantomjs test"
mocha-phantomjs ../node_modules/testergame/index.html || {
    kill $server_pid
    exit 5
}

echo "Stopping server"
kill $server_pid || exit 6
