(function(){
    var ws;
    var isBrowser = (function () {
        try {
            if(window && document) return true;
        }
        catch (err) {
            return false;
        }
    }());

    if(isBrowser) ws = WebSocket;
    else ws = require('ws');

    function Mpi(name) {

        var logger;

        function log() {
            var args = [].slice.call(arguments);
            if (logger) {
                logger({
                    type: args.shift(),
                    logs: args,
                    origin: name
                });
            }
        }

        function parse(str) {
            try {
                return JSON.parse(str);
            }
            catch (err) {
                log('error', err);
            }
        }

        function json(obj) {  // as socket
            this.send(JSON.stringify(obj));
        }

        function inherit(prototype, constructor) {
            constructor.prototype = prototype;
            return new constructor();
        }

        var emitterPrototype = {
            emit: function emit(eventName) {
                var cont, event = this.events[eventName];
                if (!event) return;
                var args = [].slice.call(arguments, 1);
                for (var i = 0; i < event.listeners.length; i++) {
                    cont = event.listeners[i].apply(null, args);
                    if (cont === false) break;
                }
                return this;
            },
            on: function on(eventName, listener) {
                var event = this.events[eventName];
                if (!event) {
                    event = this.events[eventName] = {listeners: []};
                }
                event.listeners.push(listener);
                return this;
            },

            off: function off(eventName, listener) {
                if (!eventName) return (this.events = {});
                var event = this.events[eventName];
                var listeners = [];
                if (event) {
                    if (!listener) event.listeners = listeners;
                    else {
                        for (var i = 0; i < event.listeners.length; i++) {
                            if (event.listeners[i] !== listener) {
                                listeners.push(event.listeners[i]);
                            }
                        }
                        if (listeners.length === 0) delete this.events[eventName];
                        else event.listeners = listeners;
                    }
                }
                return this;
            }
        };

        function Emitter(object) {
            //object = object || {};
            var emitter = inherit(emitterPrototype, function () {
                this.events = {};
                if(object){
                    for(var m in object){
                        this[m] = object[m];
                    }
                }
            });
            return emitter;
            //object.emit = function emit(eventName) {
            //    var cont, event = events[eventName];
            //    if (!event) return;
            //    var args = [].slice.call(arguments, 1);
            //    for (var i = 0; i < event.listeners.length; i++) {
            //        cont = event.listeners[i].apply(null, args);
            //        if (cont === false) break;
            //    }
            //    return object;
            //};
            //object.on = function on(eventName, listener) {
            //    var event = events[eventName];
            //    if (!event) {
            //        event = events[eventName] = {listeners: []};
            //    }
            //    event.listeners.push(listener);
            //    return object;
            //};
            //
            //object.off = function off(eventName, listener) {
            //    if (!eventName) return (events = {});
            //    var event = events[eventName];
            //    var listeners = [];
            //    if (event) {
            //        if (!listener) event.listeners = listeners;
            //        else {
            //            for (var i = 0; i < event.listeners.length; i++) {
            //                if (event.listeners[i] !== listener) {
            //                    listeners.push(event.listeners[i]);
            //                }
            //            }
            //            if (listeners.length === 0) delete events[eventName];
            //            else event.listeners = listeners;
            //        }
            //    }
            //    return object;
            //};
            //return object;
        }

        var arrayMethods = [
            'push',
            'pop',
            'reverse',
            'shift',
            'splice',
            'unshift',
            'sort'
        ];

        arrayMethods.forEach(function (methodName, index) {
             arrayMethods[index] = {
                 name: methodName,
                 method: function () {
                     log('function', 'array method ', methodName);
                     var args = [].slice.call(arguments);
                     this['_' + methodName].apply(this, args);
                     this._scope.array[methodName].apply(this._scope.array, args);
                     this._scope.$.emit('arrayMethod', {
                         name: methodName,
                         args: args,
                         path: this._scope.path
                     });
                 }
             }
        });

        function watchArray($, source, key, path, parent) {
            log('function', 'watchArray', path);
            var watcher = [];
            watcher._scope = {
                $: $,
                source: source,
                key: key,
                array: source[key],
                path: path,
                parent: parent
            };
            var array = source[key];
            for (var i = 0; i < array.length; i++) {
                bind($, array, watcher, i, path + '.');
            }
            for (var k = 0; k < arrayMethods.length; k++) {
                watcher['_' + arrayMethods[k].name] = watcher[arrayMethods[k].name];
                watcher[arrayMethods[k].name] = arrayMethods[k].method;
            }
            //console.log(watcher.length);
            return {
                get: function () {
                    log('getter', key, 'array getter');
                    return watcher;
                },
                set: function (val) {
                    log('setter', key, 'array setter');
                    delete watcher;
                    delete parent[key];
                    log('log', 'deleted ' + key, parent[key]);
                    source[key] = val;
                    bind($, source, parent, key, path, true);
                    log('log', 'path', path);
                    $.emit('local:change', path, val);
                    $.emit('change', path, val);
                },
                enumerable: true,
                configurable: true
            };
        }

        function watchPrimitive($, source, key, path) {
            return {
                get: function () {
                    log('getter', key, 'primitive getter');
                    return source[key];
                },
                set: function (val) {
                    log('setter', key, 'primitive setter');
                    source[key] = val;
                    $.emit('local:change', path, val);
                    $.emit('change', path, val);
                    return val;
                },
                enumerable: true,
                configurable: true
            };
        }

        function watchObject($, source, key, path, parent) {
            var property = source[key];
            var watcher = {};
            for (var m in property) {
                bind($, property, watcher, m, path + '.');
            }
            return {
                get: function () {
                    log('getter', key, 'object getter');
                    return watcher;
                },
                set: function (val) {
                    log('setter', key, 'object setter');
                    watcher = {};
                    property = val;
                    delete parent[key];
                    log('log', 'deleted ' + key, parent[key]);
                    source[key] = property;
                    bind($, source, parent, key, path, true);
                    $.emit('local:change', path, property);
                    $.emit('change', path, property);
                },
                enumerable: true,
                configurable: true
            }
        }

        function bind($, source, watcher, key, path, self) {   // defines a getter setter on watcher based on source[key] and his type.
            if(!self) path = path + key;
            var sourceProperty = source[key];

            var watcherProperty;
            if(watcher[key]) {
                log('log', 'deleting ' + key);
                delete watcher[key];
            }
            if (typeof sourceProperty === 'object') {
                if (Array.isArray(sourceProperty)) {
                    log('function', 'binding ' + key + ' as Array');
                    watcherProperty = watchArray($, source, key, path, watcher);
                }
                else {
                    log('function', 'binding ' + key + ' as Object');
                    watcherProperty = watchObject($, source, key, path, watcher);
                }
            }
            else {
                log('function', 'binding ' + key + ' as primitive');
                watcherProperty = watchPrimitive($, source, key, path);
            }
            Object.defineProperty(watcher, key, watcherProperty);
        }

        var $prototype = {
            define: function (path, value, silent) {
                var watcherTarget = getTarget(path, this.watcher),
                    sourceTarget = getTarget(path, this.source),
                    parentPath = path.slice(0, path.lastIndexOf('.')+1);

                if (sourceTarget) {
                    sourceTarget.object[sourceTarget.property] = value;
                    bind(this, sourceTarget.object, watcherTarget.object, sourceTarget.property, parentPath);
                    if(!silent){
                        this.emit('local:define', path, value);
                        this.emit('change', path, value);
                    }
                }
            },
            delete: function (path, silent) {
                var deleted, watcherTarget = getTarget(path, this.watcher),
                    sourceTarget = getTarget(path, this.source);
                if(watcherTarget){
                    deleted = true;
                    log('function', 'watcherTarget for ', path);
                    delete watcherTarget.object[watcherTarget.property];
                }
                if(sourceTarget){
                    deleted = true;
                    log('function', 'sourceTarget for ', path);
                    delete sourceTarget.object[sourceTarget.property];
                }
                if(deleted && !silent){
                    this.emit('local:delete', path);
                    this.emit('change', path);
                }
            }
        };

        function Watcher(source) {
            if (typeof source !== 'object') return source;
            var $ = new Emitter($prototype);
            var watcher = {};
            for (var m in source) {
                //console.log('cycle', m);
                bind($, source, watcher, m, '');
            }
            $.source = source;
            $.watcher = watcher;
            $.find = function (path, onSource) {
                var result = getTarget(path.slice('.'), onSource ? source : watcher);
                result.value = result.object[result.property];
                return result;
            };
            $.bind = function (scope, key) {
                if(scope.$apply){
                    scope.$apply(function () {
                        scope[key] = watcher;
                        watcher.$.on('remote:change', scope.$apply);
                        scope.$on('$destroy', function () {
                            watcher.$.off('remote:change', scope.$apply);
                        });
                    });

                }
            };
            Object.defineProperty(watcher, '$', {
                value: $,
                enumerable: false,
                configurable: false
            });
            return watcher;
        }

        function getTarget(pathArray, target) {   //  find('my.stuff', {my: {stuff: 8}})  // returns {object: {stuff: 8}, property: 'stuff'}
            if (!target) return false;
            if(typeof pathArray === 'string') pathArray = pathArray.split('.');
            //log('function', 'getTarget ', pathArray);
            var propertyName = pathArray.shift();
            if (!propertyName in target) return false;
            if (!pathArray.length) {
                return {
                    object: target,
                    property: propertyName,
                    value: target[propertyName]
                }
            }
            return getTarget(pathArray, target[propertyName]);
        }


        function Server(port, src, _logger) {
            if (_logger) logger = _logger;
            if (!src) {
                src = port;
                port = 8080;
            }

            var watcher = Watcher(src);
            watcher.$.on('local:change', function (path, val) {
                log('event', 'local:change in server - ', path, '=', val);
                server.clients.forEach(function (socket, i) {
                    log('serverOutput', 'sending change to client ' + i, path, '=', val);
                    socket.json({method: 'change', args: [path, val]})
                });
            });
            watcher.$.on('local:define', function (path, val) {
                log('event', 'local:define in server - ', path, '=', val);
                server.clients.forEach(function (socket, i) {
                    log('serverOutput', 'sending define to client ' + i, path, '=', val);
                    socket.json({method: 'define', args: [path, val]})
                });
            });
            watcher.$.on('local:delete', function (path) {
                log('event', 'local:delete in server - ', path);
                server.clients.forEach(function (socket, i) {
                    log('serverOutput', 'sending delete to client ' + i, path);
                    socket.json({method: 'delete', args: [path]})
                });
            });
            watcher.$.on('remote:change', function (path, val) {
                log('event', 'remote:change in server - ', path, val);
            });
            watcher.$.on('arrayMethod', function (method) {
                log('event', 'arrayMethod in server - ', method.name);
                server.clients.forEach(function (socket, i) {
                    log('serverOutput', 'sending arrayMethod to client ' + i);
                    socket.json({method: 'arrayMethod', args: [method]})
                });
            });
            var server = new ws.Server({port: port});
            var methods = {
                change: function (path, value) {
                    log('method', 'change in server', path, value);

                    var watcherTarget = getTarget(path.split('.'), watcher),
                        sourceTarget = getTarget(path.split('.'), src),
                        parentPath = path.slice(0, path.lastIndexOf('.')+1);

                    if (sourceTarget) {
                        sourceTarget.object[sourceTarget.property] = value;
                        bind(watcher.$, sourceTarget.object, watcherTarget.object, sourceTarget.property, parentPath);
                        watcher.$.emit('remote:change', path, value);
                        watcher.$.emit('change', path, value);
                        for (var k = 0; k < server.clients.length; k++) {
                            if (server.clients[k] !== this) {  // all clients except the initiator of the event
                                log('serverOutput', 'sending change to client ' + k, path, '=', value);
                                server.clients[k].json({method: 'change', args: [path, value]})
                            }
                        }
                    }
                },
                define: function (path, value) {
                    watcher.$.define(path, value, true);
                    for (var k = 0; k < server.clients.length; k++) {
                        if (server.clients[k] !== this) {  // all clients except the initiator of the event
                            log('serverOutput', 'sending define to client ' + k, path, '=', value);
                            server.clients[k].json({method: 'define', args: [path, value]})
                        }
                    }
                },
                delete: function (path) {
                    watcher.$.delete(path, true);
                    for (var k = 0; k < server.clients.length; k++) {
                        if (server.clients[k] !== this) {  // all clients except the initiator of the event
                            log('serverOutput', 'sending define to client ' + k, path);
                            server.clients[k].json({method: 'delete', args: [path]})
                        }
                    }
                },
                arrayMethod: function (method) {
                    log('method', 'arrayMethod in server', method.name, value);
                    var watcherTarget = getTarget(method.path.split('.'), watcher),
                        sourceTarget = getTarget(method.path.split('.'), src),
                        watcherArray = watcherTarget.value,
                        sourceArray = sourceTarget.value,
                        value;

                    if (sourceTarget) {
                        sourceArray[method.name].apply(watcherArray, method.args);
                        value = sourceArray[method.name].apply(sourceArray, method.args);

                        for (var k = 0; k < server.clients.length; k++) {
                            if (server.clients[k] !== this) {  // all clients except the initiator of the event
                                log('serverOutput', 'sending arrayMethod ' + method.name + ' to client ' + k, value);
                                server.clients[k].json({method: 'arrayMethod', args: [method]})
                            }
                        }
                        watcher.$.emit('remote:change', method.path, value);
                        watcher.$.emit('change', method.path, value);
                    }
                    else{
                        log(error, 'no source target');
                    }
                }
            };


            function onMessage(msg) {
                msg = parse(msg);
                var method = msg.method;
                var args = msg.args || [];
                if (method) {
                    if (methods[method]) methods[method].apply(this, args);
                }
            }

            server.on('connection', function (socket) {
                socket.on('message', onMessage);
                socket.json = json;
                socket.json({method: 'connect', args: [src]});
            });
            watcher.$.kill = function () {
                server._closeServer();
            };
            return watcher;
        }

        function Client(ip, callback, _logger) {
            if (_logger) logger = _logger;
            if (!callback) {
                callback = ip;
                ip = 'ws://localhost:8080';
            }
            else if(ip[2] !== ':'){
                ip = 'ws://' + ip;
            }
            var client = new ws(ip);
            var connected = false;
            client.json = json;
            var interval, source, watcher;
            var methods = {
                connect: function (obj) {
                    source = obj;

                    watcher = Watcher(obj);
                    watcher.$.on('local:change', function (path, value) {
                        log('event', 'local:change - ', path, '=', value);
                        client.json({method: 'change', args: [path, value]})
                    });
                    watcher.$.on('local:define', function (path, value) {
                        log('event', 'local:define - ', path, '=', value);
                        client.json({method: 'define', args: [path, value]})
                    });
                    watcher.$.on('local:delete', function (path) {
                        log('event', 'local:delete - ', path);
                        client.json({method: 'delete', args: [path]})
                    });
                    watcher.$.on('arrayMethod', function (method) {
                        log('event', 'arrayMethod - ', method.name);
                        client.json({method: 'arrayMethod', args: [method]})
                    });
                    watcher.$.kill = function () {
                        client.close();
                    };
                    callback && callback(watcher);
                },
                change: function (path, value) {
                    if (!source) return;

                    var watcherTarget = getTarget(path.split('.'), watcher),
                        sourceTarget = getTarget(path.split('.'), source);

                    if (sourceTarget) {
                        sourceTarget.object[sourceTarget.property] = value;
                        bind(watcher.$, sourceTarget.object, watcherTarget.object, sourceTarget.property, path.slice(0, path.lastIndexOf('.')+1));
                        log('event', 'remote:change in client', path, value);
                        watcher.$.emit('remote:change', path, value);
                        watcher.$.emit('change', path, value);
                    }
                },
                define: function (path, value) {
                    watcher.$.define(path, value, true);
                    watcher.$.emit('remote:change', path, value);
                },
                delete: function (path) {
                    watcher.$.delete(path, true);
                    watcher.$.emit('remote:change', path, undefined);
                },
                arrayMethod: function (method) {
                    var watcherTarget = getTarget(method.path.split('.'), watcher),
                        sourceTarget = getTarget(method.path.split('.'), source),
                        watcherArray = watcherTarget.value,
                        sourceArray = sourceTarget.value,
                        value;

                    if (sourceTarget) {
                        sourceArray[method.name].apply(watcherArray, method.args);
                        value = sourceArray[method.name].apply(sourceArray, method.args);
                        log('event', 'remote:change', method.path, value);
                        watcher.$.emit('remote:change', method.path, value);
                        watcher.$.emit('change', method.path, value);
                    }
                }
            };


            function onMessage(e) {
                var msg = isBrowser ? parse(e.data) : parse(e);
                var method = msg.method;
                var args = msg.args || [];
                if (method) {
                    if (methods[method]) methods[method].apply(this, args);
                }
            }

            function onOpen() {
                connected = true;
            }

            function onError(err) {
                console.log('ws error');
                log('error', err);
            }

            function onClose() {
                if (connected) {
                    connected = false;
                    if (isBrowser) {
                        client.onopen = client.onerror = client.onclose = client.onmessage = null;
                    }
                    //interval = setInterval(function () {
                    //    if(connected) {
                    //        console.log('clear');
                    //        clearInterval(interval);
                    //        return;
                    //    }
                    //    console.log('cycle');
                    //    client = new ws(ip);
                    //    client.json = json;
                    //    if(isBrowser){
                    //        client.onopen = onOpen;
                    //        client.onerror = onError;
                    //        client.onclose = onClose;
                    //        client.onmessage = onMessage;
                    //    }
                    //    else{
                    //        client.on('open', onOpen);
                    //        client.on('error', onError);
                    //        client.on('close', onClose);
                    //        client.on('message', onMessage);
                    //    }
                    //}, 1000);
                }


            }

            if (isBrowser) {
                client.onopen = onOpen;
                client.onerror = onError;
                client.onclose = onClose;
                client.onmessage = onMessage;
            }
            else {
                client.on('open', onOpen);
                client.on('error', onError);
                client.on('close', onClose);
                client.on('message', onMessage);
            }
        }

        return {
            Server: Server,
            Client: Client,
            Watcher: Watcher,
            Mpi: Mpi
        };
    }
    var mpi = Mpi();
    if(isBrowser){
        window.mpi = mpi;
    }
    else{
        module.exports = mpi;
    }

}());








