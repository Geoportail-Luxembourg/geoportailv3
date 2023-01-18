import { Observable, BehaviorSubject, of } from 'rxjs';
import { OfflineStatus, PackageToSkip, StatusJson, TilePackages } from './lux-offline.model';

export class LuxOfflineService {
  public status$: BehaviorSubject<OfflineStatus> = new BehaviorSubject(OfflineStatus.UNINITIALIZED);
  public tileError$: BehaviorSubject<boolean> = new BehaviorSubject(false);
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

  public checkTiles(silent?: boolean) {
    this.tileError$.next(false);
    fetch(this.baseURL + "/check")
      .then((response) => response.json())
      .then((statusJson) => this.setStatus(statusJson))
      .catch((error) => {
        this.handleError(error, silent)
      });
  }

  private setStatus(statusJson: StatusJson) {
    this.tilePackages = {
      ALL: [],
      IN_PROGRESS: [],
      UPDATE_AVAILABLE: [],
      UP_TO_DATE: [],
      UNAVAILABLE: [],
    }
    for(const tileKey in statusJson) {
      // skip package hillshade (too large for transfers)
      if (tileKey == PackageToSkip.HILLSHADE) {
        continue;
      }
      this.tilePackages.ALL.push(tileKey);
      if (!statusJson[tileKey].available) {
        this.tilePackages.UNAVAILABLE.push(tileKey);
      } else if (statusJson[tileKey].status === OfflineStatus.IN_PROGRESS) {
        this.tilePackages.IN_PROGRESS.push(tileKey);
      } else if ((statusJson[tileKey].current < statusJson[tileKey].available) 
        || (!statusJson[tileKey].current && statusJson[tileKey].available)
        ) {
        this.tilePackages.UPDATE_AVAILABLE.push(tileKey);
      } else {
        this.tilePackages.UP_TO_DATE.push(tileKey);
      }
    }
    if (this.tilePackages.UNAVAILABLE.length > 0) {
      this.handleError('AVAILABLE FALSY');
    } else if (this.tilePackages.IN_PROGRESS.length > 0) {
      this.status$.next(OfflineStatus.IN_PROGRESS);
      this.reCheckTilesTimeout(2500);
    } else if (this.tilePackages.UPDATE_AVAILABLE.length > 0) {
      if (this.status$.getValue() === OfflineStatus.IN_PROGRESS) {
        this.handleError('IN_PROGRESS => UPDATE_AVAILABLE');
      }
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
        this.handleError(error);
      })
      .finally(() => {
        if (method === 'DELETE') {
          //prevents a network request for 'DELETE'
          if (this.tilePackages.UP_TO_DATE.length > 0) {
            this.tilePackages.UPDATE_AVAILABLE = [...this.tilePackages.UP_TO_DATE]
            this.status$.next(OfflineStatus.DELETED)
          }
        } else {
          this.reCheckTilesTimeout(250)
        }
      });
  }

  /**
   * There are three possible erroneous responses that can be returned by the local backend
   * - A server error that is caught via the fetch().catch() statement
   * - A tile package that has been in status 'IN_PROGRESS' turns back into status 'UPDATE_AVAILABLE'
   * - A tile package has a falsy value in its 'available' property
   * In all three cases handleError() is called from within this service.
   */
  private handleError(error: Error | string, silent?: boolean) {
    if (!silent) {
      this.tileError$.next(true);
    }
    console.error('Error:', error);
    console.log(this.tilePackages)
    clearTimeout(this.checkTimeout);
    if (this.tilePackages.IN_PROGRESS.length > 0) {
      this.tilePackages.UPDATE_AVAILABLE = [...this.tilePackages.IN_PROGRESS];
      this.tilePackages.IN_PROGRESS = [];
    }
    if (this.tilePackages.UNAVAILABLE.length > 0) {
      this.tilePackages.UPDATE_AVAILABLE = [...this.tilePackages.UNAVAILABLE];
      this.tilePackages.UNAVAILABLE = [];
    }
    this.status$.next(OfflineStatus.UPDATE_AVAILABLE);
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
