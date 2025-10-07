import { LiveTranscriptionResult, UncertainWord, ConfidenceAnalysis, ProcessedResponse } from '../shared/types';

/**
 * LiveDisplayManager - Manages real-time UI updates for live transcription
 * Handles smooth text transitions, animations, and visual feedback
 */
export class LiveDisplayManager {
  private displayElement: HTMLElement;
  private statusElement: HTMLElement;
  private confidenceElement: HTMLElement;
  private isActive: boolean = false;
  private animationQueue: Array<() => void> = [];
  private currentAnimationId: number | null = null;
  private textBuffer: string = '';
  private lastUpdateTime: number = 0;
  private updateThrottle: number = 100; // Minimum ms between updates

  // Configuration
  private config = {
    animationDuration: 300,
    fadeInDelay: 50,
    scrollAnimationDuration: 200,
    maxDisplayLength: 500,
    wordHighlightDuration: 1000,
    confidenceUpdateInterval: 200
  };

  // State tracking
  private currentState: {
    isListening: boolean;
    isProcessing: boolean;
    isFinalizingResponse: boolean;
    currentTranscription: string;
    partialTranscription: string;
    confidence: number;
    uncertainWords: UncertainWord[];
    wordCount: number;
  } = {
    isListening: false,
    isProcessing: false,
    isFinalizingResponse: false,
    currentTranscription: '',
    partialTranscription: '',
    confidence: 0,
    uncertainWords: [],
    wordCount: 0
  };

  constructor(
    displayElement: HTMLElement,
    statusElement: HTMLElement,
    confidenceElement: HTMLElement,
    config?: Partial<typeof LiveDisplayManager.prototype.config>
  ) {
    this.displayElement = displayElement;
    this.statusElement = statusElement;
    this.confidenceElement = confidenceElement;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initializeDisplayManager();
  }

  /**
   * Initialize the display manager
   */
  private initializeDisplayManager(): void {
    // Set up display element for live updates
    this.displayElement.classList.add('live-display');
    
    // Add scroll behavior
    this.displayElement.style.scrollBehavior = 'smooth';
    
    // Initialize state
    this.resetState();
  }

  /**
   * Start live display mode
   */
  public startLiveDisplay(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.displayElement.classList.add('live-active');
    this.currentState.isListening = true;
    
    // Show initial listening state
    this.updateStatusDisplay('listening', 'Listening for speech...');
    this.showListeningIndicator();
  }

  /**
   * Stop live display mode
   */
  public stopLiveDisplay(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.displayElement.classList.remove('live-active');
    this.clearAnimationQueue();
    this.resetState();
  }

  /**
   * Update display with live transcription result
   */
  public updateLiveTranscription(result: LiveTranscriptionResult): void {
    if (!this.isActive) return;

    // Throttle updates to prevent overwhelming the UI
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return;
    }
    this.lastUpdateTime = now;

    // Update state
    if (result.isFinal) {
      this.currentState.currentTranscription = result.transcript;
      this.currentState.partialTranscription = '';
      this.currentState.isProcessing = true;
      this.updateStatusDisplay('processing', 'Processing speech...');
    } else {
      this.currentState.partialTranscription = result.transcript;
    }

    this.currentState.confidence = result.confidence;
    this.updateWordCount();

    // Queue display update
    this.queueDisplayUpdate();
  }

  /**
   * Update confidence analysis display
   */
  public updateConfidenceAnalysis(analysis: ConfidenceAnalysis): void {
    if (!this.isActive) return;

    this.currentState.confidence = analysis.overallConfidence;
    this.currentState.uncertainWords = analysis.uncertainWords;

    // Update confidence display with animation
    this.animateConfidenceUpdate(analysis);
    
    // Re-render text with confidence indicators
    this.queueDisplayUpdate();
  }

  /**
   * Set response finalization state
   */
  public setFinalizingResponse(isFinalizingResponse: boolean): void {
    if (!this.isActive) return;

    this.currentState.isFinalizingResponse = isFinalizingResponse;
    
    if (isFinalizingResponse) {
      this.updateStatusDisplay('finalizing', 'Finalizing response...');
      this.showFinalizingAnimation();
    }
  }

  /**
   * Show final processed response
   */
  public showFinalResponse(response: ProcessedResponse): void {
    if (!this.isActive) return;

    // Animate transition to final response
    this.animateToFinalResponse(response);
    
    // Update status
    this.updateStatusDisplay('completed', 'Response captured');
    
    // Stop live display after animation
    setTimeout(() => {
      this.stopLiveDisplay();
    }, this.config.animationDuration);
  }

  /**
   * Show error state
   */
  public showError(message: string, isRecoverable: boolean = true): void {
    if (!this.isActive) return;

    this.updateStatusDisplay('error', message);
    this.showErrorAnimation();

    if (isRecoverable) {
      // Auto-recover after a delay
      setTimeout(() => {
        this.updateStatusDisplay('listening', 'Listening for speech...');
        this.showListeningIndicator();
      }, 3000);
    }
  }

  /**
   * Queue a display update to be processed
   */
  private queueDisplayUpdate(): void {
    this.animationQueue.push(() => this.performDisplayUpdate());
    this.processAnimationQueue();
  }

  /**
   * Process the animation queue
   */
  private processAnimationQueue(): void {
    if (this.currentAnimationId || this.animationQueue.length === 0) {
      return;
    }

    const nextAnimation = this.animationQueue.shift();
    if (nextAnimation) {
      this.currentAnimationId = requestAnimationFrame(() => {
        nextAnimation();
        this.currentAnimationId = null;
        
        // Process next animation if available
        if (this.animationQueue.length > 0) {
          setTimeout(() => this.processAnimationQueue(), this.config.fadeInDelay);
        }
      });
    }
  }

  /**
   * Perform the actual display update
   */
  private performDisplayUpdate(): void {
    const displayContent = this.buildDisplayContent();
    
    // Animate content change
    this.animateContentChange(displayContent);
    
    // Update confidence display
    this.updateConfidenceDisplay();
    
    // Auto-scroll if needed
    this.autoScrollToBottom();
  }

  /**
   * Build the display content HTML
   */
  private buildDisplayContent(): string {
    let content = '';

    // Add final transcription
    if (this.currentState.currentTranscription) {
      content += this.formatTextWithConfidence(
        this.currentState.currentTranscription,
        true,
        this.currentState.uncertainWords
      );
    }

    // Add partial transcription
    if (this.currentState.partialTranscription) {
      if (content) content += ' ';
      content += this.formatTextWithConfidence(
        this.currentState.partialTranscription,
        false,
        []
      );
      
      // Add typing indicator for partial text
      if (!this.currentState.isFinalizingResponse) {
        content += '<span class="typing-indicator">...</span>';
      }
    }

    // Show listening state if no content
    if (!content && this.currentState.isListening) {
      content = '<span class="listening-prompt">Listening...</span>';
    }

    return content;
  }

  /**
   * Format text with confidence indicators
   */
  private formatTextWithConfidence(
    text: string,
    isFinal: boolean,
    uncertainWords: UncertainWord[]
  ): string {
    if (!text) return '';

    const words = text.split(/\s+/);
    const className = isFinal ? 'final-text' : 'partial-text';
    
    if (uncertainWords.length === 0) {
      return `<span class="${className}">${this.escapeHtml(text)}</span>`;
    }

    let formattedWords = words.map((word, index) => {
      const uncertainWord = uncertainWords.find(uw => 
        uw.position === index || uw.word.toLowerCase() === word.toLowerCase()
      );

      if (uncertainWord) {
        const riskClass = uncertainWord.severity === 'high' ? 'high-risk' : '';
        const confidenceClass = this.getConfidenceClass(uncertainWord.confidence);
        const tooltip = `Confidence: ${Math.round(uncertainWord.confidence * 100)}% - ${uncertainWord.reason}`;
        
        return `<span class="uncertain-word ${riskClass}" title="${tooltip}">
          ${this.escapeHtml(word)}
          <span class="confidence-indicator ${confidenceClass}"></span>
        </span>`;
      }

      return this.escapeHtml(word);
    });

    return `<span class="${className}">${formattedWords.join(' ')}</span>`;
  }

  /**
   * Animate content change
   */
  private animateContentChange(newContent: string): void {
    // Fade out current content
    this.displayElement.style.opacity = '0.7';
    this.displayElement.style.transform = 'translateY(2px)';
    
    setTimeout(() => {
      // Update content
      this.displayElement.innerHTML = newContent;
      
      // Fade in new content
      this.displayElement.style.opacity = '1';
      this.displayElement.style.transform = 'translateY(0)';
      
      // Add fade-in animation to new elements
      const newElements = this.displayElement.querySelectorAll('.partial-text, .final-text');
      newElements.forEach((element, index) => {
        (element as HTMLElement).style.animationDelay = `${index * 50}ms`;
        element.classList.add('fade-in');
      });
    }, this.config.fadeInDelay);
  }

  /**
   * Update status display
   */
  private updateStatusDisplay(status: string, message: string): void {
    // Update status indicator
    const indicator = this.statusElement.querySelector('.status-indicator');
    if (indicator) {
      indicator.className = `status-indicator ${status}`;
    }

    // Update status text
    const statusText = this.statusElement.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = message;
    }
  }

  /**
   * Update confidence display
   */
  private updateConfidenceDisplay(): void {
    if (!this.confidenceElement) return;

    const confidence = Math.round(this.currentState.confidence * 100);
    
    // Update confidence bar
    const confidenceFill = this.confidenceElement.querySelector('.confidence-fill') as HTMLElement;
    if (confidenceFill) {
      confidenceFill.style.width = `${confidence}%`;
      confidenceFill.style.transition = `width ${this.config.confidenceUpdateInterval}ms ease`;
    }

    // Update confidence percentage
    const confidencePercentage = this.confidenceElement.querySelector('.confidence-percentage');
    if (confidencePercentage) {
      confidencePercentage.textContent = `${confidence}%`;
    }

    // Update word count
    const wordCount = this.confidenceElement.querySelector('.word-count');
    if (wordCount) {
      const plural = this.currentState.wordCount !== 1 ? 's' : '';
      wordCount.textContent = `${this.currentState.wordCount} word${plural}`;
    }
  }

  /**
   * Animate confidence update
   */
  private animateConfidenceUpdate(analysis: ConfidenceAnalysis): void {
    // Animate confidence bar
    const confidenceFill = this.confidenceElement.querySelector('.confidence-fill') as HTMLElement;
    if (confidenceFill) {
      const targetWidth = Math.round(analysis.overallConfidence * 100);
      
      // Add pulse animation for significant changes
      const currentWidth = parseInt(confidenceFill.style.width) || 0;
      if (Math.abs(targetWidth - currentWidth) > 10) {
        confidenceFill.classList.add('confidence-pulse');
        setTimeout(() => {
          confidenceFill.classList.remove('confidence-pulse');
        }, 500);
      }
    }

    // Highlight uncertain words briefly
    setTimeout(() => {
      const uncertainElements = this.displayElement.querySelectorAll('.uncertain-word');
      uncertainElements.forEach(element => {
        element.classList.add('highlight-uncertain');
        setTimeout(() => {
          element.classList.remove('highlight-uncertain');
        }, this.config.wordHighlightDuration);
      });
    }, 100);
  }

  /**
   * Auto-scroll to bottom if needed
   */
  private autoScrollToBottom(): void {
    const shouldScroll = this.displayElement.scrollHeight > this.displayElement.clientHeight;
    
    if (shouldScroll) {
      // Smooth scroll to bottom
      this.displayElement.scrollTo({
        top: this.displayElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }

  /**
   * Show listening indicator animation
   */
  private showListeningIndicator(): void {
    const indicator = this.statusElement.querySelector('.status-indicator');
    if (indicator) {
      indicator.classList.add('pulse-animation');
    }
  }

  /**
   * Show finalizing animation
   */
  private showFinalizingAnimation(): void {
    this.displayElement.classList.add('finalizing');
    
    setTimeout(() => {
      this.displayElement.classList.remove('finalizing');
    }, this.config.animationDuration * 2);
  }

  /**
   * Show error animation
   */
  private showErrorAnimation(): void {
    this.displayElement.classList.add('error-shake');
    
    setTimeout(() => {
      this.displayElement.classList.remove('error-shake');
    }, 600);
  }

  /**
   * Animate transition to final response
   */
  private animateToFinalResponse(response: ProcessedResponse): void {
    // Fade out live content
    this.displayElement.style.opacity = '0.5';
    
    setTimeout(() => {
      // Clear live content and show final response
      this.displayElement.innerHTML = this.formatFinalResponse(response);
      this.displayElement.classList.remove('live');
      this.displayElement.classList.add('final-response');
      
      // Fade in final response
      this.displayElement.style.opacity = '1';
      this.displayElement.style.transform = 'scale(1.02)';
      
      setTimeout(() => {
        this.displayElement.style.transform = 'scale(1)';
      }, this.config.animationDuration);
    }, this.config.animationDuration / 2);
  }

  /**
   * Format final response for display
   */
  private formatFinalResponse(response: ProcessedResponse): string {
    const confidenceIndicator = response.confidence < 0.8 
      ? `<span class="confidence-warning" title="Low confidence: ${Math.round(response.confidence * 100)}%">⚠</span>`
      : '';
    
    return `<div class="final-response-content">
      <span class="response-value">${this.formatResponseValue(response)}</span>
      ${confidenceIndicator}
    </div>`;
  }

  /**
   * Format response value based on type
   */
  private formatResponseValue(response: ProcessedResponse): string {
    switch (response.responseType) {
      case 'yes':
        return 'Yes';
      case 'no':
        return 'No';
      case 'not_applicable':
        return 'Not Applicable';
      case 'date_time':
        if (response.parsedValue instanceof Date) {
          return response.parsedValue.toLocaleDateString() + ' ' + response.parsedValue.toLocaleTimeString();
        }
        return response.parsedValue?.toString() || response.rawText;
      case 'unclear':
        return `Unclear: "${response.rawText}"`;
      default:
        return response.rawText;
    }
  }

  /**
   * Update word count
   */
  private updateWordCount(): void {
    const allText = (this.currentState.currentTranscription + ' ' + this.currentState.partialTranscription).trim();
    this.currentState.wordCount = allText ? allText.split(/\s+/).filter(w => w.length > 0).length : 0;
  }

  /**
   * Get confidence class for styling
   */
  private getConfidenceClass(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear animation queue
   */
  private clearAnimationQueue(): void {
    this.animationQueue = [];
    if (this.currentAnimationId) {
      cancelAnimationFrame(this.currentAnimationId);
      this.currentAnimationId = null;
    }
  }

  /**
   * Reset state
   */
  private resetState(): void {
    this.currentState = {
      isListening: false,
      isProcessing: false,
      isFinalizingResponse: false,
      currentTranscription: '',
      partialTranscription: '',
      confidence: 0,
      uncertainWords: [],
      wordCount: 0
    };
    
    this.textBuffer = '';
    this.lastUpdateTime = 0;
  }

  /**
   * Get current state (for debugging/testing)
   */
  public getCurrentState(): typeof this.currentState {
    return { ...this.currentState };
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): typeof this.config {
    return { ...this.config };
  }
}