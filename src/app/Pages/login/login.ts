import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: '../../../output.css'
})
export class Login {
  currentYear = new Date().getFullYear();
  username: string = '';
  password: string = '';
  router = inject(Router);

  ngOnInit(): void {
    localStorage.clear();
  }
  
  onSubmit() {
    if (this.username=='monitoreo' && this.password==='.' ) {
      localStorage.setItem('session', 'active');
      localStorage.setItem('token', 'ey213mnbkjasnd2131naskjdn2131');
      this.router.navigate(['dashboard']);
    }else {
      alert('Invalid credentials');
    }
  }
}
