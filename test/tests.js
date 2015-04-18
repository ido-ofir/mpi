
var mpi = require('../');
var server, clientA, clientB;

var onChange = {
    server: null,
    clientA: null,
    clientB: null
};
function equal(any1, any2) {   // tests if two elements are identical
    var type = typeof any1;
    if(type !== typeof any2) return false;
    switch (type){
        case 'object':
            if(Array.isArray(any1)){
                if(!Array.isArray(any2)) return false;
                if(any1.length !== any2.length) return false;
                for (var k = 0; k < any1.length; k++) {
                    if(!equal(any1[k], any2[k])) return false;
                }
            }
            else{
                for(var m in any1){
                    if(!m in any2) return false;
                    if(!equal(any1[m], any2[m])) return false;
                }
            }
            break;
        default :
            return any1 === any2;

    }
    return true;
}
module.exports = {
    start: function (logger, callback) {
        logger({
            type: 'action',
            logs: ['starting server']
        });
        server = mpi.Mpi('server').Server({
            stuff: 1,
            nested: {
                things: 1
            },
            array: [1,2,3]
        }, false, logger);
        server.$.on('remote:change', function (path, val) {
            if(onChange.server){
                onChange.server(path, val);
                onChange.server = null;
            }
        });
        logger({
            type: 'action',
            logs: ['starting clientA']
        });
        mpi.Mpi('clientA').Client(function (client) {
            clientA = client;
            logger({
                type: 'action',
                logs: ['starting clientB']
            });
            clientA.$.on('remote:change', function (path, val) {
                if(onChange.clientA){
                    onChange.clientA(path, val);
                    onChange.clientA = null;
                }
            });
            mpi.Mpi('clientB').Client(function (client) {
                clientB = client;
                clientB.$.on('remote:change', function (path, val) {
                    var f = onChange.clientB;
                    if(f){
                        onChange.clientB = null;
                        f(path, val);
                    }
                });
                callback();
            }, false, logger);
        }, false, logger);
    },
    kill: function () {
        if(server){
            server.$.kill();
            clientA.$.kill();
            clientB.$.kill();
        }
    },
    tests: [
        {
            name: 'server changes data on clients',
            invoke: function (test) {

                test.equal(server.stuff, 1, 'server stuff should be 1');
                test.equal(clientA.stuff, 1, 'clientA stuff should be 1');
                test.equal(clientB.stuff, 1, 'clientB stuff should be 1');

                test.action('changing server.stuff from 1 to 2');
                onChange.clientB = function () {
                    test.equal(clientA.stuff, 2, 'clientA stuff should update to 2');
                    test.equal(clientB.stuff, 2, 'clientB stuff should update to 2');
                    test.done();
                };

                server.stuff = 2;
                test.equal(server.stuff, 2, 'server stuff has changed to 2');
            }
        },{
            name:'clients change data on other clients',
            invoke: function (test) {
                test.equal(server.stuff, 2, 'server stuff should be 2');
                test.equal(clientA.stuff, 2, 'clientA stuff should be 2');
                test.equal(clientB.stuff, 2, 'clientB stuff should be 2');

                test.action('changing clientA.stuff from 2 to 3');

                onChange.clientB = function () {
                    test.equal(clientB.stuff, 3, 'clientB stuff should update to 3');
                    test.done();
                };
                clientA.stuff = 3;
                test.equal(clientA.stuff, 3, 'clientA stuff should update to 3');
            }
        },{
            name: 'nested values are synced',
            invoke: function (test) {

                test.action('reading server.nested');
                test.equal(server.nested.things, 1, 'server nested.things should be 1');
                test.equal(clientA.nested.things, 1, 'clientA nested.things should be 1');
                test.equal(clientB.nested.things, 1, 'clientB nested.things should be 1');

                test.action('changing server.nested.things from 1 to 2');
                clientA.nested.things = 2;
                test.equal(clientA.nested.things, 2, 'clientA.nested.things has changed to 2');
                onChange.clientB = function () {
                    test.equal(server.nested.things, 2, 'server.nested.things should update to 2');
                    test.equal(clientB.nested.things, 2, 'clientB.nested.things should update to 2');
                    test.done();
                };
            }
        },{
            name: 'objects can be overridden',
            invoke: function (test) {

                test.action('reading server.nested');
                test.equal(server.nested.things, 2, 'server nested.things should be 2');
                test.log('server nested.things = ', server.nested.things);

                test.action('changing clientA.nested to {other: 4}');
                clientA.nested = {other: 4};
                test.equal(clientA.nested.other, 4, 'clientA nested has changed to {other: 4}');
                onChange.clientB = function () {
                    test.equal(server.nested.other, 4, 'server.nested should update to {other: 4}');
                    test.equal(clientB.nested.other, 4, 'clientB.nested should update to {other: 4}');
                    test.action('testing if new object still responds to changes');
                    test.log('changing clientB.nested.other to 5');
                    clientB.nested.other = 5;

                    onChange.server = function () {
                        test.equal(server.nested.other, 5, 'server.nested.other should update to 5');
                        test.done();
                    };
                };
            }
        },{
            name: 'properties can be defined and deleted',
            invoke: function (test) {

                test.action('defining a new field called "created"');
                onChange.clientB = function () {
                    test.equal(server.created, 7, 'server.created should be 7');
                    test.equal(clientB.created, 7, 'clientB.created should be 7');
                    test.action('deleting the field "created" from clientA');
                    onChange.clientB = function () {
                        test.equal(server.created, undefined, 'server.created was deleted');
                        test.equal(clientB.created, undefined, 'clientB.created was deleted');
                        test.done();
                    };
                    clientA.$.delete('created');
                };
                clientA.$.define('created', 7);
                test.equal(clientA.created, 7, 'clientA.created is now 7');

            }
        },{
            name: 'array methods can be used from server to client',
            invoke: function (test) {

                test.action('pushing an element to an array');
                onChange.clientB = function () {
                    test.equal(clientB.$.source.array[3], 42, 'an element was pushed');
                    onChange.clientB = function () {
                        test.equal(clientB.$.source.array[3], undefined, 'an element was popped');
                        onChange.clientB = function () {
                            test.equal(clientB.$.source.array[0], 43, 'an element was unshifted');
                            onChange.clientB = function () {
                                test.equal(clientB.$.source.array[0], 1, 'an element was shifted');
                                onChange.clientB = function () {
                                    test.equal(clientB.$.source.array[1], 5, 'array was spliced');
                                    test.ok(equal(clientB.$.source.array, server.$.source.array), 'server array and client array are identical');
                                    onChange.clientB = function () {
                                        test.ok(equal(clientB.$.source.array, server.$.source.array), 'server array and client array are identical');
                                        test.ok(equal(clientB.$.source.array, [1,2,3]), 'server array and client return to original state');

                                        test.done();
                                    };
                                    server.array = [1,2,3];
                                };
                                server.array.splice(1,2,5);
                            };
                            server.array.shift();
                        };
                        server.array.unshift(43);
                    };
                    test.action('popping an element from an array');
                    server.array.pop();
                    test.equal(server.$.source.array[3], undefined, 'an element was popped');
                };
                server.array.push(42);
                test.equal(server.$.source.array[3], 42, 'an element was pushed');
            }
        },{
            name: 'array methods can be used from client to other client',
            invoke: function (test) {

                test.action('pushing an element to an array');
                onChange.clientB = function () {
                    test.equal(clientB.$.source.array[3], 42, 'an element was pushed');
                    onChange.clientB = function () {
                        test.equal(clientB.$.source.array[3], undefined, 'an element was popped from clientB');
                        onChange.clientB = function () {
                            test.equal(clientB.$.source.array[0], 43, 'an element was unshifted');
                            onChange.clientB = function () {
                                test.equal(clientB.$.source.array[0], 1, 'an element was shifted');
                                onChange.clientB = function () {
                                    test.equal(clientB.$.source.array[1], 5, 'array was spliced');
                                    test.ok(equal(clientA.$.source.array, clientB.$.source.array), 'clientA array and clientB array are identical');
                                    test.ok(equal(clientA.$.source.array, server.$.source.array), 'clientA array and server array are identical');
                                    onChange.clientB = function () {
                                        test.ok(equal(clientA.$.source.array, clientB.$.source.array), 'server array and client array are identical');
                                        test.ok(equal(clientB.$.source.array, [1,2,3]), 'server array and client return to original state');

                                        test.done();
                                    };
                                    clientA.array = [1,2,3];
                                };
                                test.action('splicing the array');
                                clientA.array.splice(1,2,5);
                            };
                            test.action('shifting an element from an array');
                            clientA.array.shift();
                        };
                        test.action('unshifting an element from an array');
                        clientA.array.unshift(43);
                    };
                    test.action('popping an element from an array');
                    clientA.array.pop();
                    test.equal(clientA.$.source.array[3], undefined, 'an element was popped from clientA');
                };
                clientA.array.push(42);
                test.equal( clientA.$.source.array[3], 42, 'an element was pushed');
            }
        },{
            name: 'objects sync inside arrays',
            invoke: function (test) {
                var array = [{ stuff: 1}, { things: 2}];
                test.action('overwriting array on server to an array of objects');
                onChange.clientB = function () {
                    test.ok(equal(clientB.$.source.array, array), 'client and server arrays are identical');
                    test.done();
                };
                server.array = array;
            }
        },{
            name: 'browser one client',
            invoke: function (test) {

                server.$.on('remote:change', function (path, val) {
                    test.equal(val, 'b1', path + ' in server should be "b1"');
                    test.action('changing server.stuff from b1 to b2');
                    server.stuff = 'b2';
                    server.$.off();
                });
                test.done();
            }
        }
    ]
};
