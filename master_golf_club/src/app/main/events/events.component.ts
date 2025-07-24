import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {

  // Event data
  eventData = {
    title: 'Golf for Beginners Practice and Learning',
    date: '22 August',
    location: '6391 Elgin St. Celina',
    mainImage: '../../../assets/images/resource/event-12.jpg',
    images: [
      '../../../assets/images/resource/event-13.jpg',
      '../../../assets/images/resource/event-14.jpg'
    ],
    description: `Welcome to our vibrant and welcoming golf club, where every member is part of our close-knit community. Whether you're a seasoned golfer or just starting out, our club is the perfect place to hone your skills, enjoy the game, and connect with fellow golf enthusiasts.`,
    additionalInfo: `At our club, we believe in creating a friendly and supportive environment that fosters camaraderie and sportsmanship. Our beautifully maintained course offers challenging yet enjoyable play for golfers of all levels, with stunning landscapes and well-designed fairways that make every round a delight.`,
    activitiesDescription: `There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text.`,
    additionalActivities: `All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour.`
  };

  // Event details
  eventDetails = {
    organizer: 'Devid Rock',
    startDate: 'July 23, 2024',
    endDate: 'July 25, 2024',
    time: '12:00 PM',
    cost: '$60'
  };

  // Venue information
  venueInfo = {
    venue: 'Colf Club',
    address: '12, Victoria St, Australia',
    email: 'colfexample@.com',
    phone: '+(1425) 8547-7592',
    website: 'https://example.com'
  };

  // Contact form data
  contactForm = {
    name: '',
    phone: '',
    event: ''
  };

  // Event options for dropdown
  eventOptions = [
    { value: '1', label: 'Courses & Instructors' },
    { value: '2', label: 'Golf Accommodation' },
    { value: '3', label: 'Fitness Center' },
    { value: '4', label: 'Golf Practice' },
    { value: '5', label: 'Skill Development' },
    { value: '6', label: 'Basic Foundation' }
  ];

  // Form submission
  onSubmit() {
    if (this.contactForm.name && this.contactForm.phone && this.contactForm.event) {
      console.log('Form submitted:', this.contactForm);
      // Handle form submission logic here
      alert('Contact form submitted successfully!');
      this.resetForm();
    } else {
      alert('Please fill in all required fields.');
    }
  }

  // Reset form
  resetForm() {
    this.contactForm = {
      name: '',
      phone: '',
      event: ''
    };
  }
}
