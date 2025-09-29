import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: '../output.css'
})
export class App {
  protected readonly title = signal('MonitoreoTiempoTrabajo');
  router= inject(Router);


}
