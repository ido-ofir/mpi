
function Test(test, done) {
    var assertions = [];
    function Assertion(type, msg, expr) {
        var assertion = {
            msg: msg,
            type: type,
            passed: expr,
            time: new Date().getTime(),
            origin: 'browser'
        };
        assertions.push(assertion);
    }
    test.invoke({
        ok: function (any, msg) {
            Assertion('ok', msg, !!any);
        },
        equal: function (a, b, msg) {
            Assertion('equal', msg, (a === b));
        },
        log: function () {
            Assertion('log', [].join.call(arguments, ' '))
        },
        done: function () {
            done(test.name, assertions);
        }
    });
}


var browserTests = [{
    name: 'browser one client',
    invoke: function (test) {
        test.ok(mpi, 'mpi loads ok');
        var browser = mpi.Mpi('browser');
        browser.Client(function (client) {
            try {
                test.equal(client.stuff, 3, 'stuff is 3');
                client.stuff = 'b1';
                client.$.on('remote:change', function (path, val) {
                    test.log(path, val);
                    test.equal(client.stuff, 'b2', 'client.stuff is b2');
                    client.$.kill();
                    test.done();
                });
            }
            catch (err) {
                console.log(err.stack);
            }

        });
    }
}];
