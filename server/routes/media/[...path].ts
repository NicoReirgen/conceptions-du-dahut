import sharp from 'sharp'

/**
 * Relais des médias WordPress pendant le développement.
 *
 * L'API renvoie les médias en chemins relatifs (/media/2025/03/photo.jpg) pour
 * que le HTML ne contienne jamais l'origine WordPress.
 *
 * En production, `scripts/fetch-media.mjs` rapatrie et réencode ces fichiers
 * dans public/media/ : le site publié est statique et ne contacte jamais
 * WordPress. Cette route ne sert donc qu'au développement.
 *
 * Elle reproduit aussi les variantes du build (photo@1280.avif) en les
 * transcodant à la volée. Sans ça, les <source> d'un <picture> renverraient 404
 * en développement — et une <source> en échec ne retombe pas sur le <img> :
 * l'image casserait au lieu de se dégrader.
 */

/** Reconnaît « <nom>@<largeur>.<avif|webp> ». */
const VARIANT = /^(.*)@(\d+)\.(avif|webp)$/

export default defineEventHandler(async (event) => {
  const rawPath = event.context.params?.path
  const pathParam = Array.isArray(rawPath) ? rawPath.join('/') : rawPath

  if (!pathParam || typeof pathParam !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Chemin de média manquant' })
  }

  const normalizedPath = pathParam.replace(/^\/+/, '')

  // Le chemin vient de l'API mais reste une entrée non fiable : on interdit
  // toute remontée d'arborescence ou changement d'origine.
  if (normalizedPath.includes('..') || normalizedPath.includes('://')) {
    throw createError({ statusCode: 400, statusMessage: 'Chemin de média invalide' })
  }

  const config = useRuntimeConfig(event)

  let origin: string
  try {
    origin = new URL(config.public.wpBaseUrl as string).origin
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Origine WordPress invalide' })
  }

  const variant = normalizedPath.match(VARIANT)

  // Une variante ne porte pas l'extension de sa source : on essaie les formats
  // matriciels présents dans la médiathèque plutôt que d'en supposer un.
  const candidates = variant
    ? ['jpg', 'jpeg', 'png'].map((ext) => `${variant[1]}.${ext}`)
    : [normalizedPath]

  let upstream: Response | undefined

  for (const candidate of candidates) {
    const response = await fetch(`${origin}/wp-content/uploads/${candidate}`)

    if (response.ok) {
      upstream = response
      break
    }
  }

  if (!upstream) {
    throw createError({ statusCode: 404, statusMessage: 'Média indisponible' })
  }

  setHeader(event, 'cache-control', 'public, max-age=3600')

  if (!variant) {
    setHeader(
      event,
      'content-type',
      upstream.headers.get('content-type') || 'application/octet-stream'
    )

    const contentLength = upstream.headers.get('content-length')
    if (contentLength) {
      setHeader(event, 'content-length', contentLength)
    }

    return sendStream(event, upstream.body!)
  }

  const [, , width, format] = variant
  const source = Buffer.from(await upstream.arrayBuffer())
  const pipeline = sharp(source).resize({ width: Number(width), withoutEnlargement: true })

  const output =
    format === 'avif'
      ? await pipeline.avif({ quality: 55, effort: 3 }).toBuffer()
      : await pipeline.webp({ quality: 74 }).toBuffer()

  setHeader(event, 'content-type', `image/${format}`)
  setHeader(event, 'content-length', output.length)

  return output
})
