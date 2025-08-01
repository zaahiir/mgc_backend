import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NewsService, BlogPost } from '../common-service/news/news.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface NewsItem {
  id: number;
  title: string;
  date: string;
  image: string;
  link: string;
}

interface MainArticle {
  title: string;
  date: string;
  category: string;
  image: string;
  content: {
    intro: string;
    body: string;
    quote: {
      text: string;
      author: string;
    };
  };
}

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule],
  templateUrl: './news.component.html',
  styleUrl: './news.component.css'
})
export class NewsComponent implements OnInit {
  contactEmail = 'tournament@golfclub.com';
  contactPhone = '(555) 123-4567';

  // Icons
  calendarIcon = faCalendarAlt;

  // News posts data
  latestNews: NewsItem[] = [];
  mainArticle: MainArticle | null = null;
  isLoading = true;
  error = false;

  constructor(
    private newsService: NewsService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const newsId = params['id'];
      if (newsId) {
        this.loadNewsDetails(newsId);
      } else {
        this.loadDefaultNews();
      }
    });
  }

  loadNewsDetails(newsId: string) {
    this.isLoading = true;
    this.error = false;

    this.newsService.getBlogById(newsId).subscribe({
      next: (response) => {
        if (response.code === 1 && response.data) {
          const blog = response.data;
          this.mainArticle = {
            title: blog.blogHighlight || blog.blogTitle,
            date: this.newsService.formatDate(blog.blogDate),
            category: this.newsService.extractCategory(blog),
            image: this.newsService.formatImageUrl(blog.blogImage) || 'assets/images/news/default-news.jpg',
            content: {
              intro: this.extractIntro(this.renderHtmlContent(blog.blogDescription)),
              body: this.extractBody(this.renderHtmlContent(blog.blogDescription)),
                             quote: {
                 text: this.cleanQuoteText(blog.blogQuote),
                 author: blog.blogQuoteCreator || 'MGC Team'
               }
            }
          };
        } else {
          // Blog post not found, redirect to default news page
          this.router.navigate(['/news']);
          return;
        }
        this.loadLatestNews();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading news details:', error);
        this.error = true;
        this.isLoading = false;
        this.loadLatestNews();
      }
    });
  }

  loadDefaultNews() {
    this.isLoading = true;
    this.error = false;

    // Set default main article
    this.mainArticle = {
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

    this.loadLatestNews();
    this.isLoading = false;
  }

  loadLatestNews() {
    this.newsService.getLatestNews(5).subscribe({
      next: (response) => {
        if (response.code === 1 && response.data) {
          this.latestNews = response.data.map(blog => ({
            id: blog.id,
            title: blog.blogHighlight || blog.blogTitle,
            date: this.newsService.formatDate(blog.blogDate),
            image: this.newsService.formatImageUrl(blog.blogImage) || 'assets/images/news/default-news.jpg',
            link: `/news/${blog.id}`
          }));
        }
      },
      error: (error) => {
        console.error('Error loading latest news:', error);
        // Set default latest news if API fails
        this.latestNews = [
          {
            id: 1,
            title: 'Key Golf Gadgets for the Determined',
            date: '20 Aug, 2024',
            image: 'assets/images/news/post-1.jpg',
            link: '/news/1'
          },
          {
            id: 2,
            title: 'Join our Club & Stay Updated',
            date: '19 Aug, 2024',
            image: 'assets/images/news/post-2.jpg',
            link: '/news/2'
          },
          {
            id: 3,
            title: 'Golfing on a Budget Best Public Courses',
            date: '18 Aug, 2024',
            image: 'assets/images/news/post-3.jpg',
            link: '/news/3'
          },
          {
            id: 4,
            title: 'Advanced Golf Techniques for Professionals',
            date: '17 Aug, 2024',
            image: 'assets/images/news/post-2.jpg',
            link: '/news/4'
          },
          {
            id: 5,
            title: 'Essential Equipment for New Golfers',
            date: '16 Aug, 2024',
            image: 'assets/images/news/post-3.jpg',
            link: '/news/5'
          }
        ];
      }
    });
  }

  extractIntro(description: string): string {
    if (!description) return '';
    
    // If it's HTML content, return the full content for intro
    if (this.hasHtmlContent(description)) {
      return description;
    }
    
    // For plain text, extract first two sentences
    const sentences = description.split('.');
    return sentences.slice(0, 2).join('.') + '.';
  }

  extractBody(description: string): string {
    if (!description) return '';
    
    // If it's HTML content, return empty for body since intro will contain full content
    if (this.hasHtmlContent(description)) {
      return '';
    }
    
    // For plain text, extract sentences 3-4
    const sentences = description.split('.');
    return sentences.slice(2, 4).join('.') + '.';
  }

  extractQuote(description: string): string {
    if (!description) return 'Golf is not just a game, it\'s a way of life.';
    
    // If it's HTML content, extract text from the last paragraph
    if (this.hasHtmlContent(description)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = description;
      const paragraphs = tempDiv.querySelectorAll('p');
      if (paragraphs.length > 0) {
        const lastParagraph = paragraphs[paragraphs.length - 1];
        return lastParagraph.textContent || lastParagraph.innerText || 'Golf is not just a game, it\'s a way of life.';
      }
      // If no paragraphs, get the last sentence from text content
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      const sentences = textContent.split('.');
      return sentences[sentences.length - 1] || 'Golf is not just a game, it\'s a way of life.';
    }
    
    // For plain text, extract the last sentence
    const sentences = description.split('.');
    return sentences[sentences.length - 1] || 'Golf is not just a game, it\'s a way of life.';
  }

  // Method to safely render HTML content
  renderHtmlContent(htmlContent: string): string {
    if (!htmlContent) return '';
    
    // Return the HTML content as-is for proper rendering
    return htmlContent;
  }

  // Method to safely sanitize HTML content
  sanitizeHtml(htmlContent: string): SafeHtml {
    if (!htmlContent) return '';
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  // Method to check if content has HTML tags
  hasHtmlContent(content: string): boolean {
    if (!content) return false;
    return /<[^>]*>/g.test(content);
  }

  // Method to clean quote text by removing HTML tags
  cleanQuoteText(quoteText: string | undefined): string {
    if (!quoteText) return '';
    
    // Create a temporary div to extract text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = quoteText;
    
    // Get the text content and clean it
    let cleanText = tempDiv.textContent || tempDiv.innerText || quoteText;
    
    // Remove any remaining HTML entities and clean up whitespace
    cleanText = cleanText
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Return empty string if the cleaned text is empty or only contains whitespace
    return cleanText || '';
  }
}
