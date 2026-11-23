const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateOgImage() {
  const width = 1200;
  const height = 630;

  // Read the dark mode logo SVG content (white text + cyan circle)
  // ViewBox of brand360s-darkmodelogo.svg is 0 0 209.36 83.15
  const logoSvgPath = path.join(__dirname, '../public/brand360s-darkmodelogo.svg');
  let logoSvgContent = fs.readFileSync(logoSvgPath, 'utf8');

  // Strip xml declaration and doctype if present
  logoSvgContent = logoSvgContent.replace(/<\?xml[\s\S]*?\?>/i, '').replace(/<!DOCTYPE[\s\S]*?>/i, '').trim();

  // Create SVG markup for the OG image
  const svgMarkup = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background linear gradient -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#08101E" />
        <stop offset="50%" stop-color="#0E1E38" />
        <stop offset="100%" stop-color="#0B1325" />
      </linearGradient>

      <!-- Radial glow behind branding -->
      <radialGradient id="cyanGlow" cx="20%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#007EA0" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#007EA0" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="blueGlow" cx="80%" cy="80%" r="55%">
        <stop offset="0%" stop-color="#243E76" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#243E76" stop-opacity="0" />
      </radialGradient>

      <!-- Pill gradient -->
      <linearGradient id="pillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#007EA0" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#243E76" stop-opacity="0.2" />
      </linearGradient>

      <!-- Card gradient -->
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.02" />
      </linearGradient>
    </defs>

    <!-- 1. Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

    <!-- 2. Ambient Lighting Glows -->
    <rect width="${width}" height="${height}" fill="url(#cyanGlow)" />
    <rect width="${width}" height="${height}" fill="url(#blueGlow)" />

    <!-- Subtle grid overlay -->
    <g opacity="0.06" stroke="#FFFFFF" stroke-width="1">
      <line x1="0" y1="105" x2="1200" y2="105" />
      <line x1="0" y1="210" x2="1200" y2="210" />
      <line x1="0" y1="315" x2="1200" y2="315" />
      <line x1="0" y1="420" x2="1200" y2="420" />
      <line x1="0" y1="525" x2="1200" y2="525" />
      <line x1="200" y1="0" x2="200" y2="630" />
      <line x1="400" y1="0" x2="400" y2="630" />
      <line x1="600" y1="0" x2="600" y2="630" />
      <line x1="800" y1="0" x2="800" y2="630" />
      <line x1="1000" y1="0" x2="1000" y2="630" />
    </g>

    <!-- 3. Top Section: Logo & Badge -->
    <g transform="translate(100, 85)">
      <!-- Embedded Brand360s Darkmode Logo scaled -->
      <g transform="scale(1.4)">
        ${logoSvgContent}
      </g>
    </g>

    <!-- Top-Right Category Pill -->
    <g transform="translate(860, 110)">
      <rect width="240" height="42" rx="21" fill="url(#pillGrad)" stroke="#007EA0" stroke-opacity="0.5" stroke-width="1.5" />
      <circle cx="28" cy="21" r="5" fill="#00D2FF" />
      <text x="44" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#E2E8F0" letter-spacing="1.2">ENTERPRISE CRM</text>
    </g>

    <!-- 4. Hero Content (Headline & Subheading) -->
    <g transform="translate(100, 260)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">
        Client Relationship Management
      </text>
      
      <text x="0" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="400" fill="#94A3B8">
        Manage clients, projects, contracts, invoices, payments and operations.
      </text>
    </g>

    <!-- 5. Feature Capability Cards -->
    <!-- Card 1: Clients & Services -->
    <g transform="translate(100, 360)">
      <rect width="235" height="135" rx="16" fill="url(#cardGrad)" stroke="#38BDF8" stroke-opacity="0.25" stroke-width="1.2" />
      <circle cx="44" cy="42" r="18" fill="#007EA0" fill-opacity="0.35" />
      <!-- Icon representation -->
      <circle cx="44" cy="38" r="7" fill="#38BDF8" />
      <path d="M33 50 C33 45 55 45 55 50" stroke="#38BDF8" stroke-width="2.5" fill="none" />
      <text x="24" y="86" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#FFFFFF">Client Accounts</text>
      <text x="24" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="400" fill="#94A3B8">Services &amp; Lifecycle</text>
    </g>

    <!-- Card 2: Contracts & Proposals -->
    <g transform="translate(355, 360)">
      <rect width="235" height="135" rx="16" fill="url(#cardGrad)" stroke="#38BDF8" stroke-opacity="0.25" stroke-width="1.2" />
      <circle cx="44" cy="42" r="18" fill="#007EA0" fill-opacity="0.35" />
      <rect x="36" y="32" width="16" height="20" rx="2" fill="none" stroke="#38BDF8" stroke-width="2.5" />
      <line x1="40" y1="38" x2="48" y2="38" stroke="#38BDF8" stroke-width="2" />
      <line x1="40" y1="44" x2="48" y2="44" stroke="#38BDF8" stroke-width="2" />
      <text x="24" y="86" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#FFFFFF">Smart Contracts</text>
      <text x="24" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="400" fill="#94A3B8">Agreements &amp; Scope</text>
    </g>

    <!-- Card 3: Invoicing & GST -->
    <g transform="translate(610, 360)">
      <rect width="235" height="135" rx="16" fill="url(#cardGrad)" stroke="#38BDF8" stroke-opacity="0.25" stroke-width="1.2" />
      <circle cx="44" cy="42" r="18" fill="#007EA0" fill-opacity="0.35" />
      <text x="44" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="800" fill="#38BDF8" text-anchor="middle">₹</text>
      <text x="24" y="86" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#FFFFFF">GST Invoicing</text>
      <text x="24" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="400" fill="#94A3B8">Tax &amp; Billing Control</text>
    </g>

    <!-- Card 4: Payments & Receipts -->
    <g transform="translate(865, 360)">
      <rect width="235" height="135" rx="16" fill="url(#cardGrad)" stroke="#38BDF8" stroke-opacity="0.25" stroke-width="1.2" />
      <circle cx="44" cy="42" r="18" fill="#007EA0" fill-opacity="0.35" />
      <path d="M36 42 L42 48 L52 36" stroke="#10B981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <text x="24" y="86" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#FFFFFF">Collections</text>
      <text x="24" y="108" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="400" fill="#94A3B8">Verified Allocations</text>
    </g>

    <!-- 6. Footer Domain Badge -->
    <g transform="translate(100, 545)">
      <text x="0" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="600" fill="#38BDF8" letter-spacing="0.5">
        crm.brand360s.co
      </text>
      <text x="165" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="400" fill="#64748B">
        •  Unified Business Operations Platform
      </text>
    </g>
  </svg>
  `;

  const outputPath = path.join(__dirname, '../public/og-image.png');

  await sharp(Buffer.from(svgMarkup))
    .png({ quality: 95 })
    .toFile(outputPath);

  console.log('Successfully generated OG image at:', outputPath);

  const meta = await sharp(outputPath).metadata();
  console.log(`Image properties: ${meta.width}x${meta.height}, format: ${meta.format}, size: ${fs.statSync(outputPath).size} bytes`);
}

generateOgImage().catch(err => {
  console.error('Error generating OG image:', err);
  process.exit(1);
});

