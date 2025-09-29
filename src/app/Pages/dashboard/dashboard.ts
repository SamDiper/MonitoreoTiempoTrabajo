import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: '../../../output.css'
})
export class Dashboard {
  items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
}
