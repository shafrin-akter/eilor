/**
 * Bridges Dawn's internal pubsub to DOM CustomEvents consumed by the custom DTC
 * components (sticky-atc, product-bundle, dynamic-upsell).
 *
 * Translates:
 *   PUB_SUB_EVENTS.variantChange  -> document "variant:change"
 *   PUB_SUB_EVENTS.cartUpdate     -> document "cart:updated"
 */
(function () {
  if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS !== 'object') return;

  subscribe(PUB_SUB_EVENTS.variantChange, (payload) => {
    const variant = payload?.data?.variant;
    if (!variant) return;
    const html = payload.data.html;
    const priceEl = html ? html.getElementById(`price-${payload.data.sectionId}`) : null;
    document.dispatchEvent(
      new CustomEvent('variant:change', {
        detail: {
          variantId: variant.id,
          price: variant.price,
          available: variant.available,
          priceHtml: priceEl ? priceEl.innerHTML : null,
          addText: window.variantStrings?.addToCart,
          soldOutText: window.variantStrings?.soldOut,
        },
      })
    );
  });

  subscribe(PUB_SUB_EVENTS.cartUpdate, (payload) => {
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: payload }));
  });
})();
