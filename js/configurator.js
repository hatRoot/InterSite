/**
 * Intersite Interactive Project Configurator
 * Arnés de seguridad: Funciona de forma desacoplada emitiendo CustomEvents.
 */

(function () {
    'use strict';

    // Modelos y configuración de precios base
    const CONFIG = {
        plans: {
            basic: {
                id: 'basic',
                name: 'Landing Express / Básico',
                tagline: 'Ideal para validar ideas, servicios puntuales y captar leads rápido.',
                basePriceMXN: 8500,
                basePriceUSD: 450,
                deliveryDays: '5 a 7 días hábiles',
                included: [
                    'Estructura 1-Página de Alto Rendimiento',
                    'Diseño Responsivo (Móvil/Tablet/Desktop)',
                    'Microinteracciones y Animaciones Fluidas',
                    'Formulario Directo a WhatsApp y Correo',
                    'Indexación Básica en Google'
                ]
            },
            corporate: {
                id: 'corporate',
                name: 'Sitio Corporativo / PyME',
                tagline: 'Presencia de autoridad para empresas en crecimiento con múltiples secciones.',
                basePriceMXN: 16000,
                basePriceUSD: 850,
                deliveryDays: '10 a 14 días hábiles',
                included: [
                    'Hasta 5 a 7 secciones dedicadas',
                    'Dirección de arte moderna (3-sec WOW factor)',
                    'Optimización Core Web Vitals (LCP < 1.2s)',
                    'Schema JSON-LD & OpenGraph Pro',
                    'Integración de Google Search Console & Analytics'
                ]
            },
            ecommerce: {
                id: 'ecommerce',
                name: 'E-Commerce de Alto Rendimiento',
                tagline: 'Tienda virtual rápida, persuasiva y optimizada para conversión de ventas.',
                basePriceMXN: 26000,
                basePriceUSD: 1400,
                deliveryDays: '18 a 25 días hábiles',
                included: [
                    'Catálogo de productos y checkout optimizado',
                    'Pasarela de cobros (Stripe, PayPal, MercadoPago o WhatsApp)',
                    'Diseño UX enfocado en ticket promedio y baja fricción',
                    'SEO técnico para fichas de producto',
                    'Panel autoadministrable de inventario'
                ]
            },
            bespoke: {
                id: 'bespoke',
                name: 'Ecosistema Web a la Medida',
                tagline: 'Desarrollo a la medida sin límites: portales, cotizadores o plataformas web.',
                basePriceMXN: 42000,
                basePriceUSD: 2200,
                deliveryDays: '30 a 45 días hábiles',
                included: [
                    'Arquitectura de software personalizada',
                    'Diseño UI/UX exclusivo con prototipado previo',
                    'APIs, autenticación y bases de datos a la medida',
                    'Seguridad reforzada y CI/CD automatizado',
                    'Soporte prioritario y optimización continua'
                ]
            }
        },
        addons: {
            seo_pro: {
                name: 'SEO Técnico Avanzado + Schema Rich Snippets',
                priceMXN: 3500,
                priceUSD: 180
            },
            multilang: {
                name: 'Arquitectura Multi-idioma (Español / Inglés)',
                priceMXN: 2800,
                priceUSD: 150
            },
            cms_admin: {
                name: 'Panel Autoadministrable (CMS Fácil)',
                priceMXN: 4800,
                priceUSD: 250
            },
            checkout: {
                name: 'Pasarela de Cobro Automatizada',
                priceMXN: 3800,
                priceUSD: 200
            },
            animations: {
                name: 'Efectos 3D / Canvas / Microinteracciones WOW',
                priceMXN: 4200,
                priceUSD: 220
            }
        },
        whatsappNumber: '525535757364'
    };

    let state = {
        selectedPlan: 'corporate',
        selectedAddons: ['seo_pro'],
        currency: 'MXN' // 'MXN' o 'USD'
    };

    function initConfigurator() {
        const rootEl = document.getElementById('project-configurator');
        if (!rootEl) return;

        bindEvents(rootEl);
        renderConfigurator();
    }

    function bindEvents(rootEl) {
        // Selector de Planes
        rootEl.addEventListener('click', (e) => {
            const planCard = e.target.closest('[data-plan-id]');
            if (planCard) {
                const planId = planCard.getAttribute('data-plan-id');
                if (CONFIG.plans[planId]) {
                    state.selectedPlan = planId;
                    renderConfigurator();
                }
            }

            // Selector de Moneda
            const currencyBtn = e.target.closest('[data-currency]');
            if (currencyBtn) {
                const curr = currencyBtn.getAttribute('data-currency');
                if (curr === 'MXN' || curr === 'USD') {
                    state.currency = curr;
                    renderConfigurator();
                }
            }
        });

        // Selector de Addons (Checkboxes)
        rootEl.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"][data-addon-id]')) {
                const addonId = e.target.getAttribute('data-addon-id');
                if (e.target.checked) {
                    if (!state.selectedAddons.includes(addonId)) {
                        state.selectedAddons.push(addonId);
                    }
                } else {
                    state.selectedAddons = state.selectedAddons.filter(id => id !== addonId);
                }
                renderConfigurator();
            }
        });
    }

    function calculateTotal() {
        const plan = CONFIG.plans[state.selectedPlan];
        const isUSD = state.currency === 'USD';

        let total = isUSD ? plan.basePriceUSD : plan.basePriceMXN;

        state.selectedAddons.forEach(addonId => {
            const addon = CONFIG.addons[addonId];
            if (addon) {
                total += isUSD ? addon.priceUSD : addon.priceMXN;
            }
        });

        return {
            total,
            currencySymbol: isUSD ? 'USD $' : '$',
            currencySuffix: isUSD ? ' USD' : ' MXN',
            plan,
            deliveryDays: plan.deliveryDays
        };
    }

    function formatNumber(num) {
        return num.toLocaleString('es-MX');
    }

    function generateWhatsAppUrl(quoteData) {
        const addonsList = state.selectedAddons.map(id => CONFIG.addons[id]?.name).filter(Boolean).join(', ');
        const text = `¡Hola Intersite! 👋 Me interesa cotizar un proyecto web:\n\n` +
            `• Tipo: ${quoteData.plan.name}\n` +
            `• Estimado: ${quoteData.currencySymbol}${formatNumber(quoteData.total)}${quoteData.currencySuffix}\n` +
            `• Tiempo estimado: ${quoteData.deliveryDays}\n` +
            (addonsList ? `• Módulos extras: ${addonsList}\n\n` : `\n`) +
            `¿Podemos agendar una breve llamada o revisar disponibilidad?`;

        return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
    }

    function renderConfigurator() {
        const quote = calculateTotal();

        // 1. Actualizar tarjetas de planes activas
        document.querySelectorAll('[data-plan-id]').forEach(card => {
            const id = card.getAttribute('data-plan-id');
            const isActive = id === state.selectedPlan;
            card.classList.toggle('active-plan', isActive);
            card.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // 2. Actualizar botones de moneda
        document.querySelectorAll('[data-currency]').forEach(btn => {
            const curr = btn.getAttribute('data-currency');
            btn.classList.toggle('active-currency', curr === state.currency);
        });

        // 3. Actualizar resumen de cotización
        const priceEl = document.getElementById('calc-price-display');
        const deliveryEl = document.getElementById('calc-delivery-display');
        const planNameEl = document.getElementById('calc-plan-name');
        const planTaglineEl = document.getElementById('calc-plan-tagline');
        const includedListEl = document.getElementById('calc-included-list');
        const whatsappBtn = document.getElementById('calc-whatsapp-btn');
        const autofillFormBtn = document.getElementById('calc-fill-form-btn');

        if (priceEl) {
            priceEl.innerHTML = `<span class="calc-symbol">${quote.currencySymbol}</span>${formatNumber(quote.total)} <span class="calc-suffix">${quote.currencySuffix}</span>`;
        }

        if (deliveryEl) {
            deliveryEl.textContent = quote.deliveryDays;
        }

        if (planNameEl) {
            planNameEl.textContent = quote.plan.name;
        }

        if (planTaglineEl) {
            planTaglineEl.textContent = quote.plan.tagline;
        }

        if (includedListEl) {
            includedListEl.innerHTML = quote.plan.included
                .map(item => `<li><span class="icon-check">✓</span> ${item}</li>`)
                .join('');
        }

        const waUrl = generateWhatsAppUrl(quote);
        if (whatsappBtn) {
            whatsappBtn.href = waUrl;
        }

        // 4. Emitir evento desacoplado para el arnés de seguridad y formularios
        const eventData = {
            planId: state.selectedPlan,
            planName: quote.plan.name,
            totalFormatted: `${quote.currencySymbol}${formatNumber(quote.total)}${quote.currencySuffix}`,
            deliveryDays: quote.deliveryDays,
            addons: state.selectedAddons.map(id => CONFIG.addons[id]?.name),
            waUrl
        };

        window.dispatchEvent(new CustomEvent('quote:updated', { detail: eventData }));

        // Listener rápido para rellenar formulario al hacer clic
        if (autofillFormBtn) {
            autofillFormBtn.onclick = (e) => {
                e.preventDefault();
                const contactSection = document.getElementById('contacto');
                const messageTextarea = document.getElementById('message');
                const sectorSelect = document.getElementById('sector');

                if (messageTextarea) {
                    messageTextarea.value = `Hola Intersite, deseo cotizar el plan "${quote.plan.name}" con los complementos: ${eventData.addons.join(', ') || 'Estándar'}. Estimado visualizado: ${eventData.totalFormatted}.`;
                }

                if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                    if (messageTextarea) messageTextarea.focus();
                }
            };
        }
    }

    // Inicializar al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConfigurator);
    } else {
        initConfigurator();
    }
})();
