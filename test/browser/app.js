var app = angular.module('test', []);
app.controller('appCtrl', function ($scope, $timeout) {
    var index = 0;
    var currentTest;
    var startTime;
    var id;
    $scope.target = false;
    $scope.tests = [];
    $scope.types = [];
    $scope.test = {
        a: 5,
        b: {c: {
            stuff: {a: 4}
        }},
        array: [{g: 0},{z: 5},3]
    };
    var colors = ['#fdd', '#dfd', '#ddf', '#ffd', '#fdf', '#dff', '#dfe', '#fed', '#edf'];
    var methods = {
        report: function (test, msg) {
            msg.time = msg.time - startTime;
            id = msg.id;
            for (var i = 0; i < $scope.tests.length; i++) {
                if($scope.tests[i].name === test){
                    $scope.$apply(function () {
                        $scope.tests[i].assertions.push(msg);
                        if(msg.passed === false) $scope.tests[i].passed = false;
                        if(msg.type && $scope.types.indexOf(msg.type) === -1){
                            $scope.types.push(msg.type);
                        }
                    });
                    return;
                }
            }
            $scope.$apply(function () {
                $scope.tests.push({
                    name: test,
                    assertions: [msg],
                    passed: true
                })
            });
        },
        run: function () {
            index = 0;
            run();
        }
    };
    $scope.getColor = function (type) {
        var index = $scope.types.indexOf(type);
        var color = colors[index];
        return color || '';
    };
    $scope.isPlain = function (item) {
        return (typeof item !== 'object');
    };
    $scope.isArray = angular.isArray;
    $scope.isObject = function (item) {
        return (typeof item === 'object' && !angular.isArray(item));
    };
    var server = new WebSocket('ws://localhost:1234');
    server.json = function (msg) {
        server.send(JSON.stringify(msg));
    };
    server.onmessage = function (msg) {
        msg = JSON.parse(msg.data);
        if(msg.method && methods[msg.method]) methods[msg.method].apply(null, msg.args);
    };
    server.onclose = function () {
        window.close();
    };
    function live() {
        mpi.Client(function (client) {
            $timeout(function () {
                $scope.targetA = window.clientA = client;
            });
            client.$.on('change', function (path, val) {
                console.log('change!:', path, val);
            })
        });
        mpi.Client(function (client) {
            $timeout(function () {
                $scope.targetB = window.clientB = client;
            });
            client.$.on('change', function (path, val) {
                console.log('change!:', path, val);
            })
        });
    }
    function run() {
        if(index > browserTests.length-1) return $timeout(live);
        currentTest = browserTests[index];
        $timeout(function () {
            Test(browserTests[index], function(name, assertions){
                var exists, passed = true;
                assertions.forEach(function (assertion) {
                    if(assertion.passed === false) passed = false;
                    if(assertion.time > 100000) {
                        assertion.time = assertion.time - startTime;
                    }
                    if(assertion.type){
                        if($scope.types.indexOf(assertion.type) === -1){
                            $scope.types.push(assertion.type);
                        }
                    }
                    id++;
                    assertion.id = id;
                });
                for (var i = 0; i < $scope.tests.length; i++) {
                    if($scope.tests[i].name === name){
                        $scope.$apply(function () {
                            $scope.tests[i].passed = !!(passed && $scope.tests[i].passed);
                            $scope.tests[i].assertions = $scope.tests[i].assertions.concat(assertions);
                        });
                        exists = true;
                    }
                }
                if(!exists){
                    $scope.$apply(function () {
                        $scope.tests.push({
                            name: name,
                            assertions: assertions,
                            passed: passed
                        })
                    });
                }
                index++;
                run();
            });
        });
    }
    $scope.run = function () {
        startTime = new Date().getTime();
        $scope.tests = [];
        server.json({method: 'run'});
    };
    server.onopen = $scope.run;
});