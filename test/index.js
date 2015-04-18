var mpi = require('../');
var open = require('open');
var ws = require('ws');
var tester = require('./tester.js');
var repl;
var testerServer;
function report(test, msg) {
    testerServer.clients.forEach(function (socket) {
        socket.json({method: 'report', args:[test, msg]});
    })
}


var live = process.argv.indexOf('live') > -1;
if(live){
    repl = require('repl').start({
        prompt: 'test>',
        stdin: process.stdin,
        stdout: process.stdout
    }).context;
    repl.mpi = mpi;
    repl.server = mpi.Server({stuff: 'ok'});
}
else{
    testerServer = new ws.Server({port: 1234});
    testerServer.on('connection', function (socket) {
        var methods = {
            run: function () {
                tester.kill();
                tester.run(report, function () {
                    socket.json({method: 'run'});
                });
            }
        };
        socket.on('message', function (msg) {
            msg = JSON.parse(msg);
            if(msg.method && methods[msg.method])methods[msg.method](msg.args);
        });
        socket.json = function (msg) {
            socket.send(JSON.stringify(msg));
        };
    });
    open(__dirname + '/browser/test.html');
}

//exit: function (test) {
//    server.$.kill();
//    test.done();
//    setTimeout(function () {
//        process.exit();
//    }, 100);
//}


