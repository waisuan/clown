import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { catchError, tap, map } from 'rxjs/operators'
import { Observable, of, throwError } from 'rxjs'
import { environment } from '../environments/environment'
import { switchMap } from 'rxjs/operators'
import { _ } from 'ag-grid-community'

const api = 'api'
const url = environment.apiUrl

@Injectable({
  providedIn: 'root'
})
export class ClownService {
  redirectUrl = '/'

  constructor(private http: HttpClient) { }

  getHttpFileOptions() {
    return {
      responseType: 'blob' as 'blob',
      observe: 'response' as 'response'
    }
  }

  getMachines(limit: number=null, lastMachineFetched: number=null, sortBy: string=null, sortOrder: string=null) {
    var endpoint = `${url}/${api}/machines`
    var queryParams = {}
    if (limit != null) {
      queryParams['page_limit'] = limit.toString()
    }
    if (lastMachineFetched != null) {
      queryParams['page_offset'] = lastMachineFetched.toString()
    }
    if (sortBy != null && sortOrder != null) {
      queryParams['sort_filter'] = sortBy
      queryParams['sort_order'] = sortOrder
    }

    return this.http.get(endpoint, {params: queryParams}).pipe(map(data => {
      return {'count': data['count'], 'data': data['machines']}
    }))
  }

  getDueMachines() {
    return this.http.get(`${url}/${api}/machines/due`)
  }

  getAttachment(dir:string, filename: string) {
    var endpoint = `${url}/${api}/files/${dir}/${filename}`
    return this.http.get(endpoint, this.getHttpFileOptions()).pipe(
      map(response => {
        return { fileName: filename, blob: response.body }
      }),
      catchError(this.handleError('getAttachment()'))
    )
  }

  searchMachines(term: string, limit: number = null, lastMachineFetched: number = null, sortBy: string = null, sortOrder: string = null) {
    if (!term.trim()) {
      return this.getMachines(limit, lastMachineFetched, sortBy, sortOrder)
    }
    var endpoint = `${url}/${api}/machines`
    var queryParams = {}
    if (limit != null) {
      queryParams['page_limit'] = limit.toString()
    }
    if (lastMachineFetched != null) {
      queryParams['page_offset'] = lastMachineFetched.toString()
    }
    if (sortBy != null && sortOrder != null) {
      queryParams['sort_filter'] = sortBy
      queryParams['sort_order'] = sortOrder
    }

    return this.http.get(endpoint + `/search/${term}`, {params: queryParams}).pipe(map(data => {
      return {'count': data['count'], 'data': data['machines']}
    }))
  }

  insertMachine(machine: {}) {
    return this.http.post(`${url}/${api}/machines`, machine).pipe(
      switchMap(_ => {
        return this.http.get(`${url}/${api}/machines/due/count`)
      }),
      catchError(this.handleError('insertMachine()'))
    )
  }

  updateMachine(id: string, machine: {}) {
    return this.http.put(`${url}/${api}/machines/${id}`, machine).pipe(
      switchMap(_ => {
        return this.http.get(`${url}/${api}/machines/due/count`)
      }),
      catchError(this.handleError('updateMachine()'))
    )
  }

  deleteMachine(id: string) {
    return this.http.delete(`${url}/${api}/machines/${id}`).pipe(
      switchMap(_ => {
        return this.http.get(`${url}/${api}/machines/due/count`)
      }),
      catchError(this.handleError('deleteMachine()'))
    )
  }

  insertAttachment(id: string, file: FormData) {
    if (!file) {
      return of(null)
    }
    return this.http.post(`${url}/${api}/files/${id}`, file).pipe(
      catchError(this.handleError('insertAttachment()'))
    )
  }

  getHistory(machineId: string, limit: number=null, lastBatchFetched: number=null, sortBy: string=null, sortOrder: string=null) {
    var endpoint = `${url}/${api}/machines/${machineId}/history`
    var queryParams = {}
    if (limit != null) {
      queryParams['page_limit'] = limit.toString()
    }
    if (lastBatchFetched != null) {
      queryParams['page_offset'] = lastBatchFetched.toString()
    }
    if (sortBy != null && sortOrder != null) {
      queryParams['sort_filter'] = sortBy
      queryParams['sort_order'] = sortOrder
    }

    return this.http.get(endpoint + '/count').pipe(
      switchMap(count => {
        return this.http.get(endpoint, {params: queryParams}).pipe(map(data => {
          return {'count': count, 'data': data}
        }))
      })
    )
  }

  searchHistory(machineId: string, term: string, limit: number = null, lastBatchFetched: number = null, sortBy: string = null, sortOrder: string = null) {
    if (!term.trim()) {
      return this.getHistory(machineId, limit, lastBatchFetched, sortBy, sortOrder)
    }
    var endpoint = `${url}/${api}/machines/${machineId}/history`
    var queryParams = {}
    if (limit != null) {
      queryParams['page_limit'] = limit.toString()
    }
    if (lastBatchFetched != null) {
      queryParams['page_offset'] = lastBatchFetched.toString()
    }
    if (sortBy != null && sortOrder != null) {
      queryParams['sort_filter'] = sortBy
      queryParams['sort_order'] = sortOrder
    }

    return this.http.get(endpoint + '/count', {params: {'keyword': term}}).pipe(
      switchMap(count => {
        return this.http.get(endpoint + `/search/${term}`, {params: queryParams}).pipe(map(data => {
          return {'count': count, 'data': data}
        }))
      })
    )
  }

  insertHistory(machineId: String, history: {}) {
    return this.http.post(`${url}/${api}/machines/${machineId}/history`, history).pipe(
      catchError(this.handleError('insertHistory()'))
    )
  }

  updateHistory(machineId: String, id: string, newValues: {}) {
    return this.http.put(`${url}/${api}/machines/${machineId}/history/${id}`, newValues).pipe(
      catchError(this.handleError('updateHistory()'))
    )
  }

  deleteHistory(machineId: String, id: string) {
    return this.http.delete(`${url}/${api}/machines/${machineId}/history/${id}`).pipe(
      catchError(this.handleError('deleteHistory()'))
    )
  }

  register(credentials) {
    return this.http.post(`${url}/${api}/users/register`, credentials).pipe(
      catchError(this.handleError('register()'))
    )
  }

  login(credentials) {
    return this.http.post(`${url}/${api}/users/login`, credentials).pipe(
      tap(user => {
        localStorage.setItem('user', user['username'])
        localStorage.setItem('user_role', user['role'])
        localStorage.setItem('user_token', user['token'])
      }),
      catchError(this.handleError('login()'))
    )
  }

  logout() {
    return this.http.post(`${url}/${api}/users/logout`, {}).pipe(
      tap(_ => {
        localStorage.clear()
      }),
      catchError((error: any): Observable<any> => {
        console.error(error)
        localStorage.clear()
        return of(null)
      })
    )
  }

  isLoggedIn() {
    return localStorage.getItem('user_token')
  }

  isAdmin() {
    return localStorage.getItem('user_role') == 'ADMIN'
  }

  private log(msg: any) {
    console.log(msg)
  }

  private handleError<T>(operation = 'operation') {
    return (error: any): Observable<T> => {
      console.error(error)

      this.log(`${operation} failed: ${error.message}`)

      return throwError(error)
    }
  }
}
