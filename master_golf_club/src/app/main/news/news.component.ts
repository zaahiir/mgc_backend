import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Add this import

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule here
  templateUrl: './news.component.html',
  styleUrl: './news.component.css'
})
export class NewsComponent {
  contactEmail = 'tournament@golfclub.com';
  contactPhone = '(555) 123-4567';

  // News posts data
  latestNews = [
    {
      id: 1,
      title: 'Key Golf Gadgets for the Determined',
      date: '20 Aug, 2024',
      image: 'assets/images/news/post-1.jpg',
      link: '#'
    },
    {
      id: 2,
      title: 'Join our Club & Stay Updated',
      date: '19 Aug, 2024',
      image: 'assets/images/news/post-2.jpg',
      link: '#'
    },
    {
      id: 3,
      title: 'Golfing on a Budget Best Public Courses',
      date: '18 Aug, 2024',
      image: 'assets/images/news/post-3.jpg',
      link: '#'
    },
    {
      id: 4,
      title: 'Advanced Golf Techniques for Professionals',
      date: '17 Aug, 2024',
      image: 'assets/images/news/post-2.jpg',
      link: '#'
    },
    {
      id: 5,
      title: 'Essential Equipment for New Golfers',
      date: '16 Aug, 2024',
      image: 'assets/images/news/post-3.jpg',
      link: '#'
    }
  ];

  // Main article data
  mainArticle = {
    title: 'Inside the Minds of Champions Lessons from the Greatest Golfers of All Time',
    date: '08 DEC',
    category: 'Management',
    image: 'assets/images/news/news-13.jpg',
    content: {
      intro: 'Delving into the minds of golf\'s greatest champions reveals a fascinating blend of skill, strategy, and mental fortitude that sets them apart on the fairways. Legends like Jack Nicklaus, Tiger Woods, and Arnold Palmer have demonstrated that mastering the game goes beyond physical prowess; it\'s about mental resilience and strategic thinking.',
      body: 'These icons have taught us that focus, patience, and a relentless drive for improvement are crucial for success. Their ability to visualize shots, maintain composure under pressure, and continuously adapt their strategies offers invaluable lessons for golfers of all levels.',
      quote: {
        text: 'From the moment we stepped on board, we were greeted by a friendly and professional crew who ensured every detail of our trip',
        author: 'Brooklyn Simmons'
      }
    }
  };

  // Search functionality
  searchTerm = '';

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    console.log('Search term:', this.searchTerm);
    // Implement search logic here
  }

  onSearchSubmit(event: Event) {
    event.preventDefault();
    console.log('Search submitted:', this.searchTerm);
    // Implement search submission logic here
  }
}
