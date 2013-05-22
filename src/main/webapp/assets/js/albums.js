angular.module('albums', ['ngResource']).
    factory('Albums', function ($resource) {
        return $resource('albums');
    }).
    factory('Album', function ($resource) {
        return $resource('albums/:id', {id: '@id'});
    });

function AlbumsController($scope, Albums, Album) {

    function list() {
        $scope.albums = Albums.query();
    }

    list();

    $scope.delete = function (album) {
        Album.delete({id: album.id},
            function () {
                $scope.status = success("Album deleted successfully");
                list();
            },
            function (result) {
                $scope.status = error("Error deleting album: " + result.status);
            }
        );
    };
}

function success(message) {
    return { isError: false, message: message };
}

function error(message) {
    return { isError: true, message: message };
}