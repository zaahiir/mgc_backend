import { Component, OnInit  } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrollService } from './services/scroll.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  title = 'master-golf';
  constructor(private scrollService: ScrollService) {} 
  

  ngOnInit(): void {
    
  }
}
