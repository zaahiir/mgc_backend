import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NewsService, BlogPost } from '../common-service/news/news.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  cards = [
    {
      title: 'Golf Collection',
      description: 'Explore our exclusive golf course collection',
      route: '/collection',
      imageSrc: 'assets/images/service/service-1.jpg'
    },
    {
      title: 'Golf Events',
      description: 'Join our professional golf training programs',
      route: '/events',
      imageSrc: 'assets/images/service/service-2.jpg'
    },
    {
      title: 'collection Plus',
      description: 'Professional golf equipment for enthusiasts',
      route: '/collectionPlus',
      imageSrc: 'assets/images/service/service-4.jpg'
    }
  ];

  // Default news data in case API fails
  featuredNews = {
    id: 0,
    title: 'Key Golf Gadgets for the Determined Golfer',
    highlight: 'Featured',
    description: 'Lorem ipsum dolor sit amet consectetur. Aliquet amet elementum. Nulla facilisi. Maecenas et feugiat purus.',
    truncatedDescription: 'Lorem ipsum dolor sit amet consectetur. Aliquet amet elementum. Nulla facilisi. Maecenas et feugiat purus.',
    showReadMore: false,
    date: '31 DEC',
    imageSrc: 'assets/images/news/news-1.jpg',
    route: '/news/0'
  };

  smallNewsArticles = [
    {
      id: 0,
      title: 'Spring Championship',
      highlight: 'Tournaments',
      date: '28 OCT',
      imageSrc: 'assets/images/news/news-6.jpg',
      route: '/news/0'
    },
    {
      id: 0,
      title: 'Perfect Your Swing',
      highlight: 'Coaching',
      date: '28 OCT',
      imageSrc: 'assets/images/news/news-2.jpg',
      route: '/news/0'
    },
    {
      id: 0,
      title: 'New Pro Clubs',
      highlight: 'Equipment',
      date: '28 OCT',
      imageSrc: 'assets/images/news/news-3.jpg',
      route: '/news/0'
    },
    {
      id: 0,
      title: 'Charity Golf Day',
      highlight: 'Events',
      date: '28 OCT',
      imageSrc: 'assets/images/news/news-7.jpg',
      route: '/news/0'
    }
  ];

  isLoading = true;
  error = false;

  constructor(private newsService: NewsService) {}

  ngOnInit(): void {
    this.loadLatestNews();
  }

  loadLatestNews(): void {
    this.isLoading = true;
    this.error = false;

    // Use the latest news endpoint
    this.newsService.listBlog().pipe(
      catchError(error => {
        console.error('Error loading news:', error);
        this.error = true;
        this.isLoading = false;
        // Return empty response with default structure matching your API
        return of({ code: 0, data: [], message: 'Error fetching news' });
      })
    ).subscribe(response => {
      this.isLoading = false;

      if (response && response.code === 1 && response.data && response.data.length > 0) {
        this.updateNewsDisplay(response.data);
      } else {
        // If no data or error in response, use fallback data
        console.log('Using fallback news data');
        // Keep the default news items as defined in the component
      }
    });
  }

  updateNewsDisplay(blogPosts: BlogPost[]): void {
    if (blogPosts.length > 0) {
      // Sort blog posts by date (newest first)
      const sortedPosts = [...blogPosts].sort((a, b) =>
        new Date(b.blogDate).getTime() - new Date(a.blogDate).getTime()
      );

      // Set featured news (first item)
      const featured = sortedPosts[0];
      const truncatedDesc = this.truncateDescription(featured.blogDescription, 200);

      // FIXED: Use formatImageUrl method from newsService to get correct backend image URL
      const featuredImageUrl = this.newsService.formatImageUrl(featured.blogImage);

      this.featuredNews = {
        id: featured.id,
        title: featured.blogTitle,
        highlight: featured.blogHighlight || 'Featured',
        description: featured.blogDescription,
        truncatedDescription: truncatedDesc.text,
        showReadMore: truncatedDesc.truncated,
        date: this.newsService.formatDate(featured.blogDate),
        imageSrc: featuredImageUrl || 'assets/images/news/news-1.jpg', // Use formatted URL or fallback
        route: `/news/${featured.id}`
      };

      // Set small news articles (remaining items)
      const remainingArticles = Math.min(sortedPosts.length - 1, 4);
      for (let i = 0; i < remainingArticles; i++) {
        const blog = sortedPosts[i + 1];

        // FIXED: Use formatImageUrl method from newsService for each small article
        const articleImageUrl = this.newsService.formatImageUrl(blog.blogImage);

        this.smallNewsArticles[i] = {
          id: blog.id,
          title: blog.blogTitle,
          highlight: blog.blogHighlight || 'News',
          date: this.newsService.formatDate(blog.blogDate),
          imageSrc: articleImageUrl || `assets/images/news/news-${(i % 4) + 2}.jpg`, // Use formatted URL or fallback
          route: `/news/${blog.id}`
        };
      }

      // Fill remaining slots with default data if needed
      for (let i = remainingArticles; i < 4; i++) {
        // Keep the default data for these slots
      }
    }
  }

  truncateDescription(html: string, wordLimit: number): { text: string, truncated: boolean } {
    // Remove HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';

    // Split into words and count
    const words = text.split(/\s+/);

    if (words.length <= wordLimit) {
      return { text: text, truncated: false };
    }

    // Join the first 'wordLimit' words back together
    const truncated = words.slice(0, wordLimit).join(' ') + '...';
    return { text: truncated, truncated: true };
  }

  // ENHANCED: Function to handle image errors with better fallback logic
  onImageError(event: Event, index?: number): void {
    const element = event.target as HTMLImageElement;
    console.log('Image failed to load:', element.src);

    // Try fallback images based on context
    if (index !== undefined && index >= 0 && index < 4) {
      // For small news articles
      element.src = `assets/images/news/news-${index + 2}.jpg`;
    } else {
      // For featured news
      element.src = 'assets/images/news/news-1.jpg';
    }

    // If even the fallback fails, hide the image
    element.onerror = () => {
      element.style.display = 'none';
      const container = element.closest('.news-image-container');
      if (container) {
        container.classList.add('no-image');
      }
    };
  }
}
