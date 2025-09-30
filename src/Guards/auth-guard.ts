import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const isBrowser = typeof window !== 'undefined';
  const isAuthenticated = isBrowser && localStorage.getItem('session') === 'active' && localStorage.getItem('token') =="ey213mnbkjasnd2131naskjdn2131";

  return isAuthenticated ? true : inject(Router).createUrlTree(['/login']);

};
