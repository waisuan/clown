import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AgGridModule } from 'ag-grid-angular';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerModule } from 'ngx-spinner';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MachinesComponent } from './machines/machines.component';
import { MaintenanceHistoryComponent } from './maintenance-history/maintenance-history.component';
import { ButtonCellComponent } from './button-cell/button-cell.component';
import { CheckboxCellComponent } from './checkbox-cell/checkbox-cell.component';
import { LoginComponent } from './login/login.component';
import { RegistrationComponent } from './registration/registration.component';

@NgModule({
  declarations: [
    AppComponent,
    MachinesComponent,
    MaintenanceHistoryComponent,
    ButtonCellComponent,
    CheckboxCellComponent,
    LoginComponent,
    RegistrationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AgGridModule.withComponents([]),
    HttpClientModule,
    NgbModule,
    NgxSpinnerModule
  ],
  providers: [],
  entryComponents: [ButtonCellComponent, CheckboxCellComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
