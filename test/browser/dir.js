app.directive('dir', function ($compile) {

var index = 0;
    var templates = {
        object: '<div><div ng-repeat="(key, value) in content" class="dir-item">{{ key }}: <div dir="value" key="key"></div></div></div>',
        array: '<div><div ng-repeat="item in content" class="dir-item">{{ $index }}: <div dir="item" key="$index"></div></div></div>'
    };
    function getType(any) {
        if(typeof any !== 'object') return typeof any;
        if(angular.isArray(any)) return 'array';
        return 'object';
    }

    function getText(item, type) {
        if(type === 'object') return 'Object';
        if(type === 'array') return 'Array';
        return item;
    }
    return {
        restrict: 'A',
        scope: true,
        template: '<input type="text" ng-if="!isObject" ng-model="source"/><span ng-if="isObject">{{ text }}</span>',
        link: function (scope, elem, attrs) {
            index++;
            var i = index;
            if(!scope.path) scope.path = '';
            if(attrs.key){
                scope.path = scope.path + '.' + attrs.key;
            }

            var parent = elem.parent();
            var type, compiled, source = scope.$eval(attrs.dir);
            scope.$watch(attrs.dir, function (val, old) {
                source = val;
                elem.removeClass('dir-' + type);
                parent.removeClass('dir-item-' + type);
                type = getType(source);
                elem.addClass('dir-' + type);
                parent.addClass('dir-item-' + type);
                scope.isObject = (typeof source === 'object');
                scope.source = source;
                scope.text = getText(source, type);
            });
            if('root' in attrs) {
                scope.root = source;
                scope.path = '';
            }
            else{

            }

            elem.addClass('dir-' + type);
            parent.addClass('dir-item-' + type);
            //scope.getClass = function () {
            //    return 'dir-' + type;
            //};
            parent.on('click', function (e) {
                scope.$apply(function () {
                    e.stopPropagation();
                    if(typeof source !== 'object') return;
                    if(compiled){
                        compiled.remove();
                        parent.removeClass('dir-open');
                        compiled = false;
                        scope.content = false;
                    }
                    else{
                        scope.content = source;
                        parent.addClass('dir-open');
                        compiled = $compile(templates[type])(scope);
                        elem.append(compiled);
                    }
                });
            });
        }
    };
});