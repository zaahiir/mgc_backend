import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faMapMarkerAlt, faEnvelope, faPhone, faChevronDown,
  faHome, faUser, faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { ContactService, ContactMessage, FAQResponse, FAQItem } from '../common-service/contact/contact.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit {

  // Icons
  locationIcon = faMapMarkerAlt;
  emailIcon = faEnvelope;
  phoneIcon = faPhone;
  chevronDownIcon = faChevronDown;
  homeIcon = faHome;
  userIcon = faUser;
  globeIcon = faGlobe;

  contactInfo = [
    {
      icon: this.locationIcon,
      title: 'Our Location',
      description: '1901 Thornridge Cir. Shiloh,<br>Hawaii 81063'
    },
    {
      icon: this.emailIcon,
      title: 'Email Address',
      description: 'contact@example.com (Information)<br>support@example.com (Query)'
    },
    {
      icon: this.phoneIcon,
      title: 'Phone Number',
      description: '+208 555-0111 (International)<br>+208 555-0112 (Local)'
    },
    {
      icon: this.homeIcon,
      title: 'Main Office',
      description: '123 Golf Club Drive<br>Main Building, Floor 2'
    },
    {
      icon: this.userIcon,
      title: 'Contact Person',
      description: 'John Smith (Manager)<br>Available Mon-Fri 9AM-5PM'
    },
    {
      icon: this.globeIcon,
      title: 'Website',
      description: 'www.mastergolfclub.com<br>Online booking available 24/7'
    }
  ];

  faqItems: FAQItem[] = [];

  constructor(private contactService: ContactService) { }

  ngOnInit(): void {
    this.loadFAQs();
  }

  loadFAQs(): void {
    this.contactService.getActiveFAQs().subscribe({
      next: (faqs: FAQResponse[]) => {
        // Transform FAQ responses to FAQ items with accordion state
        this.faqItems = faqs.map((faq, index) => ({
          id: faq.id,
          question: faq.faqQuestion,
          answer: faq.faqAnswer,
          isActive: index === 0 // First FAQ is active by default
        }));
      },
      error: (error) => {
        console.error('Error loading FAQs:', error);
        // Fallback to empty array if API fails
        this.faqItems = [];
      }
    });
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

    // Prepare contact message data
    const contactMessage: ContactMessage = {
      name: data['username'],
      email: data['email'],
      phone: data['phone'],
      subject: data['subject'],
      description: data['message']
    };

    // Simulate form submission
    const button = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    const originalText = button.textContent;
    button.textContent = 'Sending...';
    button.disabled = true;

    // Send message using contact service
    this.contactService.sendMessage(contactMessage).subscribe({
      next: (response) => {
        alert('Thank you for your message! We will get back to you soon.');
        form.reset();
        button.textContent = originalText;
        button.disabled = false;
      },
      error: (error) => {
        console.error('Error sending message:', error);
        alert('Sorry, there was an error sending your message. Please try again.');
        button.textContent = originalText;
        button.disabled = false;
      }
    });
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
