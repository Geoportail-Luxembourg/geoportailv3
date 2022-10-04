import { Observable, BehaviorSubject, of } from 'rxjs';
import { OfflineStatus, PackageToSkip, StatusJson, TilePackages } from './lux-offline.model';

class LuxOfflineService {
  public status$: BehaviorSubject<OfflineStatus> = new BehaviorSubject(OfflineStatus.UNINITIALIZED);
  private tilePackages: TilePackages;
  private server: string;
  private checkTimeout: number;
  
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

  private setStatus(statusJson: StatusJson) {
    this.tilePackages = {
      ALL: [],
      IN_PROGRESS: [],
      UPDATE_AVAILABLE: [],
      UP_TO_DATE: []
    }
    for(const tileKey in statusJson) {
      // skip package hillshade (too large for transfers)
      if (tileKey == PackageToSkip.HILLSHADE) {
        continue;
      }
      this.tilePackages.ALL.push(tileKey);
      if (statusJson[tileKey].status === OfflineStatus.IN_PROGRESS) {
        this.tilePackages.IN_PROGRESS.push(tileKey);
      } else if ((statusJson[tileKey].current < statusJson[tileKey].available) 
        || (!statusJson[tileKey].current && statusJson[tileKey].available)
        ) {
        this.tilePackages.UPDATE_AVAILABLE.push(tileKey);
      } else {
        this.tilePackages.UP_TO_DATE.push(tileKey);
      }
    }
    if (this.tilePackages.IN_PROGRESS.length > 0) {
      this.status$.next(OfflineStatus.IN_PROGRESS);
      this.reCheckTilesTimeout(2500);
    } else if (this.tilePackages.UPDATE_AVAILABLE.length > 0) {
      this.status$.next(OfflineStatus.UPDATE_AVAILABLE);
    } else {
      this.status$.next(OfflineStatus.UP_TO_DATE);
    }
  }

   public updateTiles() {
    this.tilePackages.UPDATE_AVAILABLE.forEach(tilePackage => {
      this.sendRequest(tilePackage, 'PUT');
    })
  }

  public deleteTiles() {
    this.tilePackages.ALL.forEach(tilePackage => {
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

export const LuxOfflineServiceInstance = new LuxOfflineService();
