import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClownService } from '../clown.service';

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.css']
})
export class RegistrationComponent implements OnInit {
  username: String = null;
  password: String = null;
  email: String = null;
  failedRegistration: boolean = false;
  isRegistering: boolean = false;

  constructor(private clownService: ClownService, private router: Router) { }

  ngOnInit() {
  }

  onSubmit() {
    this.failedRegistration = false;
    this.isRegistering = true;

    var credentials = {};
    credentials['username'] = this.username;
    credentials['password'] = this.password;
    credentials['email'] = this.email;
    this.clownService.register(credentials).subscribe(_ => {
      this.isRegistering = false;
      this.router.navigate(['/login']);
    }, (err: Error) => {
      this.failedRegistration = true;
      this.isRegistering = false;
    })
  }

}
