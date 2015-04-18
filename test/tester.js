
var tests = require('./tests.js');
var report;
var id = 1;
function Test(test, done) {
    var assertions = [];
    function Assertion(type, msg, expr) {
        var assertion = {
            msg: msg,
            type: type,
            passed: expr,
            time: new Date().getTime(),
            id: id
        };
        id++;
        assertions.push(assertion);
        report(test.name, assertion);
    }
    test.assertions = assertions;
    test.invoke({
        ok: function (any, msg) {
            Assertion('ok', msg, !!any);
        },
        equal: function (a, b, msg) {
            Assertion('equal', (msg + '  --->   ' + a + ' = ' + b + ' '), (a === b));
        },
        log: function () {
            Assertion('log', [].join.call(arguments, ' '));
        },
        action: function () {
            Assertion('action', [].join.call(arguments, ' '));
        },
        done: done
    });
}
var tester = {
    run: function (_report, callback) {
        report = _report;
        var t = tests.tests;
        var index = 0;
        var currentTest = { name: 'startup'};
        function logger(log) {
            report(currentTest.name, { type: log.type, msg: log.logs, origin: log.origin, time: new Date().getTime(), id: id});
            id++;
        }
        function run() {
            if(index > t.length-1) {
                return callback()
            }
            currentTest = t[index];
            Test(t[index], function(){
                index++;
                run();
            });
        }
        tests.start(logger, run);

    },
    kill: function () {
        tests.kill();
    }
};

module.exports = tester;