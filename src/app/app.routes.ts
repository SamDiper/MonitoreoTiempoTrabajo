import { Routes } from '@angular/router';
import { DashboardComponent } from '../Pages/dash-prueba/dashboard';
import { Login } from '../Pages/login/login';
import { TrabajadorDetailsComponent } from '../Pages/tabajador-details/tabajador-details';

export const routes: Routes = [

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'login', component: Login },
  { path: 'trabajador', component: TrabajadorDetailsComponent },
  { path: 'trabajador/:nombre', component: TrabajadorDetailsComponent },
//   { path: 'charts', component: ChartsComponent }

];
