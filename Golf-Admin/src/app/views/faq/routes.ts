import { Routes } from '@angular/router';
import { FaqComponent } from './faq/faq.component';

export const faqRoutes: Routes = [
  {
    path: '',
    component: FaqComponent,
    data: {
      title: 'FAQ Management'
    }
  }
]; 