import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { ClownService } from '../clown.service'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = null
  password: string = null
  failedLogin: boolean = false
  isLoggingIn: boolean = false

  constructor(private clownService: ClownService, private router: Router) { }

  ngOnInit() {
  }

  onSubmit() {
    this.failedLogin = false
    this.isLoggingIn = true

    var credentials = {}
    credentials['username'] = this.username
    credentials['password'] = this.password
    this.clownService.login(credentials).subscribe(_ => {
      this.isLoggingIn = false
      this.router.navigate([this.clownService.redirectUrl])
    }, (err: Error) => {
      this.failedLogin = true
      this.isLoggingIn = false
    })
  }

}
