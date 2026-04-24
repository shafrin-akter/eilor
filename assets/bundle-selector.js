if (!customElements.get('product-bundle')) {
  class ProductBundle extends HTMLElement {
    constructor() {
      super();
      this.radios = this.querySelectorAll('[data-quantity]');
      this.form = this.querySelector('[data-bundle-form]');
      this.qtyInput = this.querySelector('[data-bundle-qty-input]');
      this.variantInput = this.querySelector('[data-bundle-variant-input]');
      this.labelInput = this.querySelector('[data-bundle-label-input]');
      this.discountInput = this.querySelector('[data-bundle-discount-input]');
      this.ctaTotal = this.querySelector('[data-bundle-cta-total]');

      this.basePrice = this._resolveBasePrice();

      this.radios.forEach((radio) => {
        radio.addEventListener('change', () => this.onChange(radio));
      });

      const initiallyChecked = this.querySelector('[data-quantity]:checked') || this.radios[0];
      if (initiallyChecked) {
        initiallyChecked.checked = true;
        this.onChange(initiallyChecked);
      }

      if (this.form) {
        this.form.addEventListener('submit', (evt) => this.onSubmit(evt));
      }

      document.addEventListener('variant:change', (evt) => {
        if (evt.detail && typeof evt.detail.price === 'number') {
          this.basePrice = evt.detail.price;
        }
        if (evt.detail && evt.detail.variantId) {
          this.variantInput.value = evt.detail.variantId;
        }
        const checked = this.querySelector('[data-quantity]:checked');
        if (checked) this.onChange(checked);
        this._recalculateAll();
      });
    }

    _resolveBasePrice() {
      const option = this.querySelector('.product-bundle__option');
      if (!option) return 0;
      const totalEl = option.closest('.product-bundle__option-wrapper').querySelector('[data-bundle-total]');
      if (!totalEl) return 0;
      const radio = option.closest('.product-bundle__option-wrapper').querySelector('[data-quantity]');
      const qty = parseInt(radio.dataset.quantity, 10) || 1;
      const discount = parseFloat(radio.dataset.discount) || 0;
      const total = this._parseMoney(totalEl.textContent);
      const full = total / (1 - discount / 100);
      return Math.round(full / qty);
    }

    _parseMoney(str) {
      const n = parseFloat(String(str).replace(/[^0-9.,-]/g, '').replace(',', '.'));
      return isNaN(n) ? 0 : Math.round(n * 100);
    }

    _formatMoney(cents) {
      if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
        return window.Shopify.formatMoney(cents, window.Shopify.money_format);
      }
      return '$' + (cents / 100).toFixed(2);
    }

    _recalculateAll() {
      this.radios.forEach((radio) => {
        const wrapper = radio.closest('.product-bundle__option-wrapper');
        if (!wrapper) return;
        const qty = parseInt(radio.dataset.quantity, 10) || 1;
        const discount = parseFloat(radio.dataset.discount) || 0;
        const full = this.basePrice * qty;
        const final = Math.round(full - (full * discount) / 100);
        const perUnit = Math.round(final / qty);

        const totalEl = wrapper.querySelector('[data-bundle-total]');
        const strikeEl = wrapper.querySelector('[data-bundle-strike]');
        const perUnitEl = wrapper.querySelector('[data-bundle-per-unit]');
        if (totalEl) totalEl.textContent = this._formatMoney(final);
        if (strikeEl) strikeEl.textContent = this._formatMoney(full);
        if (perUnitEl) perUnitEl.textContent = this._formatMoney(perUnit);
      });
    }

    onChange(radio) {
      const qty = parseInt(radio.dataset.quantity, 10) || 1;
      const discount = parseFloat(radio.dataset.discount) || 0;
      const label = radio.dataset.label || '';

      this.qtyInput.value = qty;
      this.labelInput.value = label;
      this.discountInput.value = discount;

      const full = this.basePrice * qty;
      const final = Math.round(full - (full * discount) / 100);
      if (this.ctaTotal) {
        this.ctaTotal.textContent = '· ' + this._formatMoney(final);
      }
    }

    async onSubmit(evt) {
      evt.preventDefault();
      const checked = this.querySelector('[data-quantity]:checked');
      if (!checked) return;

      const qty = parseInt(checked.dataset.quantity, 10) || 1;
      const discount = parseFloat(checked.dataset.discount) || 0;
      const label = checked.dataset.label || '';

      const button = this.form.querySelector('button[type="submit"]');
      if (button) {
        button.setAttribute('aria-busy', 'true');
        button.classList.add('is-loading');
      }

      try {
        const formData = {
          items: [
            {
              id: parseInt(this.variantInput.value, 10),
              quantity: qty,
              properties: {
                _bundle: label,
                _bundle_discount: String(discount),
              },
            },
          ],
          sections: this._sectionsToRender(),
          sections_url: window.location.pathname,
        };

        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error('Add to cart failed');
        const data = await res.json();

        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
          cartDrawer.renderContents(data);
        } else {
          window.location = '/cart';
        }

        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { source: 'bundle' } }));
      } catch (err) {
        console.error(err);
        window.location = '/cart';
      } finally {
        if (button) {
          button.removeAttribute('aria-busy');
          button.classList.remove('is-loading');
        }
      }
    }

    _sectionsToRender() {
      const ids = [];
      const drawer = document.querySelector('cart-drawer');
      if (drawer && drawer.getSectionsToRender) {
        drawer.getSectionsToRender().forEach((s) => ids.push(s.id));
      } else {
        ids.push('cart-drawer', 'cart-icon-bubble');
      }
      return ids.join(',');
    }
  }

  customElements.define('product-bundle', ProductBundle);
}
