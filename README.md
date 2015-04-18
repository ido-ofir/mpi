# mpi

mpi is a data syncing tool which helps node servers share dynamic data with clients.

install with npm

    npm install mpi

create a server with some data:
     
    var mpi = require('mpi');
    
    var server = mpi.Server(8080, { stuff: 5 });

create a client:
    
    var mpi = require('mpi');
    
    mpi.Client('localhost:8080', function(client){
        
        console.log(client.stuff);    // 5
        
    });
    
client and server are now identical objects and a change in one of them would reflect in the other.
