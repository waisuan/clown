import { Injectable } from '@angular/core'
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http'
import { Observable, throwError } from 'rxjs'
import { catchError, switchMap } from 'rxjs/operators'
import { ClownService } from './clown.service'

@Injectable()
export class Interceptor implements HttpInterceptor {
  constructor(private clownService: ClownService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(this.tag(request)).pipe(catchError(error => {
        return throwError(error)
    }))
  }

  private tag(request: HttpRequest<any>) {
    return request.clone({ withCredentials: true })
}
}