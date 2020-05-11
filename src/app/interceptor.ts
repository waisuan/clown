import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ClownService } from './clown.service';

@Injectable()
export class Interceptor implements HttpInterceptor {
  constructor(private clownService: ClownService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(this.addToken(request)).pipe(catchError(error => {
        if (error.status == 401) {
            return this.clownService.extendUserSession().pipe(
                switchMap(() => {
                    if (!this.clownService.isLoggedIn()) {
                        return throwError(this.generateErrorResponse());
                    }
                    return next.handle(this.addToken(request));
                })
            );
        } else {
            return throwError(error);
        }
    }));
  }

  private generateErrorResponse() {
      return new HttpErrorResponse({status: 401});
  }

  private addToken(request: HttpRequest<any>) {
      return request.clone({ setHeaders: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') } })
  }
}