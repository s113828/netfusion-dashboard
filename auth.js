/* ==========================================
   Auth Pages JavaScript
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggle();
    initPasswordStrength();
    initFormValidation();
});

// Toggle password visibility
function initPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;

            // Toggle icon
            btn.innerHTML = type === 'password'
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        });
    });
}

// Password strength indicator
function initPasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (!passwordInput || !strengthFill) return;

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = calculateStrength(password);

        strengthFill.className = 'strength-fill';

        if (password.length === 0) {
            strengthFill.style.width = '0%';
            strengthText.textContent = '密碼強度';
        } else if (strength < 2) {
            strengthFill.classList.add('weak');
            strengthText.textContent = '弱';
        } else if (strength < 4) {
            strengthFill.classList.add('medium');
            strengthText.textContent = '中';
        } else {
            strengthFill.classList.add('strong');
            strengthText.textContent = '強';
        }
    });
}

function calculateStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    return strength;
}

// Form validation
function initFormValidation() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin(loginForm);
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegister(registerForm);
        });
    }
}

function handleLogin(form) {
    const email = form.email.value;
    const password = form.password.value;

    // Validate
    if (!email || !password) {
        showToast('請填寫所有必填欄位', 'error');
        return;
    }

    // Show loading
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> 登入中...';
    btn.disabled = true;

    // Simulate login
    setTimeout(() => {
        showToast('登入成功！正在跳轉...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }, 1500);
}

function handleRegister(form) {
    const firstName = form.firstName.value;
    const lastName = form.lastName.value;
    const email = form.email.value;
    const password = form.password.value;
    const terms = form.terms.checked;

    // Validate
    if (!firstName || !lastName || !email || !password) {
        showToast('請填寫所有必填欄位', 'error');
        return;
    }

    if (!terms) {
        showToast('請同意服務條款與隱私政策', 'error');
        return;
    }

    if (password.length < 8) {
        showToast('密碼至少需要 8 個字元', 'error');
        return;
    }

    // Show loading
    const btn = form.querySelector('button[type="submit"]');
    btn.innerHTML = '<span class="spinner"></span> 建立帳號中...';
    btn.disabled = true;

    // Simulate registration
    setTimeout(() => {
        showToast('帳號建立成功！', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }, 1500);
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    const colors = {
        success: 'linear-gradient(135deg, #22c55e, #10b981)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    };

    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${colors[type]};
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
    .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
