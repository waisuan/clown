import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ClownService } from './clown.service';

@Injectable()
export class Interceptor implements HttpInterceptor {
  constructor(private clownService: ClownService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(this.addToken(request)).pipe(catchError(error => {
        if (this.clownService.isLoggedIn() && error.status == 401) {
            return this.clownService.extendUserSession().pipe(
                switchMap(() => {
                    return next.handle(this.addToken(request));
                })
            );
        } else {
            return throwError(error);
        }
    }));
  }

  private addToken(request: HttpRequest<any>) {
      return request.clone({ setHeaders: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') } })
  }
}