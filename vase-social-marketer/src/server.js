import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MarketingCopyGenerator from './marketing-copy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../public');

const PORT = process.env.PORT || 3000;
const copyGenerator = new MarketingCopyGenerator();

// Enhanced backgrounds based on photo-template-objective.md
const backgrounds = [
  { 
    id: 'transparent', 
    name: 'Transparent PNG', 
    colors: ['rgba(0,0,0,0)'],
    preview: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
    description: 'Transparent cutout for any background'
  },
  { 
    id: 'white-studio', 
    name: 'White Studio', 
    colors: ['#ffffff', '#fafafa'],
    preview: 'linear-gradient(180deg, #ffffff, #f0f0f0)',
    description: 'Clean white product photography'
  },
  { 
    id: 'luxury-outdoor', 
    name: 'Luxury Outdoor', 
    colors: ['#FF9966', '#6B2C5B'],
    preview: 'linear-gradient(180deg, #FF9966, #C44569)',
    description: 'Texas Hill Country sunset dinner setting'
  },
  { 
    id: 'modern-kitchen', 
    name: 'Modern Kitchen', 
    colors: ['#E8E4DF', '#D4C8C0'],
    preview: 'linear-gradient(180deg, #E8E4DF, #D4C8C0)',
    description: 'Contemporary kitchen interior'
  },
  { 
    id: 'romantic-dinner', 
    name: 'Romantic Dinner', 
    colors: ['#1a1a2e', '#e8a87c'],
    preview: 'linear-gradient(180deg, #1a1a2e, #9b6b7a)',
    description: 'Intimate twilight outdoor setting'
  },
  { 
    id: 'minimalist-catalog', 
    name: 'Minimalist Catalog', 
    colors: ['#F8F8F8', '#E8E8E8'],
    preview: 'linear-gradient(180deg, #F8F8F8, #E8E8E8)',
    description: 'Clean luxury product catalog'
  }
];

const vases = [
  { id: 'vase-ceramic-white', name: 'White Ceramic Vase' },
  { id: 'vase-terracotta', name: 'Terracotta Classic' },
  { id: 'vase-blue-porcelain', name: 'Blue Porcelain' },
  { id: 'vase-glass-clear', name: 'Clear Glass Vase' },
  { id: 'vase-botanical', name: 'Botanical Holder' },
  { id: 'vase-minimal', name: 'Minimalist Tall' }
];

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === '/api/backgrounds' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(backgrounds));
      return;
    }

    if (pathname === '/api/vases' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(vases));
      return;
    }

    if (pathname === '/api/generate-post' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const options = JSON.parse(body);

        let copyResult;
        if (options.audience === 'new') {
          copyResult = copyGenerator.generateForNewClient({
            includeUrgency: options.includeUrgency !== false,
            includeBenefit: options.includeBenefit !== false,
            customText: options.customMessage
          });
        } else if (options.audience === 'returning') {
          copyResult = copyGenerator.generateForReturningClient({
            includeExclusive: options.includeExclusive !== false,
            includeRestock: options.includeRestock !== false,
            customText: options.customMessage
          });
        } else {
          copyResult = copyGenerator.generatePromotional(options.customMessage);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          copy: copyResult
        }));
      });
      return;
    }

    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(publicPath, filePath);

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`🌸 Vase Social Marketer running at http://localhost:${PORT}`);
});
