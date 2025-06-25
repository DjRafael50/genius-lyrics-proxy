// Node.js + Express + Cheerio scraper para Genius
const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

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

    const $ = cheerio.load(html);
    let lyrics = '';
    // Tentar seletor moderno
let blocks = $('[data-lyrics-container="true"]');

if (blocks.length > 0) {
  blocks.each((i, el) => {
    const line = $(el).text().trim();
    if (line) lyrics += line + '\n';
  });
} else {
  // Tentar seletor antigo
  const legacy = $('div.lyrics').text().trim();
  if (legacy) {
    lyrics = legacy;
  }
}

    if (!lyrics) {
      lyrics = $('div.lyrics').text().trim();
    }

    if (!lyrics) return res.json({ error: 'Letra não encontrada' });
    
    console.log("🎵 Letra encontrada:\n", lyrics);
    res.json({ artist, title, url: songUrl, lyrics: lyrics.trim() });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor', details: err.message });
  }
});

module.exports = app;
