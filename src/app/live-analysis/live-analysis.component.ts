import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ProgressBarModule } from 'primeng/progressbar';

interface Signal {
  type: string;
  message: string;
  consecutiveCandles?: number;
  dropPercent?: string;
  reversalChance?: string;
  expectedReversalPercent?: string;
  time: Date;
  startPrice?: number;
  lowestPrice?: number;
  currentPrice?: number;
  reversalPercent?: string;
  fromStartPercent?: string;
  candlesSinceReversal?: number;
  finalReversalPercent?: string;  
  totalCandles?: number;
  finalPrice?: number;
  historicalData?: {
    totalSimilarPatterns: number;
    successfulReversals: number;
  };
}

@Component({
  selector: 'app-live-analysis',
  standalone: true, 
  imports: [CommonModule, FormsModule, ButtonModule, TableModule, ToastModule, ProgressBarModule], 
  templateUrl: './live-analysis.component.html',
  styleUrls: ['./live-analysis.component.css'],
  providers: [MessageService]
})
export class LiveAnalysisComponent implements OnInit {
  @Input() isLiveAnalysisRunning: boolean = false;
  @Input() liveSignals: Signal[] = [];
  @Input() isLoading: boolean = false;
  @Input() selectedSymbol: string = '';
  @Input() timeFrame: string = '';
  
  @Output() startLiveAnalysis = new EventEmitter<void>();
  @Output() stopLiveAnalysis = new EventEmitter<void>();
  @Output() clearSignals = new EventEmitter<void>();

  activeReversals: Signal[] = [];
  alertsEnabled: boolean = true;
  soundEnabled: boolean = true;
  
  constructor(private messageService: MessageService) {}
  
  ngOnInit(): void {
    document.body.classList.add('live-analysis-active');
  }
  
  ngOnDestroy(): void {
    document.body.classList.remove('live-analysis-active');
  }
  
  onStartLiveAnalysis() {
    this.startLiveAnalysis.emit();
  }

  onStopLiveAnalysis() {
    this.stopLiveAnalysis.emit();
  }

  onClearSignals() {
    this.clearSignals.emit();
    this.activeReversals = [];
  }
  
  processNewSignal(signal: Signal) {
    if (signal.type === 'ReversalSignal') {
      this.activeReversals.push(signal);
      this.showSignalNotification(signal);
    } 
    else if (signal.type === 'ReversalUpdate') {
      const updatedIndex = this.activeReversals.findIndex(
        r => r.startPrice === signal.startPrice && r.lowestPrice === signal.lowestPrice
      );
      
      if (updatedIndex >= 0) {
        this.activeReversals[updatedIndex] = {
          ...this.activeReversals[updatedIndex],
          currentPrice: signal.currentPrice,
          reversalPercent: signal.reversalPercent,
          fromStartPercent: signal.fromStartPercent,
          candlesSinceReversal: signal.candlesSinceReversal,
          time: signal.time
        };
      }
    }
    else if (signal.type === 'ReversalComplete') {
      this.activeReversals = this.activeReversals.filter(
        r => !(r.startPrice === signal.startPrice && r.lowestPrice === signal.lowestPrice)
      );
      
      const completionMessage = `Розворот завершено! ${signal.finalReversalPercent || signal.reversalPercent} від мінімуму`;
      
      this.showSignalNotification({
        ...signal,
        message: completionMessage
      });
    }
    else if (signal.type === 'Signal') {
      this.showSignalNotification(signal);
    }
  }
  
  getReversalPercentValue(percent: string | undefined): number {
    if (!percent) return 0;
    return parseFloat(percent.replace('%', ''));
  }
  
  showSignalNotification(signal: Signal) {
    if (this.alertsEnabled) {
      let severity = 'info';
      let summary = 'Інформація';
      
      if (signal.type === 'Signal') {
        severity = 'warn';
        summary = 'Потенційний сигнал';
      } else if (signal.type === 'ReversalSignal') {
        severity = 'success';
        summary = 'Початок розвороту';
      } else if (signal.type === 'ReversalComplete') {
        severity = 'success';
        summary = 'Розворот завершено';
      }
      
      this.messageService.add({
        severity: severity,
        summary: summary,
        detail: signal.message,
        life: 5000
      });
    }
    
    if (this.soundEnabled) {
      this.playAlertSound();
    }
  }
  
  getReversalChanceValue(chance: string | undefined): number {
    if (!chance) return 0;
    return parseFloat(chance.replace('%', ''));
  }
  
  private playAlertSound() {
    try {
      const audio = new Audio('assets/sounds/alert.mp3');
      audio.play();
    } catch (error) {
      console.error('Could not play alert sound:', error);
    }
  }
}