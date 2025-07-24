import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router  } from '@angular/router';

@Component({
  selector: 'app-collection-plus',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './collection-plus.component.html',
  styleUrl: './collection-plus.component.css'
})

export class CollectionPlusComponent {
  cards = [
    { country: 'Canada', backgroundImage: 'url(assets/images/3859.webp)' },
    { country: 'USA', backgroundImage: 'url(assets/images/3859.webp)' },
    { country: 'Europe', backgroundImage: 'url(assets/images/3859.webp)' },
    { country: 'Australia', backgroundImage: 'url(assets/images/3859.webp)' },
    { country: 'India', backgroundImage: 'url(assets/images/3859.webp)' },
    { country: 'Japan', backgroundImage: 'url(assets/images/3859.webp)' },
  ];

  constructor(private router: Router) {}

  navigateToDestination(country: string) {
    this.router.navigate(['/destination']);
  }
}
