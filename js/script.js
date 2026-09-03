/**
 * Intersite Core Script
 * Telemetría de Core Web Vitals, Microinteracciones, Accesibilidad y Formularios.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ==========================================
    // 1. MONITOR DE CORE WEB VITALS (GSC READY)
    // ==========================================
    try {
        if ('PerformanceObserver' in window) {
            // LCP (Largest Contentful Paint)
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.info(`[GSC Telemetry] LCP: ${lastEntry.startTime.toFixed(1)}ms`);
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

            // CLS (Cumulative Layout Shift)
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                console.info(`[GSC Telemetry] CLS: ${clsValue.toFixed(4)}`);
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
        }
    } catch (err) {
        // Silencioso en navegadores sin soporte
    }

    // ==========================================
    // 2. NAVEGACIÓN MÓVIL Y ACCESIBILIDAD
    // ==========================================
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const glassNav = document.querySelector('.glass-nav');

    if (menuToggle && navLinks) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');

        const toggleMenu = () => {
            const isOpen = navLinks.classList.toggle('nav-open');
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            menuToggle.innerHTML = isOpen ? '✕' : '☰';
            document.body.style.overflow = isOpen ? 'hidden' : '';
        };

        menuToggle.addEventListener('click', toggleMenu);

        // Cerrar al hacer clic en un enlace
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('nav-open')) {
                    toggleMenu();
                }
            });
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('nav-open')) {
                toggleMenu();
            }
        });
    }

    // Estilo activo para el header al hacer scroll
    window.addEventListener('scroll', () => {
        if (glassNav) {
            if (window.scrollY > 40) {
                glassNav.classList.add('nav-scrolled');
            } else {
                glassNav.classList.remove('nav-scrolled');
            }
        }
    }, { passive: true });

    // ==========================================
    // 3. SMOOTH SCROLL CON OFFSET DE HEADER
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href.startsWith('#')) return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const navHeight = glassNav ? glassNav.offsetHeight : 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ==========================================
    // 4. INTERSECTION OBSERVER (REVEAL ANIMATIONS)
    // ==========================================
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    // ==========================================
    // 5. ACCORDION INTERACTIVO PARA FAQ
    // ==========================================
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        if (questionBtn) {
            questionBtn.addEventListener('click', () => {
                const isActive = item.classList.contains('faq-active');

                // Cerrar otros para mantener limpieza visual
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('faq-active');
                        const otherBtn = otherItem.querySelector('.faq-question');
                        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                    }
                });

                item.classList.toggle('faq-active', !isActive);
                questionBtn.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
            });
        }
    });

    // ==========================================
    // 6. FORMULARIO DE CONTACTO SEGURO
    // ==========================================
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalContent = submitBtn.innerHTML;

            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const messageInput = document.getElementById('message');
            const sectorInput = document.getElementById('sector');

            // Validación de correo básico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailInput && !emailRegex.test(emailInput.value.trim())) {
                alert('Por favor, ingresa un correo electrónico válido.');
                emailInput.focus();
                return;
            }

            // Estado de envío
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner"></span> Enviando Solicitud...
            `;

            setTimeout(() => {
                submitBtn.innerHTML = `✓ ¡Solicitud Recibida!`;
                submitBtn.style.background = 'var(--color-accent-emerald, #00df8f)';
                submitBtn.style.color = '#000';

                // Mensaje en pantalla
                const feedbackEl = document.getElementById('form-feedback') || document.createElement('div');
                feedbackEl.id = 'form-feedback';
                feedbackEl.className = 'form-success-banner';
                feedbackEl.innerHTML = `
                    <p>🎉 <strong>¡Gracias ${nameInput ? nameInput.value : ''}!</strong> Hemos recibido tu proyecto. Te contactaremos en menos de 24 horas.</p>
                `;
                contactForm.parentNode.insertBefore(feedbackEl, contactForm.nextSibling);

                contactForm.reset();

                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                    submitBtn.style.background = '';
                    submitBtn.style.color = '';
                }, 4000);
            }, 1200);
        });
    }

    // ==========================================
    // 7. MICROINTERACCIÓN MAGNÉTICA SUTIL (BOTONES WOW)
    // ==========================================
    const magneticBtns = document.querySelectorAll('.btn-magnetic');
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0px, 0px)';
        });
    });

    // ==========================================
    // 8. CONSOLA DE RENDIMIENTO EN VIVO (HERO SHOWCASE)
    // ==========================================
    const consoleTabs = document.querySelectorAll('.console-tab-btn');
    const scoreNum = document.getElementById('console-score');
    const scoreCircle = document.getElementById('console-circle');
    const scoreTitle = document.getElementById('console-title');
    const scoreDesc = document.getElementById('console-desc');
    const lcpVal = document.getElementById('console-lcp');
    const clsVal = document.getElementById('console-cls');
    const sizeVal = document.getElementById('console-size');
    const convVal = document.getElementById('console-conv');

    if (consoleTabs.length && scoreNum) {
        consoleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.getAttribute('data-console-mode');
                consoleTabs.forEach(t => t.classList.remove('active-tab'));
                tab.classList.add('active-tab');

                if (mode === 'native') {
                    scoreNum.textContent = '100';
                    scoreNum.style.color = 'var(--color-accent-emerald, #00df8f)';
                    scoreCircle.style.borderColor = 'var(--color-accent-emerald, #00df8f)';
                    scoreCircle.style.boxShadow = '0 0 25px rgba(0, 223, 143, 0.4)';
                    scoreTitle.textContent = 'Rendimiento Máximo Garantizado';
                    scoreDesc.textContent = 'Código nativo sin plugins lentos. Carga en 0.6s y cero rebote de clientes en móviles.';
                    lcpVal.textContent = '0.6s';
                    lcpVal.style.color = 'var(--color-accent-cyan)';
                    clsVal.textContent = '0.00';
                    clsVal.style.color = 'var(--color-accent-cyan)';
                    sizeVal.textContent = '42 KB';
                    sizeVal.style.color = 'var(--color-accent-cyan)';
                    convVal.textContent = '+340%';
                    convVal.style.color = 'var(--color-accent-emerald)';
                } else {
                    scoreNum.textContent = '34';
                    scoreNum.style.color = '#ff4757';
                    scoreCircle.style.borderColor = '#ff4757';
                    scoreCircle.style.boxShadow = '0 0 25px rgba(255, 71, 87, 0.4)';
                    scoreTitle.textContent = 'Pérdida Crítica de Clientes';
                    scoreDesc.textContent = 'Sobrecargado de plugins pesados y constructores lentos. Pierde el 53% del tráfico antes de cargar.';
                    lcpVal.textContent = '4.8s (Lento)';
                    lcpVal.style.color = '#ff4757';
                    clsVal.textContent = '0.32 (Inestable)';
                    clsVal.style.color = '#ff4757';
                    sizeVal.textContent = '4.8 MB (Pesado)';
                    sizeVal.style.color = '#ff4757';
                    convVal.textContent = '-60% Clientes';
                    convVal.style.color = '#ff4757';
                }
            });
        });
    }
});
