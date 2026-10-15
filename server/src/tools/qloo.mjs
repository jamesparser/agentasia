// AgentAsia cultural grounding — Qloo taste graph.
//
// The browser never holds a Qloo key. This module is the only place that talks
// to Qloo, and the gateway exposes it as POST /v1/culture (metered like search).
//
// Why Qloo is the differentiator: AgentAsia already speaks the user's language.
// Qloo is what lets the agent also understand what people in that culture
// actually like — dining, music, film, places, brands, gifts — so answers land
// as local taste instead of generic translation.
//
// Live API notes (verified against hackathon.api.qloo.com, 2026-10-08):
//   GET /v2/tags?filter.query=khmer&take=N   -> results.tags[] { id: urn:tag:..., name }
//   GET /search?query=Phnom Penh&take=N      -> results[] { entity_id: UUID, name, types[], properties }
//   GET /v2/insights?filter.type=...&filter.tags=urn:tag:...&signal.interests.entities=<UUID>
//                                           -> results.entities[] { entity_id, name, subtype, properties }
// Tag search uses filter.query (NOT query). signal.interests.entities takes bare
// UUIDs from /search, not urn:entity: prefixes.

const QLOO_DEFAULT_BASE = 'https://hackathon.api.qloo.com'

export function qlooConfigured(env = process.env) {
  return Boolean(env.QLOO_API_KEY)
}

export function qlooBase(env = process.env) {
  return (env.QLOO_BASE_URL || QLOO_DEFAULT_BASE).replace(/\/$/, '')
}

/**
 * Locale → culture profile. Seeds are resolved at runtime through Qloo
 * /search and /v2/tags so we never hardcode taste URNs as the only path
 * (coverage varies by region). The profile tells the tool which taste
 * signals to look up; Qloo is the source of truth for what is hot.
 */
export const CULTURE_PROFILES = {
  km: {
    label: 'Khmer',
    region: 'Cambodia',
    countryCode: 'KH',
    cityHints: ['Phnom Penh', 'Siem Reap', 'Sihanoukville'],
    dining: ['khmer cuisine', 'cambodian', 'cambodian restaurant', 'fish amok', 'num banh chok'],
    music: ['khmer music', 'cambodian', 'cambodian rock'],
    film: ['cambodian cinema', 'khmer film'],
    lifestyle: ['buddhist festivals', 'khmer new year', 'southeast asian family'],
    audiences: ['southeast asia', 'family', 'young professionals'],
    giftIdeas: ['cambodian silk', 'khmer craft', 'angkor souvenir', 'kampot pepper', 'local coffee'],
  },
  lo: {
    label: 'Lao',
    region: 'Laos',
    countryCode: 'LA',
    cityHints: ['Vientiane', 'Luang Prabang'],
    dining: ['lao cuisine', 'larb', 'sticky rice', 'mekong fish'],
    music: ['lao pop', 'mor lam'],
    film: ['lao cinema', 'thai cinema'],
    lifestyle: ['buddhist temple', 'mekong river'],
    audiences: ['southeast asia', 'family'],
    giftIdeas: ['lao coffee', 'handwoven textiles', 'local crafts'],
  },
  th: {
    label: 'Thai',
    region: 'Thailand',
    countryCode: 'TH',
    cityHints: ['Bangkok', 'Chiang Mai', 'Phuket'],
    dining: ['thai cuisine', 'thai food', 'street food bangkok', 'som tum', 'thai curry'],
    music: ['thai pop', 't-pop', 'thai indie'],
    film: ['thai cinema', 'thai horror'],
    lifestyle: ['songkran', 'night markets', 'temple visits', 'cafe hopping'],
    audiences: ['thailand', 'young adults', 'foodies', 'travelers'],
    giftIdeas: ['thai silk', 'local snacks', 'spa', 'bangkok design'],
  },
  vi: {
    label: 'Vietnamese',
    region: 'Vietnam',
    countryCode: 'VN',
    cityHints: ['Ho Chi Minh City', 'Hanoi', 'Da Nang'],
    dining: ['vietnamese cuisine', 'pho', 'banh mi', 'vietnamese coffee'],
    music: ['v-pop', 'vietnamese indie'],
    film: ['vietnamese cinema'],
    lifestyle: ['tet', 'cafe culture vietnam', 'ao dai'],
    audiences: ['vietnam', 'young professionals', 'foodies'],
    giftIdeas: ['vietnamese coffee', 'lacquerware', 'local fashion'],
  },
  id: {
    label: 'Indonesian',
    region: 'Indonesia',
    countryCode: 'ID',
    cityHints: ['Jakarta', 'Bali', 'Bandung', 'Yogyakarta'],
    dining: ['indonesian cuisine', 'nasi goreng', 'rendang', 'balinese food'],
    music: ['indonesian pop', 'dangdut', 'indonesian indie'],
    film: ['indonesian cinema', 'indonesian horror'],
    lifestyle: ['hijab fashion', 'cafe hopping jakarta', 'korean wave'],
    audiences: ['indonesia', 'teens', 'young adults'],
    giftIdeas: ['batik', 'local snacks', 'k-beauty', 'coffee beans'],
  },
  jv: {
    label: 'Javanese',
    region: 'Indonesia',
    countryCode: 'ID',
    cityHints: ['Yogyakarta', 'Solo', 'Surabaya'],
    dining: ['javanese cuisine', 'gudeg', 'nasi liwet'],
    music: ['campursari', 'javanese pop', 'gamelan'],
    film: ['indonesian cinema'],
    lifestyle: ['javanese tradition', 'batik culture'],
    audiences: ['indonesia', 'family', 'cultural travelers'],
    giftIdeas: ['batik', 'javanese ceramics', 'local tea'],
  },
  ms: {
    label: 'Malay',
    region: 'Malaysia',
    countryCode: 'MY',
    cityHints: ['Kuala Lumpur', 'Penang', 'Johor Bahru'],
    dining: ['malaysian cuisine', 'nasi lemak', 'penang food', 'halal dining'],
    music: ['malaysian pop', 'malay indie'],
    film: ['malaysian cinema'],
    lifestyle: ['hari raya', 'halal lifestyle'],
    audiences: ['malaysia', 'muslim lifestyle', 'foodies'],
    giftIdeas: ['batik', 'local snacks', 'halal beauty', 'coffee'],
  },
  fil: {
    label: 'Filipino',
    region: 'Philippines',
    countryCode: 'PH',
    cityHints: ['Manila', 'Cebu', 'Davao'],
    dining: ['filipino cuisine', 'adobo', 'lechon', 'filipino street food'],
    music: ['opm', 'filipino pop', 'p-pop'],
    film: ['filipino cinema', 'korean drama'],
    lifestyle: ['family gatherings', 'mall culture', 'korean wave'],
    audiences: ['philippines', 'teens', 'young adults', 'k-pop fans'],
    giftIdeas: ['local snacks', 'k-beauty', 'filipino coffee'],
  },
  ceb: {
    label: 'Cebuano',
    region: 'Philippines',
    countryCode: 'PH',
    cityHints: ['Cebu', 'Dumaguete'],
    dining: ['cebu lechon', 'filipino cuisine', 'seafood'],
    music: ['opm', 'bisaya pop'],
    film: ['filipino cinema'],
    lifestyle: ['beach life', 'sinulog festival'],
    audiences: ['philippines', 'families', 'travelers'],
    giftIdeas: ['dried mango', 'local crafts', 'beachwear'],
  },
  my: {
    label: 'Burmese',
    region: 'Myanmar',
    countryCode: 'MM',
    cityHints: ['Yangon', 'Mandalay'],
    dining: ['burmese cuisine', 'mohinga', 'tea leaf salad'],
    music: ['myanmar pop', 'burmese rock'],
    film: ['myanmar cinema'],
    lifestyle: ['thingyan', 'pagoda visits', 'tea shop'],
    audiences: ['myanmar', 'family', 'young adults'],
    giftIdeas: ['longyi', 'lacquerware', 'myanmar tea'],
  },
  ja: {
    label: 'Japanese',
    region: 'Japan',
    countryCode: 'JP',
    cityHints: ['Tokyo', 'Osaka', 'Kyoto', 'Fukuoka'],
    dining: ['japanese cuisine', 'ramen', 'sushi', 'izakaya', 'kaiseki'],
    music: ['j-pop', 'j-rock', 'anime songs', 'city pop'],
    film: ['anime', 'japanese cinema', 'studio ghibli', 'j-drama'],
    lifestyle: ['otaku culture', 'cafe culture tokyo', 'onsen', 'minimalist'],
    audiences: ['japan', 'young adults', 'anime fans', 'foodies', 'travelers'],
    giftIdeas: ['muji', 'uniqlo', 'pokemon', 'studio ghibli', 'japanese tea', 'japanese snacks', 'sony'],
  },
  ko: {
    label: 'Korean',
    region: 'South Korea',
    countryCode: 'KR',
    cityHints: ['Seoul', 'Busan'],
    dining: ['korean cuisine', 'korean bbq', 'korean street food', 'korean fried chicken'],
    music: ['k-pop', 'korean indie', 'k-hip hop'],
    film: ['korean drama', 'korean cinema', 'k-content'],
    lifestyle: ['k-beauty', 'korean fashion', 'cafe hopping seoul'],
    audiences: ['south korea', 'teens', 'young adults', 'k-pop fans'],
    giftIdeas: ['k-beauty', 'korean snacks', 'k-pop merch', 'korean fashion'],
  },
  'zh-CN': {
    label: 'Simplified Chinese',
    region: 'China',
    countryCode: 'CN',
    cityHints: ['Shanghai', 'Beijing', 'Shenzhen', 'Chengdu'],
    dining: ['chinese cuisine', 'sichuan', 'dim sum', 'hot pot'],
    music: ['c-pop', 'mandopop'],
    film: ['chinese cinema', 'c-drama'],
    lifestyle: ['chinese new year', 'tea culture', 'shopping shanghai'],
    audiences: ['china', 'young adults', 'foodies', 'shoppers'],
    giftIdeas: ['tea', 'chinese snacks', 'local design', 'skincare'],
  },
  'zh-TW': {
    label: 'Traditional Chinese',
    region: 'Taiwan',
    countryCode: 'TW',
    cityHints: ['Taipei', 'Kaohsiung'],
    dining: ['taiwanese cuisine', 'night market taiwan', 'beef noodle', 'bubble tea'],
    music: ['mandopop', 'taiwanese indie'],
    film: ['taiwanese cinema', 'taiwanese drama'],
    lifestyle: ['night markets', 'hot springs', 'tea culture'],
    audiences: ['taiwan', 'young adults', 'foodies', 'travelers'],
    giftIdeas: ['pineapple cake', 'tea', 'local design'],
  },
  yue: {
    label: 'Cantonese',
    region: 'Hong Kong',
    countryCode: 'HK',
    cityHints: ['Hong Kong', 'Guangzhou'],
    dining: ['cantonese cuisine', 'dim sum', 'hong kong cafe', 'cha chaan teng'],
    music: ['cantopop'],
    film: ['hong kong cinema', 'tvd drama'],
    lifestyle: ['dim sum culture', 'shopping hong kong'],
    audiences: ['hong kong', 'guangdong', 'foodies', 'shoppers'],
    giftIdeas: ['mooncakes', 'tea', 'hong kong snacks'],
  },
  hi: {
    label: 'Hindi',
    region: 'India',
    countryCode: 'IN',
    cityHints: ['Mumbai', 'Delhi', 'Bangalore'],
    dining: ['indian cuisine', 'north indian', 'street food mumbai', 'thali'],
    music: ['bollywood', 'hindi pop', 'filmi music'],
    film: ['bollywood', 'hindi cinema', 'indian web series'],
    lifestyle: ['festivals india', 'cricket', 'wedding season'],
    audiences: ['india', 'young adults', 'families', 'cricket fans'],
    giftIdeas: ['indian snacks', 'ethnic wear', 'tea', 'handicrafts'],
  },
  bn: {
    label: 'Bengali',
    region: 'India',
    countryCode: 'IN',
    cityHints: ['Kolkata', 'Dhaka'],
    dining: ['bengali cuisine', 'fish curry', 'sweets', 'biriyani kolkata'],
    music: ['rabindra sangeet', 'bengali rock'],
    film: ['bengali cinema'],
    lifestyle: ['durga puja', 'adda culture', 'book fair'],
    audiences: ['west bengal', 'bangladesh', 'families'],
    giftIdeas: ['bengali sweets', 'books', 'handloom', 'tea'],
  },
  ur: {
    label: 'Urdu',
    region: 'Pakistan',
    countryCode: 'PK',
    cityHints: ['Karachi', 'Lahore', 'Islamabad'],
    dining: ['pakistani cuisine', 'biryani', 'nihari', 'karahi'],
    music: ['pakistani pop', 'coke studio', 'qawwali'],
    film: ['pakistani drama'],
    lifestyle: ['eid', 'cricket pakistan', 'family gatherings'],
    audiences: ['pakistan', 'families', 'young adults'],
    giftIdeas: ['pakistani snacks', 'attar', 'dry fruits'],
  },
  ne: {
    label: 'Nepali',
    region: 'Nepal',
    countryCode: 'NP',
    cityHints: ['Kathmandu', 'Pokhara'],
    dining: ['nepali cuisine', 'dal bhat', 'momo'],
    music: ['nepali pop', 'nepali folk'],
    film: ['nepali cinema'],
    lifestyle: ['dashain', 'tihar', 'trekking'],
    audiences: ['nepal', 'families', 'travelers'],
    giftIdeas: ['pashmina', 'tea', 'nepali handicrafts'],
  },
  en: {
    label: 'English',
    region: 'United States',
    countryCode: 'US',
    cityHints: ['New York', 'Los Angeles', 'London'],
    dining: ['american cuisine', 'brunch', 'food trucks', 'farm to table'],
    music: ['pop', 'indie', 'hip hop', 'rock'],
    film: ['hollywood', 'netflix series'],
    lifestyle: ['farmers markets', 'fitness culture', 'streaming'],
    audiences: ['young adults', 'professionals', 'foodies'],
    giftIdeas: ['craft coffee', 'local design', 'wellness', 'experiences'],
  },
  ar: {
    label: 'Arabic',
    region: 'Middle East',
    countryCode: 'AE',
    cityHints: ['Dubai', 'Riyadh', 'Cairo'],
    dining: ['middle eastern cuisine', 'shawarma', 'lebanese food', 'kunafa'],
    music: ['arabic pop', 'khaliji music', 'egyptian music'],
    film: ['arabic drama', 'egyptian cinema'],
    lifestyle: ['ramadan', 'family gatherings', 'majlis', 'coffee culture'],
    audiences: ['middle east', 'families', 'young adults'],
    giftIdeas: ['dates', 'arabic coffee', 'oud perfume', 'gold'],
  },
  es: {
    label: 'Spanish',
    region: 'Spain',
    countryCode: 'ES',
    cityHints: ['Madrid', 'Barcelona', 'Mexico City'],
    dining: ['spanish cuisine', 'tapas', 'paella', 'mexican food'],
    music: ['latin pop', 'reggaeton', 'spanish indie'],
    film: ['spanish cinema', 'latin american film'],
    lifestyle: ['fiestas', 'late dinners', 'football culture'],
    audiences: ['spain', 'latin america', 'young adults', 'foodies'],
    giftIdeas: ['wine', 'olive oil', 'local fashion'],
  },
  fr: {
    label: 'French',
    region: 'France',
    countryCode: 'FR',
    cityHints: ['Paris', 'Lyon', 'Marseille'],
    dining: ['french cuisine', 'bistro', 'pastry', 'wine bar'],
    music: ['french pop', 'chanson', 'french hip hop'],
    film: ['french cinema', 'arthouse'],
    lifestyle: ['cafe culture', 'markets', 'wine culture'],
    audiences: ['france', 'foodies', 'culture lovers'],
    giftIdeas: ['wine', 'perfume', 'pastry', 'fashion'],
  },
  de: {
    label: 'German',
    region: 'Germany',
    countryCode: 'DE',
    cityHints: ['Berlin', 'Munich', 'Hamburg'],
    dining: ['german cuisine', 'beer garden', 'bakery'],
    music: ['german pop', 'electronic', 'indie berlin'],
    film: ['german cinema', 'european film'],
    lifestyle: ['christmas markets', 'design', 'cycling'],
    audiences: ['germany', 'young adults', 'professionals'],
    giftIdeas: ['craft beer', 'design objects', 'chocolate'],
  },
  pt: {
    label: 'Portuguese',
    region: 'Brazil',
    countryCode: 'BR',
    cityHints: ['São Paulo', 'Rio de Janeiro', 'Lisbon'],
    dining: ['brazilian cuisine', 'churrasco', 'feijoada', 'portuguese food'],
    music: ['brazilian pop', 'sertanejo', 'funk'],
    film: ['brazilian cinema', 'portuguese film'],
    lifestyle: ['beach culture', 'football', 'festas'],
    audiences: ['brazil', 'portugal', 'young adults', 'foodies'],
    giftIdeas: ['coffee', 'beachwear', 'local design'],
  },
  ru: {
    label: 'Russian',
    region: 'Russia',
    countryCode: 'RU',
    cityHints: ['Moscow', 'Saint Petersburg'],
    dining: ['russian cuisine', 'pelmeni', 'georgian food', 'blini'],
    music: ['russian pop', 'russian rock'],
    film: ['russian cinema'],
    lifestyle: ['dacha culture', 'theatre', 'banya'],
    audiences: ['russia', 'families', 'young adults'],
    giftIdeas: ['chocolate', 'tea', 'warm accessories'],
  },
}

/** Fall back to English profile when a locale has no curated map yet. */
export function cultureProfileFor(locale = 'en') {
  const key = String(locale || 'en').toLowerCase()
  if (CULTURE_PROFILES[key]) return { locale: key, ...CULTURE_PROFILES[key] }
  if (key.startsWith('zh-han') || key === 'zh') return { locale: 'zh-cn', ...CULTURE_PROFILES['zh-CN'] }
  if (key.startsWith('zh')) return { locale: 'zh-tw', ...CULTURE_PROFILES['zh-TW'] }
  return { locale: 'en', ...CULTURE_PROFILES.en }
}

function encodeQuery(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      // Qloo rejects repeated filter.tags / signal.interests.* params
      // ("must be an array of at least one element"). One comma-joined value works.
      const items = v.filter((item) => item !== undefined && item !== null && item !== '')
      if (!items.length) continue
      q.set(k, items.join(','))
    } else {
      q.set(k, String(v))
    }
  }
  return q.toString()
}

// Qloo hackathon key is limited to ~5 requests/second (x-second-ratelimit-limit: 5).
// Parallel tag+search+insights bursts used to 429. Serialize every call.
let qlooQueue = Promise.resolve()
let qlooLastAt = 0
const QLOO_MIN_GAP_MS = 220

function scheduleQloo(fn) {
  const run = qlooQueue.then(async () => {
    const wait = QLOO_MIN_GAP_MS - (Date.now() - qlooLastAt)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  })
  qlooQueue = run.then(fn, fn)
  return qlooQueue
}

async function qlooGet(path, params, env = process.env) {
  const key = env.QLOO_API_KEY
  if (!key) {
    const e = new Error('qloo_not_configured'); e.statusCode = 503; throw e
  }
  return scheduleQloo(async () => {
    const url = `${qlooBase(env)}${path}?${encodeQuery(params)}`
    qlooLastAt = Date.now()
    const res = await fetch(url, {
      headers: {
        'X-Api-Key': key,
        accept: 'application/json',
      },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const e = new Error(body?.errors?.[0]?.message || body?.message || body?.error || `qloo_http_${res.status}`)
      e.statusCode = res.status === 401 || res.status === 403 ? 401 : res.status === 429 ? 429 : 502
      e.detail = body
      throw e
    }
    return body
  })
}

/**
 * Score a Qloo tag so culture-specific cuisine/genre tags beat generic ones.
 * Example: urn:tag:cuisine:qloo:khmer >> urn:tag:offerings:place:cuisine
 */
function scoreTag(tag, cultureWords = []) {
  const id = String(tag?.id || '').toLowerCase()
  const name = String(tag?.name || '').toLowerCase()
  const blob = `${id} ${name}`
  let score = 0
  if (id.includes(':cuisine:') || id.includes(':genre:place:restaurant') || id.includes(':category:place:')) score += 30
  if (id.includes(':genre:music:') || id.includes(':genre:movie')) score += 20
  for (const w of cultureWords) {
    const word = String(w || '').toLowerCase()
    if (word && (name.includes(word) || id.includes(word))) score += 25
  }
  if (id.includes('cuisine:qloo:')) score += 15
  if (/offerings|amenity|decor|parking|price/.test(id)) score -= 10
  // popularity is 0..1
  if (typeof tag?.popularity === 'number') score += tag.popularity * 5
  return score
}

/**
 * Resolve freeform keywords to Qloo tag URNs via /v2/tags.
 * Live shape: results.tags[] = { id: 'urn:tag:...', name, type, parents }
 * Query param is filter.query (not query).
 * Culture-specific cuisine/genre tags are ranked first so insights stay local.
 */
export async function resolveTagIds(keywords, limit = 10, env = process.env, cultureWords = []) {
  const collected = new Map()
  for (const keyword of keywords.slice(0, 6)) {
    try {
      const body = await qlooGet('/v2/tags', { 'filter.query': keyword, take: 5 }, env)
      const tags = body?.results?.tags || []
      for (const t of Array.isArray(tags) ? tags : []) {
        const id = t?.id || t?.tag_id
        if (id && !collected.has(id)) collected.set(id, t)
      }
    } catch {
      // A single missing keyword must not fail the whole culture call.
    }
    if (collected.size >= limit * 3) break
  }
  return [...collected.values()]
    .sort((a, b) => scoreTag(b, cultureWords) - scoreTag(a, cultureWords))
    .map((t) => t.id || t.tag_id)
    .filter(Boolean)
    .slice(0, limit)
}

/**
 * Resolve names to Qloo entity UUIDs via /search.
 * Live shape: results[] = { entity_id: UUID, name, types: ['urn:entity:place'], properties }
 */
export async function resolveEntityIds(names, types = [], limit = 6, env = process.env) {
  const ids = []
  const seen = new Set()
  for (const name of names.slice(0, 6)) {
    try {
      const params = { query: name, take: 3 }
      if (types.length) params.types = types.join(',')
      const body = await qlooGet('/search', params, env)
      const results = body?.results || []
      for (const r of Array.isArray(results) ? results : []) {
        const id = r?.entity_id || r?.id || r?.urn
        if (id && !seen.has(id)) {
          seen.add(id)
          ids.push(id)
        }
      }
      if (ids.length >= limit) break
    } catch {
      // keep going
    }
  }
  return ids.slice(0, limit)
}

const INTENT_TO_TYPE = {
  dining: 'urn:entity:place',
  food: 'urn:entity:place',
  restaurants: 'urn:entity:place',
  travel: 'urn:entity:destination',
  trip: 'urn:entity:destination',
  weekend: 'urn:entity:destination',
  places: 'urn:entity:place',
  gifts: 'urn:entity:brand',
  shopping: 'urn:entity:brand',
  brands: 'urn:entity:brand',
  fashion: 'urn:entity:brand',
  music: 'urn:entity:artist',
  film: 'urn:entity:movie',
  movies: 'urn:entity:movie',
  tv: 'urn:entity:tv_show',
  shows: 'urn:entity:tv_show',
  books: 'urn:entity:book',
  podcasts: 'urn:entity:podcast',
  games: 'urn:entity:video_game',
  people: 'urn:entity:person',
  general: 'urn:entity:destination',
}

const INTENT_KEYWORDS = {
  dining: (p) => [...p.dining, ...p.cityHints],
  food: (p) => [...p.dining, ...p.cityHints],
  restaurants: (p) => [...p.dining, ...p.cityHints],
  travel: (p) => [...p.cityHints, ...p.lifestyle, ...p.dining],
  trip: (p) => [...p.cityHints, ...p.lifestyle, ...p.dining],
  weekend: (p) => [...p.cityHints, ...p.lifestyle, ...p.dining],
  places: (p) => [...p.cityHints, ...p.lifestyle, ...p.dining],
  gifts: (p) => [...p.giftIdeas, ...p.lifestyle],
  shopping: (p) => [...p.giftIdeas, ...p.lifestyle],
  brands: (p) => [...p.giftIdeas],
  fashion: (p) => [...p.giftIdeas, ...p.lifestyle],
  music: (p) => p.music,
  film: (p) => p.film,
  movies: (p) => p.film,
  tv: (p) => p.film,
  shows: (p) => p.film,
  books: (p) => [...p.lifestyle, p.region],
  podcasts: (p) => [...p.lifestyle, p.region],
  games: (p) => [...p.lifestyle, 'gaming', p.region],
  people: (p) => [...p.music, ...p.film],
  general: (p) => [...p.cityHints, ...p.dining, ...p.music, ...p.lifestyle],
}

function pickEntityType(intent, explicit) {
  if (explicit && String(explicit).startsWith('urn:entity:')) return explicit
  if (explicit) {
    const alias = String(explicit).toLowerCase().replace(/-/g, '_')
    const map = {
      place: 'urn:entity:place',
      destination: 'urn:entity:destination',
      brand: 'urn:entity:brand',
      artist: 'urn:entity:artist',
      movie: 'urn:entity:movie',
      tv_show: 'urn:entity:tv_show',
      book: 'urn:entity:book',
      podcast: 'urn:entity:podcast',
      video_game: 'urn:entity:video_game',
      person: 'urn:entity:person',
    }
    if (map[alias]) return map[alias]
  }
  return INTENT_TO_TYPE[intent] || 'urn:entity:destination'
}

function slimEntity(e) {
  if (!e || typeof e !== 'object') return null
  const p = e.properties || {}
  const address = typeof p.address === 'string'
    ? p.address
    : p.address
      ? [p.address.street, p.address.city, p.address.region, p.address.country].filter(Boolean).join(', ')
      : undefined
  return {
    id: e.entity_id || e.id || e.urn || null,
    name: e.name || e.title || null,
    type: e.subtype || e.type || e.types?.[0] || null,
    description: typeof p.description === 'string' ? p.description.slice(0, 220) : undefined,
    properties: {
      address,
      city: p.address?.city || undefined,
      country: p.address?.country || undefined,
      image: typeof p.image === 'string' ? p.image : p.image?.url || undefined,
      website: p.website || undefined,
      business_rating: p.business_rating || undefined,
      price_level: p.price_range || p.price_level || undefined,
      primary_genre: p.primary_genre || undefined,
    },
    popularity: e.popularity ?? e.score ?? undefined,
  }
}

/**
 * Cultural insights for a locale + intent. This is the Qloo-backed brain of
 * "AI that understands your culture".
 */
export async function culturalInsights({
  locale = 'en',
  intent = 'general',
  entityType,
  query,
  limit = 6,
} = {}, env = process.env) {
  if (!qlooConfigured(env)) {
    const e = new Error('qloo_not_configured'); e.statusCode = 503; throw e
  }
  const profile = cultureProfileFor(locale)
  const type = pickEntityType(intent, entityType)
  const keywordFn = INTENT_KEYWORDS[intent] || INTENT_KEYWORDS.general
  const keywords = keywordFn(profile)
  if (query && String(query).trim()) {
    keywords.unshift(String(query).trim())
  }

  const isGiftIntent = ['gifts', 'shopping', 'brands', 'fashion'].includes(intent)
  const isTravelIntent = ['travel', 'trip', 'weekend', 'places'].includes(intent)

  const entityNamePool = isGiftIntent
    ? [...(query ? [String(query)] : []), ...profile.giftIdeas, ...profile.lifestyle]
    : isTravelIntent
      ? [...(query ? [String(query)] : []), ...profile.cityHints]
      : [...(query ? [String(query)] : []), ...profile.cityHints, ...keywords]

  const [tagIds, entityIds] = await Promise.all([
    resolveTagIds(
      [...keywords, profile.region, profile.label].slice(0, 10),
      12,
      env,
      [profile.label, profile.region, ...(profile.dining || []).slice(0, 4)],
    ),
    resolveEntityIds(
      entityNamePool.slice(0, 8),
      // gifts: leave types open so "stationery" / "japanese snacks" can match brands
      isGiftIntent ? [] : [type],
      6,
      env,
    ),
  ])

  if (!tagIds.length && !entityIds.length) {
    return {
      success: false,
      error: 'No Qloo taste signals resolved for this culture and intent. Try a broader intent (dining, gifts, music, travel).',
      code: 'no_signals',
      locale: profile.locale,
      culture: profile.label,
    }
  }

  // Insights API is GET /v2/insights. Keep signals intent-specific:
  // dining  -> cuisine tags only (city entity signals pull in markets/buses)
  // travel  -> city entity signals (location filter often empties the set)
  // gifts   -> brand entity signals from gift seeds
  // music   -> music tags / artist signals
  const params = {
    'filter.type': type,
    take: Math.min(12, Math.max(3, Number(limit) || 6)),
  }
  const isDining = intent === 'dining' || intent === 'food' || intent === 'restaurants'
  const isTravel = ['travel', 'trip', 'weekend', 'places', 'general'].includes(intent)
  const isGift = ['gifts', 'shopping', 'brands', 'fashion'].includes(intent)

  if (isDining && tagIds.length) {
    // One cuisine tag keeps the set restaurant-local. Two OR tags pull in WOK chains.
    params['filter.tags'] = tagIds.slice(0, 1)
    if (!params['filter.tags'].length && entityIds.length) {
      params['signal.interests.entities'] = entityIds.slice(0, 2)
    }
  } else if (isTravel) {
    if (entityIds.length) {
      params['signal.interests.entities'] = entityIds.slice(0, 4)
    } else if (tagIds.length) {
      params['filter.tags'] = tagIds.slice(0, 4)
    }
  } else if (isGift) {
    // Entity signals alone work (MUJI -> GU / Uniqlo-adjacent brands).
    // Combining filter.tags with signals often ANDs down to zero results.
    if (entityIds.length) {
      params['signal.interests.entities'] = entityIds.slice(0, 4)
    } else if (tagIds.length) {
      const giftTags = tagIds.filter((id) => /gift|brand|fashion|beauty|souvenir/i.test(id)).slice(0, 3)
      if (giftTags.length) params['filter.tags'] = giftTags
    }
  } else {
    if (tagIds.length) params['filter.tags'] = tagIds.slice(0, 5)
    if (entityIds.length) params['signal.interests.entities'] = entityIds.slice(0, 3)
  }

  // entity seeds for travel/gifts/music come from different name lists
  const entitySeeds = isGift
    ? [...(query ? [String(query)] : []), ...profile.giftIdeas, ...profile.lifestyle].slice(0, 8)
    : isTravel
      ? [...(query ? [String(query)] : []), ...profile.cityHints].slice(0, 8)
      : [...(query ? [String(query)] : []), ...profile.cityHints, ...keywords].slice(0, 8)

  // If we still have no signal, resolve entities for the right intent and retry params.
  if (!params['filter.tags'] && !params['signal.interests.entities']) {
    const moreEntities = await resolveEntityIds(entitySeeds, [type], 6, env)
    if (moreEntities.length) params['signal.interests.entities'] = moreEntities.slice(0, 4)
    if (!params['signal.interests.entities'] && tagIds.length) {
      params['filter.tags'] = tagIds.slice(0, 4)
    }
  }

  let insights
  try {
    insights = await qlooGet('/v2/insights', params, env)
  } catch (error) {
    // Location filter can empty a valid tag set. Retry without it, then tags-only.
    delete params['filter.location.query']
    try {
      insights = await qlooGet('/v2/insights', params, env)
    } catch (error2) {
      // Last resort: drop tags and keep entity interest only.
      delete params['filter.tags']
      if (!params['signal.interests.entities']) {
        throw error2.statusCode ? error2 : error
      }
      try {
        insights = await qlooGet('/v2/insights', params, env)
      } catch {
        throw error2.statusCode ? error2 : error
      }
    }
  }

  let raw = insights?.results?.entities || []
  let entities = (Array.isArray(raw) ? raw : []).map(slimEntity).filter(Boolean)

  // Filter out obvious non-matches when we asked for dining or culture-specific picks.
  if (isDining && entities.length > 1) {
    const cultureHit = new RegExp(
      [profile.label, profile.region, 'khmer', 'cambodian', 'thai', 'japanese', 'indonesian']
        .filter(Boolean)
        .join('|'),
      'i',
    )
    const cultureFirst = [
      ...entities.filter((e) => cultureHit.test(`${e.name} ${e.properties?.address || ''}`)),
      ...entities.filter((e) => !cultureHit.test(`${e.name} ${e.properties?.address || ''}`)),
    ]
    entities = cultureFirst
  }

  return {
    success: true,
    source: 'qloo',
    requiresCitation: true,
    retrievedAt: new Date().toISOString(),
    locale: profile.locale,
    culture: profile.label,
    region: profile.region,
    intent,
    entityType: type,
    profile: {
      cityHints: profile.cityHints,
      dining: profile.dining,
      music: profile.music,
      film: profile.film,
      lifestyle: profile.lifestyle,
      giftIdeas: profile.giftIdeas,
      audiences: profile.audiences,
    },
    signals: {
      tags: tagIds,
      entities: entityIds,
    },
    entities,
    note:
      'Ground recommendations in these Qloo cultural taste signals. Prefer items that fit the user\'s culture and intent. Cite entity names. Do not invent local specialties that are not here.',
  }
}

/** Compact model-facing view (mirrors compactSearchForModel). */
export function compactCultureForModel(out) {
  if (!out || out.error || out.success === false) {
    return { error: out?.error || out?.message || 'culture_unavailable' }
  }
  return {
    culture: out.culture,
    region: out.region,
    intent: out.intent,
    retrievedAt: out.retrievedAt,
    topPicks: (out.entities || []).slice(0, 5).map((e) => ({
      name: e.name,
      type: e.type,
      why: e.description || e.properties?.address || e.properties?.city || undefined,
    })),
    cultureHints: {
      dining: (out.profile?.dining || []).slice(0, 4),
      lifestyle: (out.profile?.lifestyle || []).slice(0, 3),
      giftIdeas: (out.profile?.giftIdeas || []).slice(0, 3),
    },
    instruction:
      'Answer in the user\'s language. Use these Qloo taste signals so recommendations feel local, not generic. Name the places, brands, or artists you used.',
  }
}
