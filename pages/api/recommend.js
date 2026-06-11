async function fetchPosterAndId(title, year) {
  try {
    const query = encodeURIComponent(title)
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${query}&year=${year}&language=en-US`)
    const data = await res.json()
    let match = data.results?.[0]
    if (!match) {
      const res2 = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${query}&language=en-US`)
      const data2 = await res2.json()
      match = data2.results?.[0]
    }
    if (!match) return { poster_url: '', watch_url: '' }
    const poster_url = match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : ''
    const slug = (match.title || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const watch_url = `https://flixmomo.app/movie/${match.id}/${slug}`
    return { poster_url, watch_url }
  } catch { return { poster_url: '', watch_url: '' } }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { genre, rating, language, country, decade, yearFrom, yearTo, durationMin, durationMax, count, vibe, indieMode, indieCountry, exclude = [] } = req.body
  const exclusion = exclude.length > 0 ? `Do NOT recommend any of these films: ${exclude.join(', ')}.` : ''
  const vibeText = vibe || 'any'

  const yearFilter = yearFrom || yearTo
    ? `Released between ${yearFrom || 1900} and ${yearTo || new Date().getFullYear()}`
    : decade ? `From the ${decade}` : 'any year'

  const isAsianCountry = ['Japan','South Korea','China','Taiwan','Hong Kong','Thailand','Philippines','Indonesia','Vietnam','Malaysia','India'].includes(indieCountry)
  const asianContext = isAsianCountry || (!indieCountry)
    ? `Draw inspiration from Asian Movie Pulse (asianmoviepulse.com) — arthouse, festival circuit, slow cinema, experimental. Think Kore-eda, Hong Sang-soo, Apichatpong Weerasethakul, Tsai Ming-liang, Hamaguchi.`
    : ''

  const vibeScoreRubric = `- vibe_score (float to 2 decimal places, e.g. 7.83, 9.21, 6.40 — range 1.00 to 10.00): how precisely this film matches the user vibe: "${vibeText}". Be strict and granular — most films should score between 5.00-8.50. Reserve 9.00+ only for near-perfect matches. 9.50-10.00=film is essentially defined by this exact feeling. 8.50-9.49=very strong match, vibe is core to the film. 7.00-8.49=clear match, vibe is present but not defining. 5.00-6.99=partial match, some elements align. 3.00-4.99=loose match. 1.00-2.99=weak or incidental match. If vibe is "any", give 6.50 to all. Do NOT cluster scores — spread them out meaningfully.
- vibe_reason (string — one short sentence explaining the precise score)`

  const prompt = indieMode
    ? `Recommend exactly ${count} real indie films available to watch FREE or on streaming (YouTube, Tubi, Mubi, Kanopy, Amazon Prime, Netflix, Vimeo).
- Genre: ${genre || 'any'}
- Country: ${indieCountry || 'any'}
- Vibe: ${vibeText}
${asianContext}
${exclusion}

Reply ONLY with a raw JSON array. No markdown, no fences.
Each object must have:
- title (string)
- year (number)
- country (string)
- language (string)
- imdb_rating (number)
- genre (string)
- description (array of 2-3 short bullet strings e.g. ["Quiet and contemplative", "Explores isolation beautifully"])
- watch_url (string — real direct URL to watch)
- watch_platform (string — e.g. "YouTube", "Tubi", "Mubi", "Kanopy")
- trailer_query (string)
${vibeScoreRubric}`
    : `Recommend exactly ${count} real well-known films matching:
- Genre: ${genre || 'any'}
- Min IMDb rating: ${rating}+
- Language: ${language || 'any'}
- Country: ${country || 'any'}
- Year: ${yearFilter}
- Duration: ${durationMin || 0} to ${durationMax || 210} minutes
- Vibe: ${vibeText}
${exclusion}

Reply ONLY with a raw JSON array. No markdown, no fences.
Each object must have:
- title (string)
- year (number)
- country (string)
- language (string)
- imdb_rating (number)
- genre (string)
- duration_mins (number)
- description (array of 2-3 short bullet strings e.g. ["Visually stunning cinematography", "Slow burn emotional depth"])
- trailer_query (string e.g. "Parasite 2019 official trailer")
${vibeScoreRubric}`

  try {
    let response, data, attempts = 0

    while (attempts < 3) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 2000
        })
      })
      data = await response.json()

      if (data.error?.message?.includes('Rate limit')) {
        attempts++
        const waitMatch = data.error.message.match(/try again in ([\d.]+)s/)
        const wait = waitMatch ? parseFloat(waitMatch[1]) * 1000 + 500 : 8000
        await new Promise(r => setTimeout(r, wait))
      } else {
        break
      }
    }

    if (data.error) throw new Error(data.error.message)
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()
    const allFilms = JSON.parse(raw)

    // Filter out films with vibe score below 7
    const films = allFilms.filter(f => !f.vibe_score || Number(f.vibe_score) >= 7.0)

    const filmsWithPosters = await Promise.all(
      films.map(async (film) => {
        const { poster_url, watch_url } = await fetchPosterAndId(film.title, film.year)
        return { ...film, poster_url, watch_url }
      })
    )

    res.setHeader('Cache-Control', 'no-store, max-age=0')
    res.status(200).json({ films: filmsWithPosters })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Failed to get recommendations' })
  }
}
