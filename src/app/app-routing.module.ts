import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MachinesComponent } from './machines/machines.component';
import { MaintenanceHistoryComponent } from './maintenance-history/maintenance-history.component';
import { LoginComponent } from './login/login.component'
import { RegistrationComponent } from './registration/registration.component'
import { AuthGuard } from './auth/auth.guard';
import { LoginGuard } from './auth/login.guard';

const routes: Routes = [
  { path: '', redirectTo: '/machines', pathMatch: 'full' },
  { path: 'machines', component: MachinesComponent, canActivate: [AuthGuard] },
  { path: 'history/:id', component: MaintenanceHistoryComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  { path: 'register', component: RegistrationComponent, canActivate: [LoginGuard] },
  { path: '**', redirectTo: '/machines' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
