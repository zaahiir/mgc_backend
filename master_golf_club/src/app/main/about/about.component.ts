import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit {

  contactInfo = [
    {
      icon: 'fas fa-map-marker-alt',
      title: 'Our Location',
      description: '1901 Thornridge Cir. Shiloh,<br>Hawaii 81063'
    },
    {
      icon: 'fas fa-envelope',
      title: 'Email Address',
      description: 'contact@example.com (Information)<br>support@example.com (Query)'
    },
    {
      icon: 'fas fa-phone',
      title: 'Phone Number',
      description: '+208 555-0111 (International)<br>+208 555-0112 (Local)'
    }
  ];

  faqItems = [
    {
      id: 1,
      question: 'How To Purchase The Tickets For Groups?',
      answer: 'Sodales posuere facilisi metus elementum ipsum egestas amet amet mattis commodo Nunc tempor amet massa diam mauris Risus sodales interdum.',
      isActive: true
    },
    {
      id: 2,
      question: 'What Equipment Do I Need For Golfing?',
      answer: 'Sodales posuere facilisi metus elementum ipsum egestas amet amet mattis commodo Nunc tempor amet massa diam mauris Risus sodales interdum.',
      isActive: false
    },
    {
      id: 3,
      question: 'Does Practicing Golf At Home Actually Work?',
      answer: 'Sodales posuere facilisi metus elementum ipsum egestas amet amet mattis commodo Nunc tempor amet massa diam mauris Risus sodales interdum.',
      isActive: false
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  onSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const data: { [key: string]: string } = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    // Simple validation
    if (!data['username'] || !data['email'] || !data['phone'] || !data['subject'] || !data['message']) {
      alert('Please fill in all required fields.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data['email'] as string)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Simulate form submission
    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Sending...';
    button.disabled = true;

    setTimeout(() => {
      alert('Thank you for your message! We will get back to you soon.');
      form.reset();
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }

  toggleAccordion(selectedItem: any) {
    // Close all other accordions
    this.faqItems.forEach(item => {
      if (item.id !== selectedItem.id) {
        item.isActive = false;
      }
    });

    // Toggle current accordion
    selectedItem.isActive = !selectedItem.isActive;
  }
}
