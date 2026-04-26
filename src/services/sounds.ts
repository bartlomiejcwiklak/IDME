import correctSfx from '../sounds/correct.wav';
import wrongSfx from '../sounds/wrong.wav';
import clickSfx from '../sounds/click.wav';

class SoundService {
  private volume: number = 0.5;

  setVolume(v: number) {
    this.volume = v;
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
    const audio = new Audio(src);
    audio.volume = this.volume * volMultiplier;
    audio.play().catch(() => {
      // Browsers often block audio until first interaction, 
      // which is fine for sfx as they happen after interaction anyway.
    });
  }
}

export const soundService = new SoundService();
