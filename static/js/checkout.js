function getApiUrl() {
    if (window.API_URL) return window.API_URL;
    const hostname = window.location.hostname || "localhost";
    if (hostname === "localhost" || hostname === "127.0.0.1" || window.location.port === "1313" || window.location.port === "8181") {
        return `http://${hostname}:8088/api`;
    }
    return "/api";
}
const API_URL = getApiUrl();

function openCheckout(tierId) {
    document.getElementById('checkout-tier').value = tierId;
    document.getElementById('checkout-modal').style.display = 'flex';
    document.getElementById('checkout-error').style.display = 'none';
}

function closeCheckout() {
    document.getElementById('checkout-modal').style.display = 'none';
    document.getElementById('checkout-form').reset();
}

async function submitCheckout(event) {
    event.preventDefault();
    
    const tierId = document.getElementById('checkout-tier').value;
    const name = document.getElementById('checkout-name').value;
    const email = document.getElementById('checkout-email').value;
    
    const submitBtn = document.getElementById('checkout-submit-btn');
    const btnText = document.getElementById('checkout-btn-text');
    const btnLoading = document.getElementById('checkout-btn-loading');
    const errorDiv = document.getElementById('checkout-error');
    
    // UI Loading state
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/auth/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tier_code: tierId,
                name: name,
                email: email
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error?.message || data.error || 'Failed to initiate subscription';
            throw new Error(errorMsg);
        }

        if (data.checkout_url) {
            window.location.href = data.checkout_url;
        } else {
            throw new Error('No checkout URL received from server');
        }
        
    } catch (error) {
        console.error('Subscription error:', error);
        errorDiv.textContent = error.message || 'An unexpected error occurred. Please try again.';
        errorDiv.style.display = 'block';
        
        // Reset UI Loading state
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
    }
}
