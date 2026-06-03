async function fetchPoster(title, year) {
  try {
    const query = encodeURIComponent(title)
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${query}&year=${year}&language=en-US`
    const res = await fetch(url)
    const data = await res.json()
    const match = data.results?.[0]
    if (match?.poster_path) {
      return `https://image.tmdb.org/t/p/w500${match.poster_path}`
    }
    // fallback: search without year
    const res2 = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${query}&language=en-US`)
    const data2 = await res2.json()
    const match2 = data2.results?.[0]
    if (match2?.poster_path) {
      return `https://image.tmdb.org/t/p/w500${match2.poster_path}`
    }
    return ''
  } catch {
    return ''
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { genre, rating, language, country, decade, yearFrom, yearTo, count, vibe, exclude = [] } = req.body
  const exclusion = exclude.length > 0 ? `Do NOT recommend any of these films: ${exclude.join(', ')}.` : ''

  const yearFilter = yearFrom || yearTo
    ? `Released between ${yearFrom || 1900} and ${yearTo || new Date().getFullYear()}`
    : decade ? `From the ${decade}` : 'any year'

  const prompt = `Recommend exactly ${count} real well-known films matching:
- Genre: ${genre || 'any'}
- Minimum IMDb rating: ${rating}+
- Language: ${language || 'any'}
- Country: ${country || 'any'}
- Year: ${yearFilter}
- Vibe/mood: ${vibe || 'any'}
${exclusion}

Reply ONLY with a raw JSON array. No markdown, no fences, no explanation.
Each object must have exactly:
- title (string)
- year (number)
- country (string)
- language (string)
- imdb_rating (number)
- genre (string)
- description (2 sentences max on why it fits)
- trailer_query (e.g. "Parasite 2019 official trailer")`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 2000
      })
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()
    const films = JSON.parse(raw)

    // Fetch real posters from TMDB in parallel
    const filmsWithPosters = await Promise.all(
      films.map(async (film) => ({
        ...film,
        poster_url: await fetchPoster(film.title, film.year)
      }))
    )

    res.status(200).json({ films: filmsWithPosters })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || 'Failed to get recommendations' })
  }
}
