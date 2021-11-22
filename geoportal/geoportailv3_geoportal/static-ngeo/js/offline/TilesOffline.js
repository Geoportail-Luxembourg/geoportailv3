export default class TilesOffline {
    checkTiles(selection) {
        return fetch("http://localhost:8766/check");
    }

    updateTiles(selection) {
        return fetch("http://localhost:8766/update?map=" + selection, {
            method: "POST"
        });
    }

    deleteTiles(selection) {
        return fetch("http://localhost:8766/delete?map=" + selection, {
            method: "POST"
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


