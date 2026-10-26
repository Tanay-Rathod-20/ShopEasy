// public/js/api.js
// Centralized API client wrapper with authentication header support

const API_BASE = '/api';

const api = {
    /**
     * Get stored JWT token
     */
    getToken() {
        return localStorage.getItem('shopeasy_token');
    },

    /**
     * Core fetch wrapper
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                // If 401 Unauthorized and was authenticated, session might be expired
                if (response.status === 401 && token && !endpoint.includes('/auth/login')) {
                    localStorage.removeItem('shopeasy_token');
                    localStorage.removeItem('shopeasy_user');
                    window.dispatchEvent(new CustomEvent('auth:expired'));
                }
                const error = new Error(data.message || `Request failed with status ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            if (err.status) throw err;
            throw new Error(err.message || 'Network connection failed. Please check your internet connection.');
        }
    },

    // --- Products & Categories ---
    getProducts(params = {}) {
        const query = new URLSearchParams();
        if (params.category) query.append('category', params.category);
        if (params.search) query.append('search', params.search);
        if (params.page) query.append('page', params.page);
        if (params.limit) query.append('limit', params.limit);
        const qs = query.toString();
        return this.request(`/products${qs ? '?' + qs : ''}`);
    },

    getProduct(id) {
        return this.request(`/products/${id}`);
    },

    getCategories() {
        return this.request('/categories');
    },

    // --- Authentication ---
    login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    register(name, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    },

    getMe() {
        return this.request('/auth/me');
    },

    // --- Cart ---
    getCart() {
        return this.request('/cart');
    },

    addToCart(productId, quantity = 1) {
        return this.request('/cart', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
        });
    },

    updateCartItem(cartItemId, quantity) {
        return this.request(`/cart/${cartItemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });
    },

    removeCartItem(cartItemId) {
        return this.request(`/cart/${cartItemId}`, {
            method: 'DELETE'
        });
    },

    clearCart() {
        return this.request('/cart', {
            method: 'DELETE'
        });
    },

    // --- Orders ---
    createOrder(orderData) {
        return this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    getOrders() {
        return this.request('/orders');
    },

    getOrder(id) {
        return this.request(`/orders/${id}`);
    }
};

window.api = api;
