// public/js/cart.js
// Client-side cart manager & badge updater

const cartManager = {
    async updateBadge() {
        const badge = document.getElementById('cart-count');
        if (!badge) return;

        if (!auth.isLoggedIn()) {
            badge.textContent = '0';
            return;
        }

        try {
            const data = await api.getCart();
            if (data.success && data.cart) {
                badge.textContent = data.cart.total_items || 0;
            }
        } catch (err) {
            // Silently ignore if session expired
            badge.textContent = '0';
        }
    },

    async addItem(productId, quantity = 1, productName = 'Product') {
        if (!auth.isLoggedIn()) {
            showToast('Please log in to add items to your cart.', 'info');
            setTimeout(() => {
                window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            }, 1000);
            return false;
        }

        try {
            const res = await api.addToCart(productId, quantity);
            if (res.success) {
                showToast(res.message || `Added "${productName}" to cart!`, 'success');
                await this.updateBadge();
                window.dispatchEvent(new CustomEvent('cart:updated'));
                return true;
            }
        } catch (err) {
            showToast(err.message || 'Failed to add item to cart.', 'error');
            return false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    cartManager.updateBadge();
});

window.addEventListener('auth:login', () => {
    cartManager.updateBadge();
});

window.addEventListener('auth:logout', () => {
    cartManager.updateBadge();
});

window.cartManager = cartManager;
