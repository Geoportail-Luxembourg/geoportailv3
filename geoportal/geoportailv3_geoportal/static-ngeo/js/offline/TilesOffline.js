export default class TilesOffline {
    checkTiles(selection) {
        return fetch("http://localhost:8766/check");
    }

    updateTiles(selection) {
        return fetch("http://localhost:8766/map/" + selection, {
            method: "PUT"
        });
    }

    deleteTiles(selection) {
        return fetch("http://localhost:8766/map/" + selection, {
            method: "DELETE"
        });
    }

    downloadAll() {
    }

    downloadOne(mapName) {
        fetch("http://localhost:8766/update?map=" + mapName, {
            method: "POST"
        });
    }
}


