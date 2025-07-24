import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface BlogPost {
  id: number;
  blogDate: string;
  blogTitle: string;
  blogHighlight: string;
  blogDescription: string;
  blogImage: string;
  hideStatus: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogResponse {
  code: number;
  data: BlogPost[];
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl: string;
  private baseUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private latestNews: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);

    // Fixed: Extract base URL properly for media files
    // Remove '/api' or '/apis' from the end and ensure no trailing slash
    this.baseUrl = this.apiUrl.replace(/\/api[s]?\/?$/, '');

    this.lists = this.apiUrl + "blog/0/listing/";
    this.processing = this.apiUrl + "blog/0/processing/";
    this.deletion = this.apiUrl + "blog/0/deletion/";
    this.latestNews = this.apiUrl + "blog/latest/5/";
  }

  // Public getter for base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }

  listBlog(id: string = '0'): Observable<BlogResponse> {
    return from(axios.get(this.lists.replace('0', id))).pipe(
      map(response => response.data)
    );
  }

  getLatestNews(count: number = 5): Observable<BlogResponse> {
    return from(axios.get(this.lists)).pipe(
      map(response => {
        const data = response.data;
        if (data && data.data && Array.isArray(data.data)) {
          data.data = data.data
            .sort((a: BlogPost, b: BlogPost) => new Date(b.blogDate).getTime() - new Date(a.blogDate).getTime())
            .slice(0, count);
        }
        return data;
      })
    );
  }

  processBlog(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  deleteBlog(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  // Fixed: Updated image URL formatting to handle Django media URLs correctly
  formatImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    // If already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Handle Django media URLs - the backend returns "/media/blog_images/filename.ext"
    if (imageUrl.startsWith('/media/')) {
      // Simply append to base URL since the path already starts with /media/
      return `${this.baseUrl}${imageUrl}`;
    }

    // Handle relative paths without /media/ prefix
    if (imageUrl.startsWith('blog_images/')) {
      return `${this.baseUrl}/media/${imageUrl}`;
    }

    // For other relative paths
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `${day} ${month}`;
  }

  // Extract category from blog highlight or use default
  extractCategory(blog: BlogPost): string {
    if (blog.blogHighlight) {
      const firstWord = blog.blogHighlight.split(' ')[0];
      if (firstWord && firstWord.length > 3 && firstWord.length < 15) {
        return firstWord;
      }
    }
    return 'General';
  }
}
