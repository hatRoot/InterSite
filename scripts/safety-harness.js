/**
 * Intersite Safety Harness (Arnés de Seguridad Automatizado)
 * Ejecución: node scripts/safety-harness.js
 * 
 * Verifica que ningún cambio rompa el SEO en Google Search Console,
 * la accesibilidad, las rutas de archivos o la integridad del DOM.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, failureDetails = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  \x1b[32m✔ PASS\x1b[0m ${message}`);
    } else {
        failedTests++;
        console.error(`  \x1b[31m✖ FAIL\x1b[0m ${message}`);
        if (failureDetails) {
            console.error(`    \x1b[33m↳ ${failureDetails}\x1b[0m`);
        }
    }
}

console.log('\n\x1b[1m\x1b[36m=== INICIANDO ARNÉS DE SEGURIDAD INTERSITE ===\x1b[0m\n');

// 1. Verificación de Existencia de Archivos Vitales
console.log('\x1b[1m[1/4] Comprobando Archivos Vitales del Sistema...\x1b[0m');
const vitalFiles = [
    'index.html',
    'robots.txt',
    'sitemap.xml',
    'css/tokens.css',
    'css/styles.css',
    'js/configurator.js',
    'js/script.js',
    'js/fluid-background.js'
];

vitalFiles.forEach(file => {
    const fullPath = path.join(ROOT_DIR, file);
    assert(fs.existsSync(fullPath), `Archivo vital existe: ${file}`);
});

// Leer index.html para auditorías de DOM y SEO
const indexPath = path.join(ROOT_DIR, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

// 2. Verificación de Google Search Console & SEO Técnico
console.log('\n\x1b[1m[2/4] Comprobando Google Search Console & SEO Requisitos...\x1b[0m');

// Meta description
const metaDescMatch = indexContent.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
assert(
    !!metaDescMatch && metaDescMatch[1].length >= 50 && metaDescMatch[1].length <= 180,
    `Meta Description presente y en rango ideal (50-180 chars) [Actual: ${metaDescMatch ? metaDescMatch[1].length : 0} chars]`
);

// Canonical Tag
const canonicalMatch = indexContent.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
assert(!!canonicalMatch, `Tag Canónico presente y válido (${canonicalMatch ? canonicalMatch[1] : 'Falta'})`);

// OpenGraph & Twitter
assert(indexContent.includes('property="og:title"'), 'OpenGraph Title configurado');
assert(indexContent.includes('property="og:image"'), 'OpenGraph Image configurado');
assert(indexContent.includes('name="twitter:card"'), 'Twitter Card configurado');

// Schema.org JSON-LD
const jsonLdMatch = indexContent.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
let jsonLdParsed = false;
if (jsonLdMatch) {
    try {
        const parsed = JSON.parse(jsonLdMatch[1]);
        jsonLdParsed = parsed && parsed['@context'] === 'https://schema.org';
    } catch (e) {
        jsonLdParsed = false;
    }
}
assert(jsonLdParsed, 'Schema.org JSON-LD presente y con sintaxis JSON 100% válida');

// robots.txt & sitemap.xml
const robotsContent = fs.readFileSync(path.join(ROOT_DIR, 'robots.txt'), 'utf-8');
assert(robotsContent.includes('Sitemap:'), 'robots.txt referencia al Sitemap canónico');

// 3. Verificación de Estabilidad del DOM y Prevención de Colisiones
console.log('\n\x1b[1m[3/4] Comprobando Arnés Anti-Colisión (IDs y Referencias)...\x1b[0m');

// IDs duplicados
const idRegex = /\sid=["']([^"']+)["']/g;
let match;
const seenIds = new Set();
const duplicateIds = [];

while ((match = idRegex.exec(indexContent)) !== null) {
    const id = match[1];
    if (seenIds.has(id)) {
        duplicateIds.push(id);
    }
    seenIds.add(id);
}
assert(
    duplicateIds.length === 0,
    `Sin IDs duplicados en el documento HTML`,
    duplicateIds.length > 0 ? `IDs duplicados: ${duplicateIds.join(', ')}` : ''
);

// 4. Auditoría de Core Web Vitals & Prevención de CLS
console.log('\n\x1b[1m[4/4] Comprobando Reglas de Core Web Vitals (Imágenes & Assets)...\x1b[0m');

// Todas las imágenes deben tener alt y dimensiones width/height para CLS = 0
const imgRegex = /<img\s+([^>]+)>/g;
let imgMatch;
let missingAlt = 0;
let missingDimensions = 0;

while ((imgMatch = imgRegex.exec(indexContent)) !== null) {
    const attrs = imgMatch[1];
    if (!attrs.includes('alt=')) missingAlt++;
    if (!attrs.includes('width=') || !attrs.includes('height=')) missingDimensions++;
}

assert(missingAlt === 0, `Todas las imágenes tienen atributo 'alt' (Accesibilidad)`, `Faltan ${missingAlt} tags`);
assert(missingDimensions === 0, `Todas las imágenes tienen 'width' y 'height' explícitos (Previene CLS)`, `Faltan ${missingDimensions} tags`);

// Resumen Final
console.log('\n---------------------------------------------');
console.log(`Pruebas Totales: ${totalTests} | \x1b[32mExitosas: ${passedTests}\x1b[0m | \x1b[31mFallidas: ${failedTests}\x1b[0m`);

if (failedTests === 0) {
    console.log('\n\x1b[1m\x1b[32m🛡️ ¡EL ARNÉS DE SEGURIDAD ESTÁ 100% LIMPIO! EL SITIO ESTÁ LISTO PARA PRODUCCIÓN.\x1b[0m\n');
    process.exit(0);
} else {
    console.log('\n\x1b[1m\x1b[31m⚠️ ATENCIÓN: Se detectaron fallas en el arnés. Por favor revisa los errores arriba.\x1b[0m\n');
    process.exit(1);
}
