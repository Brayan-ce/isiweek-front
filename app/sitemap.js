const BASE = "https://pos.ambrysoft.com"

export default function sitemap() {
  return [
    { url: `${BASE}/`,          lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${BASE}/planes`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/registrar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/login`,     lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contacto`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ]
}
