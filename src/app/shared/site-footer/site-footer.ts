import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Translate } from '../translate';

@Component({
  selector: 'app-site-footer',
  imports: [Translate],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {}
