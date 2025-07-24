import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../default-layout/header/header.component';
import { FooterComponent } from '../default-layout/footer/footer.component';

@Component({
  selector: 'app-default-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.css'
})
export class DefaultLayoutComponent {

}
