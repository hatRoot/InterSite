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
    // 7. CONSOLA DE RENDIMIENTO EN VIVO (ANIMACIÓN DESDE CERO)
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

    let currentMetrics = {
        score: 0,
        lcp: 0.0,
        cls: 0.15,
        size: 0,
        conv: 0
    };

    function animateNumber(element, start, end, duration, options = {}) {
        if (!element) return;
        const startTime = performance.now();

        function easeOutCubic(x) {
            return 1 - Math.pow(1 - x, 3);
        }

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            const current = start + (end - start) * eased;

            let formatted = current.toFixed(options.decimals !== undefined ? options.decimals : 0);
            if (options.sign && current > 0) {
                formatted = '+' + formatted;
            }

            element.textContent = `${options.prefix || ''}${formatted}${options.suffix || ''}`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                const finalSign = options.sign && end > 0 ? '+' : '';
                element.textContent = `${options.prefix || ''}${finalSign}${end.toFixed(options.decimals !== undefined ? options.decimals : 0)}${options.suffix || ''}`;
            }
        }

        requestAnimationFrame(step);
    }

    function updateConsoleMetrics(targetMode, duration = 1400) {
        if (!scoreNum) return;

        if (targetMode === 'native') {
            scoreCircle.style.borderColor = 'var(--color-accent-emerald, #00df8f)';
            scoreCircle.style.boxShadow = '0 0 30px rgba(0, 223, 143, 0.45)';
            scoreNum.style.color = 'var(--color-accent-emerald, #00df8f)';
            scoreTitle.textContent = 'Rendimiento Máximo Garantizado';
            scoreDesc.textContent = 'Código nativo sin plugins lentos. Carga en 0.6s y cero rebote de clientes en móviles.';

            lcpVal.style.color = 'var(--color-accent-cyan)';
            clsVal.style.color = 'var(--color-accent-cyan)';
            sizeVal.style.color = 'var(--color-accent-cyan)';
            convVal.style.color = 'var(--color-accent-emerald)';

            // Animación suave desde el valor actual hasta el objetivo
            animateNumber(scoreNum, currentMetrics.score, 100, duration, { decimals: 0 });
            animateNumber(lcpVal, currentMetrics.lcp, 0.6, duration, { decimals: 1, suffix: 's' });
            animateNumber(clsVal, currentMetrics.cls, 0.00, duration, { decimals: 2 });
            animateNumber(sizeVal, currentMetrics.size, 42, duration, { decimals: 0, suffix: ' KB' });
            animateNumber(convVal, currentMetrics.conv, 340, duration, { decimals: 0, sign: true, suffix: '%' });

            currentMetrics = { score: 100, lcp: 0.6, cls: 0.00, size: 42, conv: 340 };
        } else {
            scoreCircle.style.borderColor = '#ff4757';
            scoreCircle.style.boxShadow = '0 0 30px rgba(255, 71, 87, 0.45)';
            scoreNum.style.color = '#ff4757';
            scoreTitle.textContent = 'Pérdida Crítica de Clientes';
            scoreDesc.textContent = 'Sobrecargado de plugins pesados y constructores lentos. Pierde el 53% del tráfico antes de cargar.';

            lcpVal.style.color = '#ff4757';
            clsVal.style.color = '#ff4757';
            sizeVal.style.color = '#ff4757';
            convVal.style.color = '#ff4757';

            animateNumber(scoreNum, currentMetrics.score, 34, duration, { decimals: 0 });
            animateNumber(lcpVal, currentMetrics.lcp, 4.8, duration, { decimals: 1, suffix: 's' });
            animateNumber(clsVal, currentMetrics.cls, 0.32, duration, { decimals: 2 });
            animateNumber(sizeVal, currentMetrics.size, 4800, duration, { decimals: 0, suffix: ' KB' });
            animateNumber(convVal, currentMetrics.conv, -60, duration, { decimals: 0, suffix: '%' });

            currentMetrics = { score: 34, lcp: 4.8, cls: 0.32, size: 4800, conv: -60 };
        }
    }

    const speedConsole = document.getElementById('speed-console');

    if (consoleTabs.length && scoreNum) {
        let hasAnimatedOnScroll = false;

        // Activar la animación cuando el scroll llega a la consola
        if (speedConsole && 'IntersectionObserver' in window) {
            const consoleObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !hasAnimatedOnScroll) {
                        hasAnimatedOnScroll = true;
                        setTimeout(() => {
                            updateConsoleMetrics('native', 1600);
                        }, 200);
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.2,
                rootMargin: '0px 0px -40px 0px'
            });

            consoleObserver.observe(speedConsole);
        } else {
            // Fallback si el navegador no soporta IntersectionObserver
            setTimeout(() => {
                updateConsoleMetrics('native', 1600);
            }, 600);
        }

        // Control de pestañas
        consoleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.getAttribute('data-console-mode');
                consoleTabs.forEach(t => t.classList.remove('active-tab'));
                tab.classList.add('active-tab');
                updateConsoleMetrics(mode, 1200);
            });
        });
    }
});
