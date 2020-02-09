import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MachinesComponent } from './machines/machines.component';
import { MaintenanceHistoryComponent } from './maintenance-history/maintenance-history.component';

const routes: Routes = [
  { path: '', redirectTo: '/machines', pathMatch: 'full' },
  { path: 'machines', component: MachinesComponent },
  { path: 'history/:id', component: MaintenanceHistoryComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
