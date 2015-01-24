var http = require('http');
var express = require('express');
var Io = require('socket.io');
var app = express();
var mpi = require('../server.mpi.js');
var server = http.createServer(app);
var io = new Io(server);

mpi.define('stuff', {
    add: function (a, b) {
        return a + b;
    }
});

io.on('connection', function (socket) {
    mpi.attach(socket);
    console.log('connection');
});

app.use('/', express.static(process.cwd()));
server.listen(80);
