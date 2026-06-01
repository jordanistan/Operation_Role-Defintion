import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Image Composer - Composites transparent vase images onto beautiful backgrounds
 * for social media marketing posts
 */
export class ImageComposer {
  constructor() {
    this.publicPath = path.join(__dirname, '../public');
    this.backgroundsPath = path.join(this.publicPath, 'images/backgrounds');
    this.vasesPath = path.join(this.publicPath, 'images/vases');
  }

  /**
   * Get available backgrounds
   */
  async getBackgrounds() {
    const backgrounds = [
      { id: 'gradient-sunset', name: 'Sunset Gradient', colors: ['#FF6B6B', '#4ECDC4'] },
      { id: 'gradient-ocean', name: 'Ocean Breeze', colors: ['#667eea', '#764ba2'] },
      { id: 'gradient-forest', name: 'Forest Calm', colors: ['#11998e', '#38ef7d'] },
      { id: 'gradient-gold', name: 'Golden Hour', colors: ['#f093fb', '#f5576c'] },
      { id: 'gradient-lavender', name: 'Lavender Dream', colors: ['#a18cd1', '#fbc2eb'] },
      { id: 'solid-cream', name: 'Cream Classic', colors: ['#FDF6E3'] },
      { id: 'solid-charcoal', name: 'Modern Charcoal', colors: ['#2D3436'] },
      { id: 'pattern-marble', name: 'Marble Elegance', colors: ['#f5f5f5', '#e0e0e0'] }
    ];
    return backgrounds;
  }

  /**
   * Get available vase images
   */
  async getVases() {
    const vases = [
      { id: 'vase-ceramic-white', name: 'White Ceramic Vase' },
      { id: 'vase-terracotta', name: 'Terracotta Classic' },
      { id: 'vase-blue-porcelain', name: 'Blue Porcelain' },
      { id: 'vase-glass-clear', name: 'Clear Glass Vase' },
      { id: 'vase-botanical', name: 'Botanical Holder' },
      { id: 'vase-minimal', name: 'Minimalist Tall' }
    ];
    return vases;
  }

  /**
   * Create a background image with specified dimensions and color
   */
  async createBackground(width, height, config) {
    const { type, colors, gradientDirection = 'to bottom right' } = config;
    
    let background;
    
    if (type === 'gradient') {
      const [color1, color2] = colors;
      // Create SVG gradient
      const svgGradient = `
        <svg width="${width}" height="${height}">
          <defs>
            <linearGradient id="grad" gradientTransform="rotate(45)">
              <stop offset="0%" stop-color="${color1}"/>
              <stop offset="100%" stop-color="${color2}"/>
            </linearGradient>
          </defs>
          <rect width="${width}" height="${height}" fill="url(#grad)"/>
        </svg>
      `;
      background = sharp(Buffer.from(svgGradient));
    } else if (type === 'solid') {
      background = sharp({
        create: {
          width,
          height,
          channels: 3,
          background: colors[0]
        }
      });
    } else if (type === 'pattern') {
      // Marble pattern - simple implementation
      const svgPattern = `
        <svg width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="${colors[0]}"/>
          <ellipse cx="30%" cy="40%" rx="150" ry="80" fill="${colors[1]}" opacity="0.3"/>
          <ellipse cx="70%" cy="60%" rx="200" ry="100" fill="${colors[1]}" opacity="0.2"/>
        </svg>
      `;
      background = sharp(Buffer.from(svgPattern));
    }

    return background.png();
  }

  /**
   * Composite vase image onto background
   */
  async compositeImage(options) {
    const {
      backgroundId,
      vaseId,
      width = 1080,
      height = 1080,
      vasePosition = { x: 0, y: 0 }, // Will be centered by default
      outputFormat = 'png'
    } = options;

    // Get background config
    const backgrounds = await this.getBackgrounds();
    const bgConfig = backgrounds.find(b => b.id === backgroundId);
    
    if (!bgConfig) {
      throw new Error(`Background ${backgroundId} not found`);
    }

    // Determine background type
    let bgType = 'solid';
    if (bgConfig.colors.length > 1) {
      bgType = bgConfig.id.includes('pattern') ? 'pattern' : 'gradient';
    }

    // Create background
    const background = await this.createBackground(width, height, {
      type: bgType,
      colors: bgConfig.colors
    });

    // Try to load vase image, or create a placeholder
    let vaseBuffer;
    const vasePath = path.join(this.vasesPath, `${vaseId}.png`);
    
    try {
      vaseBuffer = await sharp(vasePath).toBuffer();
    } catch {
      // Create placeholder vase if file doesn't exist
      vaseBuffer = await this.createPlaceholderVase(vaseId);
    }

    // Get vase metadata
    const vaseMeta = await sharp(vaseBuffer).metadata();
    
    // Calculate vase size (max 60% of image width/height while maintaining aspect ratio)
    const maxVaseWidth = width * 0.6;
    const maxVaseHeight = height * 0.6;
    let vaseWidth = vaseMeta.width;
    let vaseHeight = vaseMeta.height;
    
    if (vaseWidth > maxVaseWidth || vaseHeight > maxVaseHeight) {
      const ratio = Math.min(maxVaseWidth / vaseWidth, maxVaseHeight / vaseHeight);
      vaseWidth = Math.round(vaseWidth * ratio);
      vaseHeight = Math.round(vaseHeight * ratio);
    }

    // Resize vase
    const resizedVase = await sharp(vaseBuffer)
      .resize(vaseWidth, vaseHeight, { fit: 'contain' })
      .toBuffer();

    // Calculate position (center if not specified)
    const x = vasePosition.x !== undefined ? vasePosition.x : Math.round((width - vaseWidth) / 2);
    const y = vasePosition.y !== undefined ? vasePosition.y : Math.round((height - vaseHeight) / 2);

    // Composite onto background
    const result = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        { input: await background.toBuffer(), top: 0, left: 0 },
        { input: resizedVase, top: y, left: x }
      ])
      .png()
      .toBuffer();

    return result;
  }

  /**
   * Create a placeholder vase image for demo purposes
   */
  async createPlaceholderVase(vaseId) {
    // Create a simple vase shape SVG
    const svg = `
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="vaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#E8D5C4;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#F5EDE4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#D4C4B0;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Vase body -->
        <path d="M100,550 Q80,500 90,400 Q95,300 130,200 Q150,150 200,120 Q250,150 270,200 Q305,300 310,400 Q320,500 300,550 Z" 
              fill="url(#vaseGrad)" stroke="#B8A99A" stroke-width="2"/>
        <!-- Vase neck -->
        <path d="M165,120 Q170,80 175,50 L225,50 Q230,80 235,120" 
              fill="url(#vaseGrad)" stroke="#B8A99A" stroke-width="2"/>
        <!-- Highlight -->
        <ellipse cx="160" cy="250" rx="20" ry="60" fill="white" opacity="0.2"/>
      </svg>
    `;
    
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generate a complete social media post
   */
  async generatePost(options) {
    const { backgroundId, vaseId, customMessage, outputPath } = options;
    
    const imageBuffer = await this.compositeImage({ backgroundId, vaseId });
    
    if (outputPath) {
      await sharp(imageBuffer).toFile(outputPath);
      return { success: true, path: outputPath };
    }
    
    return { 
      success: true, 
      image: imageBuffer.toString('base64'),
      mimeType: 'image/png'
    };
  }
}

export default ImageComposer;
