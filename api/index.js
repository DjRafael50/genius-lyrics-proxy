const express = require('express');
const fetch = require('node-fetch');

const app = express();

app.get('/api', async (req, res) => {
  const { artist, title } = req.query;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Parâmetros ausentes' });
  }

  try {
    const accessToken = process.env.GENIUS_TOKEN;
    const query = encodeURIComponent(`${artist} ${title}`);
    const searchUrl = `https://api.genius.com/search?q=${query}`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const searchJson = await searchRes.json();
    const hit = searchJson.response.hits[0];
    if (!hit) return res.json({ error: 'Música não encontrada' });

    const songUrl = hit.result.url;
    const pageRes = await fetch(songUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const html = await pageRes.text();

    // Busca os dados JSON embutidos no script
    const jsonMatch = html.match(/<script[^>]*>window\.__PRELOADED_STATE__ = (.*?);\s*<\/script>/);
    if (!jsonMatch || !jsonMatch[1]) {
      return res.json({ error: 'Bloco JSON não encontrado' });
    }

    const jsonData = JSON.parse(jsonMatch[1]);
    const songData = jsonData.songPage?.lyricsData?.body?.html;
    if (!songData) {
      return res.json({ error: 'Letra não encontrada no JSON' });
    }

    // Remover tags HTML da letra
    const plainLyrics = songData.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

    res.json({ artist, title, url: songUrl, lyrics: plainLyrics });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor', details: err.message });
  }
});

module.exports = app;
