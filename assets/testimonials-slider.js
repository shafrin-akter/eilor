if (!customElements.get('testimonials-slider')) {
  class TestimonialsSlider extends HTMLElement {
    constructor() {
      super();
      this.list = this.querySelector('.testimonials-slider__list');
      this.slides = Array.from(this.querySelectorAll('.testimonials-slider__slide'));
      this.dots = Array.from(this.querySelectorAll('.testimonials-slider__dot'));
      this.prevBtn = this.querySelector('[data-direction="prev"]');
      this.nextBtn = this.querySelector('[data-direction="next"]');
      this.index = 0;
      this.autoplay = this.dataset.autoplay === 'true';
      this.interval = parseInt(this.dataset.interval, 10) || 6000;
      this._timer = null;

      this.prevBtn?.addEventListener('click', () => this.go(-1));
      this.nextBtn?.addEventListener('click', () => this.go(1));
      this.dots.forEach((dot, i) => dot.addEventListener('click', () => this.goTo(i)));

      if (this.autoplay && this.slides.length > 1) {
        this.addEventListener('mouseenter', () => this._stop());
        this.addEventListener('mouseleave', () => this._start());
        this.addEventListener('focusin', () => this._stop());
        this.addEventListener('focusout', () => this._start());
        this._start();
      }

      this._applyActive();

      // Touch swipe
      let startX = 0;
      this.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      this.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) this.go(dx < 0 ? 1 : -1);
      });
    }

    _start() {
      this._stop();
      this._timer = setInterval(() => this.go(1), this.interval);
    }

    _stop() {
      if (this._timer) clearInterval(this._timer);
      this._timer = null;
    }

    go(dir) {
      this.goTo((this.index + dir + this.slides.length) % this.slides.length);
    }

    goTo(i) {
      this.index = i;
      this._applyActive();
    }

    _applyActive() {
      this.slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === this.index);
        slide.setAttribute('aria-hidden', i === this.index ? 'false' : 'true');
      });
      this.dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === this.index);
        dot.setAttribute('aria-selected', i === this.index ? 'true' : 'false');
      });
      if (this.list) {
        this.list.style.transform = `translateX(-${this.index * 100}%)`;
      }
    }
  }

  customElements.define('testimonials-slider', TestimonialsSlider);
}
