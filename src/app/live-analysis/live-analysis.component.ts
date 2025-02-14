import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-live-analysis',
  standalone: true, 
  imports: [FormsModule],
  templateUrl: './live-analysis.component.html',
  styleUrls: ['./live-analysis.component.css']
})
export class LiveAnalysisComponent {
  @Input() liveSignals: string[] = [];
  @Input() isLoading: boolean = false;

  @Output() startLiveAnalysis = new EventEmitter<void>();

  onStartLiveAnalysis() {
    this.startLiveAnalysis.emit();
  }
}