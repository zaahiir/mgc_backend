import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { RouterModule } from '@angular/router';
import { NewsService, BlogPost } from '../common-service/news/news.service';

interface NewsItem {
  id: number;
  title: string;
  date: string;
  description: string;
  imageUrl: string | null;
  hasImage: boolean;
  category?: string;
  highlight?: string;
}

@Component({
  selector: 'app-members-news',
  standalone: true,
  imports: [CommonModule, InfiniteScrollModule, RouterModule, DatePipe],
  templateUrl: './members-news.component.html',
  styleUrl: './members-news.component.css'
})
export class MembersNewsComponent implements OnInit {
  newsItems: NewsItem[] = [];
  displayedNews: NewsItem[] = [];
  batchSize: number = 6;
  loadedItemsCount: number = 0;
  allItemsLoaded: boolean = false;
  isLoading: boolean = true; // Track loading state

  constructor(private newsService: NewsService) {}

  // Make newsService accessible in template
  get baseUrl(): string {
    return this.newsService.getBaseUrl();
  }

  ngOnInit() {
    this.loadInitialNews();
  }

  loadInitialNews() {
    this.isLoading = true;
    this.newsService.listBlog().subscribe({
      next: (response) => {
        if (response.code === 1 && response.data) {
          this.newsItems = this.transformBlogPosts(response.data);
          this.loadMoreNews();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching news:', error);
        this.isLoading = false;
      }
    });
  }

  transformBlogPosts(posts: BlogPost[]): NewsItem[] {
    return posts.map(post => {
      // Use the formatImageUrl method from the service
      const imageUrl = this.newsService.formatImageUrl(post.blogImage);

      return {
        id: post.id,
        title: post.blogHighlight || post.blogTitle,
        date: post.blogDate,
        description: this.truncateToTwoLines(post.blogDescription),
        imageUrl: imageUrl,
        hasImage: !!imageUrl,
        category: post.blogTitle,
        highlight: post.blogHighlight
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  truncateToTwoLines(description: string): string {
    if (!description) return '';

    // Strip HTML tags first
    const plainText = description.replace(/<[^>]*>/g, '').trim();

    // Approximate character limit for 2 lines (adjust based on your design)
    const maxChars = 120; // Adjust this value based on your card width and font size

    if (plainText.length <= maxChars) {
      return plainText;
    }

    // Find the last space within the character limit to avoid cutting words
    let truncated = plainText.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > 0) {
      truncated = truncated.substring(0, lastSpaceIndex);
    }

    return truncated + '...';
  }

  loadMoreNews() {
    if (this.allItemsLoaded) {
      return;
    }

    const nextBatch = this.newsItems.slice(
      this.loadedItemsCount,
      this.loadedItemsCount + this.batchSize
    );

    this.displayedNews.push(...nextBatch);
    this.loadedItemsCount += nextBatch.length;

    if (this.loadedItemsCount >= this.newsItems.length) {
      this.allItemsLoaded = true;
    }
  }

  // Updated error handling to fall back to default image
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      console.log('Image failed to load:', imgElement.src);

      // Set to default news image
      imgElement.src = 'assets/images/news/default-news.jpg';

      // If default image also fails, hide the image
      imgElement.onerror = () => {
        imgElement.style.display = 'none';
        const container = imgElement.closest('.news-image-container');
        if (container) {
          container.classList.add('no-image');
        }
      };
    }
  }

  // Helper method for image error handling
  onImageError(event: any): void {
    // Set fallback image
    event.target.src = 'assets/images/news/default-news.jpg';

    // If fallback also fails, hide the image
    event.target.onerror = () => {
      event.target.style.display = 'none';
      const container = event.target.closest('.news-image-container');
      if (container) {
        container.classList.add('no-image');
      }
    };
  }
}
