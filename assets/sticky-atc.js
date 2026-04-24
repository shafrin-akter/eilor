if (!customElements.get('sticky-atc')) {
  class StickyAtc extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('[data-sticky-form]');
      this.submitBtn = this.querySelector('[data-sticky-submit]');
      this.variantInput = this.querySelector('[data-sticky-variant-input]');
      this.ctaLabel = this.querySelector('[data-sticky-cta]');
      this.priceEl = this.querySelector('[data-sticky-price]');

      this.watchTarget = document.querySelector('.product__info-wrapper, .product-form, [data-product-form]');
      this._observer = null;

      if (this.watchTarget) {
        this._observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          const shouldShow = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          this.toggle(shouldShow);
        }, { rootMargin: '0px', threshold: 0 });
        this._observer.observe(this.watchTarget);
      } else {
        this.toggle(true);
      }

      if (this.form && this.submitBtn) {
        this.form.addEventListener('submit', (e) => this.onSubmit(e));
      }

      document.addEventListener('variant:change', (evt) => this.onVariantChange(evt.detail));
    }

    toggle(show) {
      if (show) {
        this.hidden = false;
        requestAnimationFrame(() => this.classList.add('is-visible'));
      } else {
        this.classList.remove('is-visible');
        setTimeout(() => {
          if (!this.classList.contains('is-visible')) this.hidden = true;
        }, 250);
      }
    }

    onVariantChange(detail) {
      if (!detail) return;
      if (detail.variantId && this.variantInput) {
        this.variantInput.value = detail.variantId;
      }
      if (this.priceEl && detail.priceHtml) {
        this.priceEl.innerHTML = detail.priceHtml;
      }
      if (this.submitBtn && this.ctaLabel) {
        if (detail.available === false) {
          this.submitBtn.disabled = true;
          this.submitBtn.setAttribute('aria-disabled', 'true');
          this.ctaLabel.textContent = detail.soldOutText || 'Sold out';
        } else {
          this.submitBtn.disabled = false;
          this.submitBtn.removeAttribute('aria-disabled');
          this.ctaLabel.textContent = detail.addText || 'Add to cart';
        }
      }
    }

    async onSubmit(evt) {
      evt.preventDefault();
      if (!this.form) return;

      const button = this.form.querySelector('button[type="submit"]');
      if (button) {
        button.setAttribute('aria-busy', 'true');
        button.classList.add('is-loading');
      }

      try {
        const body = {
          items: [
            {
              id: parseInt(this.variantInput.value, 10),
              quantity: 1,
            },
          ],
          sections: this._sectionsToRender(),
          sections_url: window.location.pathname,
        };

        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Add to cart failed');
        const data = await res.json();

        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
          cartDrawer.renderContents(data);
        }

        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { source: 'sticky-atc' } }));
      } catch (err) {
        console.error(err);
      } finally {
        if (button) {
          button.removeAttribute('aria-busy');
          button.classList.remove('is-loading');
        }
      }
    }

    _sectionsToRender() {
      const drawer = document.querySelector('cart-drawer');
      if (drawer && drawer.getSectionsToRender) {
        return drawer.getSectionsToRender().map((s) => s.id).join(',');
      }
      return 'cart-drawer,cart-icon-bubble';
    }
  }

  customElements.define('sticky-atc', StickyAtc);
}
