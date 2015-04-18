function Emitter(object) {
    object = object || {};
    var events = {};
    object.emit = function emit(eventName, data) {
        var cont, event = events[eventName];
        if(event){
            var args = [].slice.call(arguments, 1);
            for(var i = 0; i < event.listeners.length; i++){
                cont = event.listeners[i].apply(null, args);
                if(cont === false) break;
            }
        }
    };
    object.on = function on(eventName, listener) {
        var event = events[eventName];
        if(!event){
            event = events[eventName] = {listeners: []};
        }
        event.listeners.push(listener);
    };

    object.off = function off(eventName, listener) {
        if(!eventName) return (events = {});
        var event = events[eventName];
        var listeners = [];
        if(event){
            if(!listener) event.listeners = listeners;
            else{
                for(var i = 0; i < event.listeners.length; i++){
                    if(event.listeners[i] !== listener){
                        listeners.push(event.listeners[i]);
                    }
                }
                if(listeners.length === 0) delete events[eventName];
                else event.listeners = listeners;
            }
        }
    };
    return object;
}

function bind(root, src, data, propertyName, path) {
    path = path + propertyName;
    var property = src[propertyName];
    var propertyMirror;
    if(typeof property === 'object'){
        if(Array.isArray(property)){
            propertyMirror = [];
            for(var i = 0; i < property.length; i++){
                propertyMirror.push(bind(root, property, propertyMirror, i, path + '.'));
            }
        }
        else{
            propertyMirror = {};
            for(var m in property){
                bind(root, property, propertyMirror, m, path + '.');
            }
        }
        data[propertyName] = propertyMirror;
    }
    else{
        data.__defineGetter__(propertyName, function () {
            return src[propertyName];
        });
        data.__defineSetter__(propertyName, function (val) {
            var val = (src[propertyName] = val);
            root.emit('local:change', path, val)
            return val;
        });
    }
}

function Watch(obj) {
    var mirror = new Emitter();
    mirror.data = {};
    for(var m in obj){
        bind(mirror, obj, mirror.data, m, '');
    }
    return mirror;
}
exports.Watch = Watch;

