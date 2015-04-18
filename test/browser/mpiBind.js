app.directive('mpiModel', function () {

    return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
            var path = attrs.mpiModel;
            var array = path.split('.');
            var watcher = scope.$eval(array.shift());
            path = array.join('.');
            if(!watcher.$){
                return console.error('no good watcher', watcher);
            }
            var target = watcher.$.find(path);
            elem[0].value = target.value;
            elem.on('change', function (val) {

            });
        }
    };
});