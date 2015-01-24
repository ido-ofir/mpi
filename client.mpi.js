var Mpi = function(){
    var MAX_DEPTH = 7;
    var socket;
    var mpi = {};
    var engine = 'io';
    var requests = [];
    var id = 0;
    var depth = 0;
    var connected = false;

    function Args(args) {
        return [].slice.call(args);
    }
    function isIo() {
        return engine === 'io';
    }

    function isParsed(msg) {
        return typeof msg !== 'string';
    }
    function method(path){
        return function(){
            var request,
                args,
                success;
            if(!connected) return connect();
            id++;
            args = Args(arguments);
            request = {id: id};
            requests.push(request);
            socket.json({method: path, args: args, id: id});
            return {
                then: function (callback) {
                    request.success = callback;
                }
            }
        };
    }

    function send(socket, type) {
        return {
            withArgs: function () {
                var args = [].slice.call(arguments);

            }
        }
    }
    function listen(socket, type, listener) {
        if(isIo()){
            socket.on(type, listener);
        }
    }

    function call(socket, method) {
        if(isIo()){
            socket.emit('mpi.run', method);
        }
    }
    function map(source, path){
        if(depth > MAX_DEPTH) return 'mpi depth limit';
        depth++;
        if(!path) path = '';
        if(!source) return source;
        var result = {};
        for(var m in source){
            if(source[m] === 'mpi.function'){
                result[m] = method(path + m);
            }
            else{
                result[m] = map(source[m], path + m + '.');
            }
        }
        depth--;
        return result;
    }

    function onConnect() {
        requests = [];
        connected = true;
        console.log('socket opened');
    }

    function onDisconnect() {
        connected = false;
        console.log('socket closed');
    }

    function connect(address, callback) {
        console.log(address);
        if(isIo()){
            socket = io(address, {multiplex: true});
            socket.on('connect',onConnect);
            socket.on('disconnect', onDisconnect);
        }


        socket.json = function(object){
            if(connected){
                //var json = angular ? angular.toJson(object) : JSON.stringify(object);
                var json = JSON.stringify(object);
                call(socket, json)
            }
            else{
                connect();
            }
        };
        listen(socket, 'mpi.err', function(err){
            console.error('*** MPI ERROR: ');
            console.error(err);
        });
        listen(socket, 'mpi.ok', function(msg){
            try{
                if(!isParsed(msg)){
                    msg = JSON.parse(msg);
                }

                listen(socket, 'mpi.res', function(res){
                    for(var i = 0; i < requests.length; i++){
                        if(requests[i].id === res.id){
                            if(requests[i].success){
                                requests[i].success(res.data);
                            }
                            else{
                                console.log('response:');
                                console.dir(res.data);
                            }
                            requests.splice(i, 1);
                            break;
                        }
                    }
                });
                depth = 0;
                mpi = map(msg);
                if(callback) callback(mpi);
                console.log('mpi ok');
            }
            catch (err) {
                console.error(err);
            }
        });
    }

    return {
        connect: connect
    };
};
