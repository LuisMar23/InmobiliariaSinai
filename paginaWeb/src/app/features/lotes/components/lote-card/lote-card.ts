import { Component, Input } from '@angular/core';
import { Lote } from '../../../../core/interfaces/datos.interface';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-lote-card',
  imports: [CommonModule,RouterModule],
  templateUrl: './lote-card.html',
  styleUrl: './lote-card.css',
})
export class LoteCard {

  urlServer=environment.fileServer;

  @Input() lote!: Lote;
}
