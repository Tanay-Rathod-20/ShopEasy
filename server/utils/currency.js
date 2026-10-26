// server/utils/currency.js
// Monetary helper functions to prevent floating-point calculation errors

/**
 * Converts Indian Rupees (e.g. 1999.50) to integer paise (199950)
 * @param {number|string} rupees
 * @returns {number} Integer paise
 */
function toPaise(rupees) {
    const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
    if (isNaN(num) || num < 0) return 0;
    return Math.round(num * 100);
}

/**
 * Converts integer paise (199950) to Indian Rupees number (1999.50)
 * @param {number} paise
 * @returns {number}
 */
function toRupees(paise) {
    if (!paise || isNaN(paise)) return 0;
    return paise / 100;
}

/**
 * Formats integer paise into Indian currency string: ₹1,999.50
 * @param {number} paise
 * @returns {string} Formatted INR string
 */
function formatINR(paise) {
    const rupees = toRupees(paise);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(rupees);
}

module.exports = {
    toPaise,
    toRupees,
    formatINR
};
