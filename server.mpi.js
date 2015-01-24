
var MAX_DEPTH = 7;

//var SocketServer = require('ws').Server;
var SocketServer = require('socket.io');

var mpi = {};
var depth = 0;
var clients = [];
var engine = 'io';
var method, data;

/*
*  	find the functions on a target object.
*  	queryArray is an array of strings:
*
*  	find(['bob', 'sponge'], foo);    // will return foo.bob.sponge if it's a function, else undefined
*
* */

function find(queryArray, target){
	var name = queryArray.shift();
	var child = target[name];
	if(child){
		if(queryArray.length > 0){
			return find(queryArray, child);
		}
		if(child instanceof Function){
			return child;
		}
	}
}

/*
*  	replace all functions on target with a special mark
*
*  		map({doStuff: function(){ ... }})   // will return {doStuff: 'mpi.function'}
*
* */

function map(target){
	if(depth > MAX_DEPTH) return 'mpi depth limit';
	depth++;
	var result = {};
	for(var m in target){
		if(target[m] instanceof Function){
			result[m] = 'mpi.function';
		}
		else{
			result[m] = map(target[m]);
		}
	}
	depth--;
	return result;
}

function isIo() {
	return engine === 'io';
}

function connect(server, onConnection) {
	if(isIo()){
		server.on('connection', onConnection);
	}
}

function send(socket, type, value) {
	if(isIo()){
		socket.emit(type, value);
	}
}

function error(socket, err){  // this == message
	if(!err) return true;
	err = err.stack || err;
	send(socket, 'mpi.err', err);
	console.error(err);
}

function respond(socket, id, response) {
	try {
		data = JSON.stringify(response);
		if(isIo()){
			send(socket, 'mpi.res', {
				id: id,
				data: data
			});
		}
	}
	catch (err) { error(socket, err); }
}

function run(socket, msg) {
	try {
		msg = JSON.parse(msg);
		if(msg.method){
			method = find(msg.method.split('.'), mpi);
			if(method){
				response =  method.apply(null, msg.args);
				//if(response.then){}
				respond(socket, msg.id, response);
			}
		}
	}
	catch (err) { error(socket, err); }
}

function listen(socket, type, listener) {
	if(isIo()){
		socket.on(type, listener)
	}
}
exports.attach = function(socket){
	listen(socket, 'mpi.run', function (msg) {
		run(socket, msg);
	});
	depth = 0;
	send(socket, 'mpi.ok', map(mpi));
	console.log('mpi ok ');
};
exports.define = function(name, object){
	mpi[name] = object;
};
