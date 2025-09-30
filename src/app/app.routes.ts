import { Routes } from '@angular/router';
import { Dashboard } from './Pages/dashboard/dashboard';
import { Login } from './Pages/login/login';
import { Details } from './Pages/details/details';
import { authGuard } from '../Guards/auth-guard';

export const routes: Routes = [
    {path:'login', component: Login},
    {path:'dashboard', component: Dashboard, canActivate: [authGuard]},
    {path:'details', component: Details, canActivate: [authGuard]},
    { path: "**", pathMatch: "full", redirectTo: "login" },
];
