import { Observable, BehaviorSubject, of } from 'rxjs';

export class LuxOfflineService {
  public status$ = new BehaviorSubject('UP_TO_DATE');
  private tilePackages: {
    ALL: [],
    IN_PROGRESS: [],
    UPDATE_AVAILABLE: [],
    UP_TO_DATE: []
  };
  private server;
  private checkTimeout;
  
  constructor(){
    const searchParams = new URLSearchParams(document.location.search);
    const server = searchParams.get('embeddedserver');
    const proto = searchParams.get('embeddedserverprotocol') || 'http';
    this.baseURL = (server ? `${proto}://${server}` : "http://localhost:8766/map/");
    if (server) {
      this.checkTiles();
    }
    this.server = server;
  }

  public hasLocalServer(){
    return !!this.server;
  }

  private checkTiles() {
    fetch(this.baseURL + "/check")
      .then((response) => response.json())
      .then((statusJson) => this.setStatus(statusJson))
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  private setStatus(tiles) {
    this.tilePackages = {
      ALL: [],
      IN_PROGRESS: [],
      UPDATE_AVAILABLE: [],
      UP_TO_DATE: []
    }
    for(const tileKey in tiles) {
      // skip package hillshade (too large for transfers)
      if (tileKey == "hillshade-lu") {
        continue;
      }
      this.tilePackages.ALL.push(tileKey);
      if (tiles[tileKey].status === "IN_PROGRESS") {
        this.tilePackages.IN_PROGRESS.push(tileKey);
      } else if ((tiles[tileKey].current < tiles[tileKey].available) 
        || (!tiles[tileKey].current && tiles[tileKey].available)
        ) {
        this.tilePackages.UPDATE_AVAILABLE.push(tileKey);
      } else {
        this.tilePackages.UP_TO_DATE.push(tileKey);
      }
    }
    if (this.tilePackages.IN_PROGRESS.length > 0) {
      this.status$.next('IN_PROGRESS');
      this.reCheckTilesTimeout(2500);
    } else if (this.tilePackages.UPDATE_AVAILABLE.length > 0) {
      this.status$.next('UPDATE_AVAILABLE');
    } else {
      this.status$.next('UP_TO_DATE');
    }
  }

   public updateTiles() {
    this.tilePackages.UPDATE_AVAILABLE.forEach(tilePackage => {
      this.sendRequest(tilePackage, 'PUT');
    })
  }

  public deleteTiles() {
    // keep resources, so that vector maps remain operational
    this.tilePackages.ALL.filter(tp => tp != 'resources').forEach(tilePackage => {
      this.sendRequest(tilePackage, 'DELETE');
    })
}

  private sendRequest(tiles: string, method: string) {
    fetch(this.baseURL + "/map/" + tiles, {method})
      .then((data) => {
        console.log('Success:', data);
      })
      .catch((error) => {
        console.error('Error:', error);
      })
      .finally(() => {this.reCheckTilesTimeout(250)});
  }

  private reCheckTilesTimeout(timeout) {
    // prevent multiple timers
    if (this.checkTimeout !== undefined) {
      clearTimeout(this.checkTimeout);
    }
    this.checkTimeout = setTimeout(()=> {
      this.checkTiles();
    }, timeout)
  }
}