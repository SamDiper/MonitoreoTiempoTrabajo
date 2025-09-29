import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: '../../../output.css'
})
export class Login {
  currentYear = new Date().getFullYear();
}
