/**
 * Serveur statique de mesure.
 *
 * Reproduit ce que fait un hébergeur réel, sans quoi les scores seraient faussés :
 *   — sert les fichiers pré-compressés brotli/gzip produits au build ;
 *   — met en cache long les assets versionnés ;
 *   — résout /chemin/ vers /chemin/index.html.
 *
 * Un simple `python -m http.server` ne compresse rien et donnerait un poids
 * transféré deux fois supérieur à la réalité.
 *
 *   node scripts/serve-static.mjs [port]
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../.output/public')
const PORT = Number(process.argv[2]) || 3010

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
}

createServer((request, response) => {
    const url = new URL(request.url, `http://localhost:${PORT}`)
    let filePath = path.join(ROOT, decodeURIComponent(url.pathname))

    // Empêche toute sortie du dossier publié.
    if (!filePath.startsWith(ROOT)) {
        response.writeHead(403).end()
        return
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html')
    }

    if (!existsSync(filePath)) {
        const fallback = path.join(ROOT, '404.html')
        response.writeHead(404, { 'content-type': TYPES['.html'] })
        createReadStream(existsSync(fallback) ? fallback : path.join(ROOT, 'index.html')).pipe(response)
        return
    }

    const extension = path.extname(filePath)
    const headers = { 'content-type': TYPES[extension] || 'application/octet-stream' }

    // Les fichiers versionnés par empreinte peuvent être mis en cache
    // indéfiniment ; les pages, non.
    headers['cache-control'] = url.pathname.startsWith('/_nuxt/')
        ? 'public, max-age=31536000, immutable'
        : extension === '.html'
          ? 'public, max-age=0, must-revalidate'
          : 'public, max-age=604800'

    // Variantes pré-compressées, dans l'ordre de préférence.
    const accepted = request.headers['accept-encoding'] || ''
    let served = filePath

    if (accepted.includes('br') && existsSync(`${filePath}.br`)) {
        served = `${filePath}.br`
        headers['content-encoding'] = 'br'
    } else if (accepted.includes('gzip') && existsSync(`${filePath}.gz`)) {
        served = `${filePath}.gz`
        headers['content-encoding'] = 'gzip'
    }

    if (headers['content-encoding']) {
        headers.vary = 'Accept-Encoding'
    }

    headers['content-length'] = statSync(served).size

    response.writeHead(200, headers)
    createReadStream(served).pipe(response)
}).listen(PORT, () => {
    console.log(`Site statique servi sur http://localhost:${PORT}`)
})
