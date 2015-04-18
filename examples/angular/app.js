var app = angular.module('app', []);
app.controller('appCtrl', function ($scope) {
    mpi.Client(function (client) {
        client.$.bind($scope, 'client');
    });
});