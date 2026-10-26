// public/js/auth.js
// Authentication manager & Navbar state sync

const auth = {
    TOKEN_KEY: 'shopeasy_token',
    USER_KEY: 'shopeasy_user',

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    getUser() {
        try {
            const raw = localStorage.getItem(this.USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    setSession(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.updateNav();
        window.dispatchEvent(new CustomEvent('auth:login', { detail: user }));
    },

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.updateNav();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        showToast('You have been logged out.', 'info');
        // If on a protected page, redirect to login
        if (window.location.pathname.includes('/cart.html') || 
            window.location.pathname.includes('/checkout.html') || 
            window.location.pathname.includes('/orders.html') ||
            window.location.pathname.includes('/admin.html')) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 600);
        }
    },

    updateNav() {
        const authContainer = document.getElementById('nav-auth-container');
        if (!authContainer) return;

        if (this.isLoggedIn()) {
            const user = this.getUser();
            const displayName = user ? user.name.split(' ')[0] : 'Account';
            const adminLink = user && user.role === 'admin' ? `<li><a href="/admin.html" class="nav-link">Admin</a></li>` : '';

            authContainer.innerHTML = `
                ${adminLink}
                <li><a href="/orders.html" class="nav-link">Orders</a></li>
                <li class="nav-user-menu">
                    <span class="user-greeting">Hi, <strong>${escapeHTML(displayName)}</strong></span>
                    <button type="button" class="btn-logout" id="btn-nav-logout" title="Log out">Logout</button>
                </li>
            `;

            const logoutBtn = document.getElementById('btn-nav-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            }
        } else {
            authContainer.innerHTML = `
                <li><a href="/login.html" class="nav-link" id="nav-login-link">Login</a></li>
            `;
        }
    }
};

// Simple HTML escaping to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Reusable Toast Notification
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Initialize nav on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    auth.updateNav();
});

window.auth = auth;
window.showToast = showToast;
window.escapeHTML = escapeHTML;
