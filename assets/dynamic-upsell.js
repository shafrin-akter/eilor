if (!customElements.get('dynamic-upsell')) {
  class DynamicUpsell extends HTMLElement {
    constructor() {
      super();
      this.listEl = this.querySelector('[data-upsell-list]');
      this.emptyEl = this.querySelector('[data-upsell-empty]');
      this.template = this.querySelector('[data-upsell-template]');
      this.limit = parseInt(this.dataset.limit, 10) || 4;
      this.intent = this.dataset.intent || 'complementary';
      this.fallbackHandle = this.dataset.fallbackProduct || '';
      this._currentSeed = null;
      this._inflight = null;

      document.addEventListener('cart:updated', () => this.refresh());
      document.addEventListener('DOMContentLoaded', () => this.refresh());
      this.refresh();
    }

    async refresh() {
      const cart = await this._getCart();
      let seedProductId = null;
      let seedVariantIds = [];

      if (cart && cart.items && cart.items.length) {
        seedProductId = cart.items[0].product_id;
        seedVariantIds = cart.items.map((i) => i.variant_id);
      } else if (this.fallbackHandle) {
        seedProductId = await this._resolveProductIdFromHandle(this.fallbackHandle);
      }

      if (!seedProductId) {
        this._renderEmpty();
        return;
      }

      if (this._currentSeed === `${this.intent}:${seedProductId}:${seedVariantIds.join(',')}`) {
        return;
      }
      this._currentSeed = `${this.intent}:${seedProductId}:${seedVariantIds.join(',')}`;

      try {
        const products = await this._fetchRecommendations(seedProductId);
        const filtered = products.filter((p) => !seedVariantIds.includes(p.variants?.[0]?.id));
        this._render(filtered.slice(0, this.limit));
      } catch (err) {
        console.error('[dynamic-upsell]', err);
        this._renderEmpty();
      }
    }

    async _getCart() {
      try {
        const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    }

    async _fetchRecommendations(productId) {
      if (this._inflight) this._inflight.abort?.();
      const controller = new AbortController();
      this._inflight = controller;

      const url = `/recommendations/products.json?product_id=${productId}&limit=${this.limit + 2}&intent=${this.intent}`;
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Recommendations fetch failed');
      const data = await res.json();
      return Array.isArray(data.products) ? data.products : [];
    }

    async _resolveProductIdFromHandle(handle) {
      try {
        const res = await fetch(`/products/${handle}.js`, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;
        const product = await res.json();
        return product.id;
      } catch {
        return null;
      }
    }

    _renderEmpty() {
      if (this.listEl) {
        this.listEl.hidden = true;
        this.listEl.innerHTML = '';
      }
      if (this.emptyEl) this.emptyEl.hidden = false;
    }

    _render(products) {
      if (!this.listEl || !this.template) return;

      if (!products.length) {
        this._renderEmpty();
        return;
      }

      if (this.emptyEl) this.emptyEl.hidden = true;
      this.listEl.hidden = false;
      this.listEl.innerHTML = '';

      const formatter = new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
        style: 'currency',
        currency: (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD',
      });

      products.forEach((p) => {
        const fragment = this.template.content.cloneNode(true);

        const imageEl = fragment.querySelector('[data-upsell-image]');
        if (imageEl && p.featured_image) {
          imageEl.src = p.featured_image.replace(/\.(jpg|jpeg|png|webp|gif)(\?|$)/, '_200x200.$1$2');
          imageEl.alt = p.title || '';
        }

        const imageLink = fragment.querySelector('[data-upsell-link]');
        if (imageLink) imageLink.href = p.url;

        const titleLink = fragment.querySelector('[data-upsell-title-link]');
        if (titleLink) {
          titleLink.href = p.url;
          titleLink.textContent = p.title;
        }

        const priceEl = fragment.querySelector('[data-upsell-price]');
        if (priceEl) {
          const price = typeof p.price === 'number' ? p.price / 100 : parseFloat(p.price);
          priceEl.textContent = formatter.format(price);
        }

        const variantInput = fragment.querySelector('[data-upsell-variant-input]');
        if (variantInput && p.variants && p.variants.length) {
          variantInput.value = p.variants[0].id;
        }

        const form = fragment.querySelector('[data-upsell-form]');
        if (form) form.addEventListener('submit', (e) => this._onAdd(e, form));

        this.listEl.appendChild(fragment);
      });
    }

    async _onAdd(evt, form) {
      evt.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const originalLabel = button?.querySelector('.upsell-card__button-label')?.textContent;

      if (button) {
        button.disabled = true;
        button.classList.add('is-loading');
        const lbl = button.querySelector('.upsell-card__button-label');
        if (lbl) lbl.textContent = 'Adding…';
      }

      try {
        const body = {
          items: [{ id: parseInt(form.querySelector('[data-upsell-variant-input]').value, 10), quantity: 1 }],
          sections: this._sectionsToRender(),
          sections_url: window.location.pathname,
        };
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Add failed');
        const data = await res.json();

        const drawer = document.querySelector('cart-drawer');
        if (drawer && typeof drawer.renderContents === 'function') {
          drawer.renderContents(data);
        }

        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { source: 'upsell' } }));

        if (button) {
          const lbl = button.querySelector('.upsell-card__button-label');
          if (lbl) lbl.textContent = 'Added ✓';
          setTimeout(() => {
            if (lbl && originalLabel) lbl.textContent = originalLabel;
            button.disabled = false;
            button.classList.remove('is-loading');
          }, 1200);
        }
      } catch (err) {
        console.error(err);
        if (button) {
          button.disabled = false;
          button.classList.remove('is-loading');
          const lbl = button.querySelector('.upsell-card__button-label');
          if (lbl && originalLabel) lbl.textContent = originalLabel;
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

  customElements.define('dynamic-upsell', DynamicUpsell);
}
