import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-destination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './destination.component.html',
  styleUrl: './destination.component.css'
})

export class DestinationComponent {
  isModalOpen = false;
  currentDestination = '';

  openModal(destination: string) {
    this.currentDestination = destination;
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeModal() {
    this.isModalOpen = false;
    document.body.style.overflow = 'auto'; // Re-enable scrolling
  }

  goToWebsite() {
    let url = 'https://example.com';
    
    // Customize URL based on destination
    if (this.currentDestination === 'Canada') {
      url = 'https://travel.gc.ca/';
    } else if (this.currentDestination === 'Switzerland') {
      url = 'https://www.myswitzerland.com/';
    }
    
    window.open(url, '_blank');
  }
}