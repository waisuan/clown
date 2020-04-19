import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { ClownService } from '../clown.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private clownService: ClownService, private router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean {
    if (this.clownService.isLoggedIn()) {
      return true;
    }

    this.clownService.redirectUrl = state.url;
    this.router.navigate(['/login']);
    return false;
  }
}
