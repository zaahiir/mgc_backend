import { Component } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.css'
})

export class LoaderComponent {
  public show: boolean = true;

  constructor() {
    setTimeout(() => {
      this.show = false;
    }, 3000);
  }
}
