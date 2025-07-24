import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent {
  showModal = false;
  selectedOrderId: string | null = null;

  viewBill(orderId: string) {
    this.selectedOrderId = orderId;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedOrderId = null;
  }

  downloadBill(orderId: string) {
    alert(`Downloading PDF bill for Order ID: ${orderId}`);
    // Here you would add logic to generate or fetch the PDF for download
  }
}
