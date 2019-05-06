import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MachinesComponent } from './machines/machines.component';

const routes: Routes = [
  { path: '', redirectTo: '/machines', pathMatch: 'full' },
  { path: 'machines', component: MachinesComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
