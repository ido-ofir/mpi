var mpi = (function(){

    var MAX_DEPTH = 7;
    var engine = 'io';

    function Args(args) {
        return [].slice.call(args);
    }

    function isParsed(msg) {
        return typeof msg !== 'string';
    }

    function isIo() {
        return engine === 'io';
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

    var Mpi = function(){

        var socket;
        var mpi = {};
        var requests = [];
        var id = 0;
        var depth = 0;
        var connected = false;

        function method(path){
            return function(){
                var request,
                    args;
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

        function map(source, path, target){
            if(depth > MAX_DEPTH) return 'mpi depth limit';
            depth++;
            if(!path) path = '';
            if(!source) return source;
            if(!target) target = source;
            for(var m in source){
                if(source[m] === 'mpi.function'){
                    target[m] = method(path + m);
                }
                else{
                    target[m] = map(source[m], path + m + '.');
                }
            }
            depth--;
            return target;
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

        function connect(socket, callback) {

            if(isIo()){
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
                    map(msg, false, mpi);
                    if(callback) callback(mpi);
                    console.log('mpi ok');

                }
                catch (err) {
                    console.error(err);
                }
            });
            return mpi;
        }

        return {
            connect: connect
        };
    }
    return Mpi();
}());
