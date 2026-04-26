import correctSfx from '../sounds/correct.wav';
import wrongSfx from '../sounds/wrong.wav';
import clickSfx from '../sounds/click.wav';

class SoundService {
  private volume: number = 0.5;
  private enabled: number = 1; // Use 1/0 for easier state management or just boolean

  setVolume(v: number) {
    this.volume = v;
  }

  setEnabled(e: boolean) {
    this.enabled = e ? 1 : 0;
  }

  playCorrect() {
    this.play(correctSfx);
  }

  playWrong() {
    this.play(wrongSfx);
  }

  playClick() {
    this.play(clickSfx, 0.4); // Click slightly quieter by default
  }

  private play(src: string, volMultiplier: number = 1) {
    if (!this.enabled) return;
    const audio = new Audio(src);
    audio.volume = this.volume * volMultiplier;
    audio.play().catch(() => {});
  }
}

export const soundService = new SoundService();
