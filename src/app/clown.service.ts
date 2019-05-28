import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, tap, map } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};
const httpFormOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'multipart/form-data' })
};
const httpFileOptions = {
  responseType: 'blob' as 'blob',
  observe: 'response' as 'response'
}
const api = 'clown-api';
const url = 'http://localhost:8080';

@Injectable({
  providedIn: 'root'
})
export class ClownService {
  constructor(private http: HttpClient) { }

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
      tap(response => this.log(response)),
      catchError(this.handleError('getMachines()', {}))
    );
  }

  getAttachment(id: string) {
    var endpoint = `${url}/${api}/attachment/${id}`;
    return this.http.get(endpoint, httpFileOptions).pipe(
      map(response => {
        var contentDispositionHeader = response.headers.get('Content-Disposition');
        var result = contentDispositionHeader.split(';')[1].trim().split('=')[1];
        var fileName = result.replace(/"/g, '');
        return { fileName: fileName, blob: response.body };
      }),
      tap(response => this.log(response)),
      catchError(this.handleError('getAttachment()', {}))
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
      tap(response => this.log(response)),
      catchError(this.handleError('searchMachinesInBatches()', {}))
    );
  }

  updateMachine(id: string, machine: {}) {
    return this.http.put(`${url}/${api}/machine/${id}`, machine, httpOptions).pipe(
      tap(_ => this.log(`updated machine=${id}`)),
      catchError(this.handleError('updateMachine()'))
    );
  }

  deleteMachine(id: string) {
    return this.http.delete(`${url}/${api}/machine/${id}`).pipe(
      tap(_ => this.log(`deleted machine=${id}`)),
      catchError(this.handleError('deleteMachine()'))
    );
  }

  insertAttachment(id: string, file: FormData) {
    if (!file) {
      return of(null);
    }
    return this.http.put(`${url}/${api}/attachment/${id}`, file).pipe(
      tap(_ => this.log(`updated attachment=${id}`)),
      catchError(this.handleError('insertAttachment()'))
    );
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
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead

      // TODO: better job of transforming error for user consumption
      this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      //return of(result as T);
      return throwError(error);
    };
  }
}
