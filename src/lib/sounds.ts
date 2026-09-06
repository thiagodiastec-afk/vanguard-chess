class SoundManager {
  private moveSound: HTMLAudioElement;
  private captureSound: HTMLAudioElement;
  private checkSound: HTMLAudioElement;
  private isEnabled: boolean = true;

  constructor() {
    this.moveSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
    this.captureSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');
    this.checkSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3');
    
    // Load setting from local storage
    const saved = localStorage.getItem('chess-sound-enabled');
    if (saved !== null) {
      this.isEnabled = saved === 'true';
    }
  }

  toggleSound(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('chess-sound-enabled', String(enabled));
  }

  getSoundEnabled() {
    return this.isEnabled;
  }

  playMove(isCapture: boolean, isCheck: boolean) {
    if (!this.isEnabled) return;
    
    try {
      if (isCheck) {
        this.checkSound.currentTime = 0;
        this.checkSound.play().catch(e => console.error("Audio play blocked", e));
      } else if (isCapture) {
        this.captureSound.currentTime = 0;
        this.captureSound.play().catch(e => console.error("Audio play blocked", e));
      } else {
        this.moveSound.currentTime = 0;
        this.moveSound.play().catch(e => console.error("Audio play blocked", e));
      }
    } catch (error) {
      console.error("Error playing sound", error);
    }
  }
}

export const sounds = new SoundManager();
