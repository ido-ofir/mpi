# mpi

# documentation is in progress..

mpi stands for Module Programming Interface and is used by node servers to expose an API through sockets.

server:
     
    var mpi = require('mpi');
    var io = require('socket.io');
    
    // define external API.
    
    mpi.exports = {
        myMethods: function(){
            return 'are in the server';        
        }
    };
    
    io.on('connection', function(socket){
    
        // when outhenticated, expose to client.
    
        mpi.ok(socket);
    });

client:
    
    var socket = io('localhost', {multiplex: true});
    var module = mpi.connect('localhost', function () {
        console.log(module);
    });
