import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, map } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../environments/environment';

const api = 'clown-api';
const url = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ClownService {
  redirectUrl = '/';

  constructor(private http: HttpClient) { }

  getHttpFileOptions() {
    return {
      responseType: 'blob' as 'blob',
      observe: 'response' as 'response'
    };
  }

  getMachines(limit: number=null, lastMachineFetched: number=null, sortBy: string=null, sortOrder: string=null) {    
    var endpoint = `${url}/${api}/machines`;
    if (limit != null) {
      endpoint += `/${limit}`;
    }
    if (lastMachineFetched != null) {
      endpoint += `/${lastMachineFetched}`;
    }
    if (sortBy != null && sortOrder != null) {
      endpoint += `/${sortBy}/${sortOrder}`;
    }

    return this.http.get(endpoint).pipe(
      catchError(this.handleError('getMachines()'))
    );
  }

  getDueMachines(status: string, limit: number=null, lastMachineFetched: number=null, sortBy: string=null, sortOrder: string=null) {
    var endpoint = `${url}/${api}/machines/due/${status}`;
    if (limit != null) {
      endpoint += `/${limit}`;
    }
    if (lastMachineFetched != null) {
      endpoint += `/${lastMachineFetched}`;
    }
    if (sortBy != null && sortOrder != null) {
      endpoint += `/${sortBy}/${sortOrder}`;
    }
    return this.http.get(endpoint).pipe(
      catchError(this.handleError('getDueMachines()'))
    );
  }

  getAttachment(id: string) {
    var endpoint = `${url}/${api}/attachment/${id}`;
    return this.http.get(endpoint, this.getHttpFileOptions()).pipe(
      map(response => {
        var contentDispositionHeader = response.headers.get('Content-Disposition');
        var result = contentDispositionHeader.split(';')[1].trim().split('=')[1];
        var fileName = result.replace(/"/g, '');
        return { fileName: fileName, blob: response.body };
      }),
      catchError(this.handleError('getAttachment()'))
    );
  }

  searchMachines(term: string, limit: number = null, lastMachineFetched: number = null, sortBy: string = null, sortOrder: string = null) {
    if (!term.trim()) {
      return this.getMachines(limit, lastMachineFetched, sortBy, sortOrder)
    }
    var endpoint = `${url}/${api}/machines/search/${term}`;
    if (limit != null) {
      endpoint += `/${limit}`;
    }
    if (lastMachineFetched != null) {
      endpoint += `/${lastMachineFetched}`;
    }
    if (sortBy != null && sortOrder != null) {
      endpoint += `/${sortBy}/${sortOrder}`;
    }
    return this.http.get(endpoint).pipe(
      catchError(this.handleError('searchMachinesInBatches()'))
    );
  }

  insertMachine(machine: {}) {
    return this.http.post(`${url}/${api}/machines`, machine).pipe(
      catchError(this.handleError('insertMachine()'))
    );
  }

  updateMachine(id: string, machine: {}) {
    return this.http.put(`${url}/${api}/machines/${id}`, machine).pipe(
      catchError(this.handleError('updateMachine()'))
    );
  }

  deleteMachine(id: string) {
    return this.http.delete(`${url}/${api}/machines/${id}`).pipe(
      catchError(this.handleError('deleteMachine()'))
    );
  }

  insertAttachment(id: string, file: FormData) {
    if (!file) {
      return of(null);
    }
    return this.http.put(`${url}/${api}/attachment/${id}`, file).pipe(
      catchError(this.handleError('insertAttachment()'))
    );
  }

  getHistory(machineId: string, limit: number=null, lastBatchFetched: number=null, sortBy: string=null, sortOrder: string=null) {
    var endpoint = `${url}/${api}/history/fetch/${machineId}`;
    if (limit != null) {
      endpoint += `/${limit}`;
    }
    if (lastBatchFetched != null) {
      endpoint += `/${lastBatchFetched}`;
    }
    if (sortBy != null && sortOrder != null) {
      endpoint += `/${sortBy}/${sortOrder}`;
    }
    return this.http.get(endpoint).pipe(
      catchError(this.handleError('getHistory()'))
    );
  }

  searchHistory(machineId: string, term: string, limit: number = null, lastMachineFetched: number = null, sortBy: string = null, sortOrder: string = null) {
    if (!term.trim()) {
      return this.getHistory(machineId, limit, lastMachineFetched, sortBy, sortOrder)
    }
    var endpoint = `${url}/${api}/history/search/${machineId}/${term}`;
    if (limit != null) {
      endpoint += `/${limit}`;
    }
    if (lastMachineFetched != null) {
      endpoint += `/${lastMachineFetched}`;
    }
    if (sortBy != null && sortOrder != null) {
      endpoint += `/${sortBy}/${sortOrder}`;
    }
    return this.http.get(endpoint).pipe(
      catchError(this.handleError('searchHistory()'))
    );
  }

  insertHistory(history: {}) {
    return this.http.post(`${url}/${api}/history`, history).pipe(
      catchError(this.handleError('insertHistory()'))
    );
  }

  updateHistory(id: string, newValues: {}) {
    return this.http.put(`${url}/${api}/history/${id}`, newValues).pipe(
      catchError(this.handleError('updateHistory()'))
    );
  }

  deleteHistory(id: string) {
    return this.http.delete(`${url}/${api}/history/${id}`).pipe(
      catchError(this.handleError('deleteHistory()'))
    );
  }

  register(credentials) {
    return this.http.post(`${url}/${api}/user/create`, credentials).pipe(
      catchError(this.handleError('login()'))
    );
  }

  login(credentials) {
    return this.http.post(`${url}/${api}/user/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('authToken', response['token']);
        localStorage.setItem('user', credentials['username']);
      }),
      catchError(this.handleError('login()'))
    );
  }

  extendUserSession() {
    var currentUser = localStorage.getItem('user');
    return this.http.post(`${url}/${api}/user/extend/${currentUser}`, {}).pipe(
      tap(response => {
        if ('token' in response) {
          localStorage.setItem('authToken', response['token']);
        } else {
          this.logout();
        }
      }),
      catchError(this.handleError('extendUserSession()'))
    )
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  isLoggedIn() {
    return localStorage.getItem('authToken') && localStorage.getItem('user');
  }

  private log(msg: any) {
    console.log(msg);
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      console.error(error);

      this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      //return of(result as T);
      return throwError(error);
    };
  }
}
