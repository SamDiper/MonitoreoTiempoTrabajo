import { Routes } from '@angular/router';
import { Dashboard } from './Pages/dashboard/dashboard';
import { Login } from './Pages/login/login';
import { Details } from './Pages/details/details';

export const routes: Routes = [
    {path:'login', component: Login},
    {path:'dashboard', component: Dashboard},
    {path:'details', component: Details},
    { path: "**", pathMatch: "full", redirectTo: "login" }
];
