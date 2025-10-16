import { Routes } from '@angular/router';
import { DashboardComponent } from '../Pages/dash-prueba/dashboard';
import { Login } from '../Pages/login/login';
import { TrabajadorDetailsComponent } from '../Pages/tabajador-details/tabajador-details';
import { RangosDetails } from '../Pages/rangos-details/rangos-details';
import { Charts } from '../Pages/charts/charts';

export const routes: Routes = [

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'login', component: Login },
  { path: 'trabajador', component: TrabajadorDetailsComponent },
  { path: 'trabajador/:nombre', component: TrabajadorDetailsComponent },
  { path: 'rangos', component: RangosDetails },

];
