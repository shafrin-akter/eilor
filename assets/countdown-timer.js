if (!customElements.get('countdown-timer')) {
  class CountdownTimer extends HTMLElement {
    constructor() {
      super();
      this.hoursEl = this.querySelector('[data-countdown-hours]');
      this.minutesEl = this.querySelector('[data-countdown-minutes]');
      this.secondsEl = this.querySelector('[data-countdown-seconds]');

      const hours = parseFloat(this.dataset.deadline) || 6;
      const sessionReset = this.dataset.sessionReset === 'true';
      const storageKey = `__dtc_countdown_${window.location.pathname}`;
      const now = Date.now();
      let deadline;

      if (sessionReset) {
        const stored = sessionStorage.getItem(storageKey);
        if (stored && Number(stored) > now) {
          deadline = Number(stored);
        } else {
          deadline = now + hours * 3600 * 1000;
          sessionStorage.setItem(storageKey, String(deadline));
        }
      } else {
        deadline = now + hours * 3600 * 1000;
      }

      this.deadline = deadline;
      this._tick();
      this._interval = setInterval(() => this._tick(), 1000);
    }

    disconnectedCallback() {
      if (this._interval) clearInterval(this._interval);
    }

    _tick() {
      const ms = Math.max(0, this.deadline - Date.now());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      if (this.hoursEl) this.hoursEl.textContent = String(h).padStart(2, '0');
      if (this.minutesEl) this.minutesEl.textContent = String(m).padStart(2, '0');
      if (this.secondsEl) this.secondsEl.textContent = String(s).padStart(2, '0');

      if (ms <= 0) {
        clearInterval(this._interval);
        this.classList.add('is-expired');
      }
    }
  }

  customElements.define('countdown-timer', CountdownTimer);
}

if (!customElements.get('live-viewers')) {
  class LiveViewers extends HTMLElement {
    constructor() {
      super();
      this.counter = this.querySelector('[data-viewer-count]');
      this.min = parseInt(this.dataset.min, 10) || 5;
      this.max = parseInt(this.dataset.max, 10) || 30;
      this._current = this._rand(this.min, this.max);
      this._render();
      this._interval = setInterval(() => this._drift(), 4000 + Math.random() * 3000);
    }

    disconnectedCallback() {
      if (this._interval) clearInterval(this._interval);
    }

    _rand(lo, hi) {
      return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }

    _drift() {
      const delta = this._rand(-2, 2);
      this._current = Math.max(this.min, Math.min(this.max, this._current + delta));
      this._render();
    }

    _render() {
      if (this.counter) this.counter.textContent = String(this._current);
    }
  }

  customElements.define('live-viewers', LiveViewers);
}
