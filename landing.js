/* ==========================================
   Landing Page JavaScript
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initPricingToggle();
    initScrollAnimations();
    initMobileMenu();
});

// Smooth scroll navigation
function initNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.padding = '12px 0';
            navbar.style.background = 'rgba(10, 11, 15, 0.95)';
        } else {
            navbar.style.padding = '16px 0';
            navbar.style.background = 'rgba(10, 11, 15, 0.8)';
        }
    });
}

// Pricing toggle (monthly/yearly)
function initPricingToggle() {
    const toggle = document.getElementById('pricingToggle');
    const priceAmounts = document.querySelectorAll('.price-amount');
    const labels = document.querySelectorAll('.toggle-label');

    if (!toggle) return;

    toggle.addEventListener('change', () => {
        const isYearly = toggle.checked;

        labels.forEach((label, i) => {
            label.classList.toggle('active', isYearly ? i === 1 : i === 0);
        });

        priceAmounts.forEach(el => {
            const monthly = el.dataset.monthly;
            const yearly = el.dataset.yearly;

            el.style.opacity = '0';
            setTimeout(() => {
                el.textContent = isYearly ? yearly : monthly;
                el.style.opacity = '1';
            }, 150);
        });
    });
}

// Scroll animations
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card, .process-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        observer.observe(el);
    });

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation: fadeUp 0.6s ease forwards;
        }
        @keyframes fadeUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// Mobile menu
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');

    if (!menuBtn) return;

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');

        // Create mobile menu if doesn't exist
        let mobileNav = document.querySelector('.mobile-nav');

        if (!mobileNav) {
            mobileNav = document.createElement('div');
            mobileNav.className = 'mobile-nav';
            mobileNav.innerHTML = `
                <div class="mobile-nav-content">
                    ${navLinks.innerHTML}
                    ${navActions.innerHTML}
                </div>
            `;
            document.body.appendChild(mobileNav);

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .mobile-nav {
                    position: fixed;
                    top: 70px;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(10, 11, 15, 0.98);
                    backdrop-filter: blur(20px);
                    z-index: 99;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                .mobile-nav.active {
                    opacity: 1;
                    visibility: visible;
                }
                .mobile-nav-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 40px 24px;
                    gap: 24px;
                }
                .mobile-nav a {
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: 18px;
                    padding: 12px;
                }
                .mobile-menu.active span:nth-child(1) {
                    transform: rotate(45deg) translate(5px, 5px);
                }
                .mobile-menu.active span:nth-child(2) {
                    opacity: 0;
                }
                .mobile-menu.active span:nth-child(3) {
                    transform: rotate(-45deg) translate(5px, -5px);
                }
            `;
            document.head.appendChild(style);
        }

        mobileNav.classList.toggle('active');
    });
}

// Counter animation for stats
function animateCounters() {
    const counters = document.querySelectorAll('.stat-value');

    counters.forEach(counter => {
        const text = counter.textContent;
        const match = text.match(/[\d.]+/);
        if (!match) return;

        const target = parseFloat(match[0]);
        const prefix = text.substring(0, text.indexOf(match[0]));
        const suffix = text.substring(text.indexOf(match[0]) + match[0].length);

        let current = 0;
        const increment = target / 50;
        const duration = 2000;
        const stepTime = duration / 50;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = prefix + current.toFixed(target % 1 === 0 ? 0 : 1) + suffix;
        }, stepTime);
    });
}

// Trigger counter animation when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            heroObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.addEventListener('DOMContentLoaded', () => {
    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
        heroObserver.observe(heroStats);
    }
});
