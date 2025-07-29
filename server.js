const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const users = JSON.parse(fs.readFileSync('./db.json', 'utf8')).users;
const pcloudToken = 'YOUR_PCLOUD_TOKEN'; // Replace with your real token
const songsFolderId = 'YOUR_FOLDER_ID';  // Replace with your real pCloud folder ID

app.use(express.static('.'));
app.use(express.json());

// Simple in-memory session (for demo only)
let sessionUser = null;

// Signup
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) return res.status(400).end();
  users.push({ username, password });
  fs.writeFileSync('./db.json', JSON.stringify({ users }));
  sessionUser = username;
  res.end();
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).end();
  sessionUser = username;
  res.end();
});

// Fetch songs from pCloud
app.get('/songs', async (req, res) => {
  if (!sessionUser) return res.status(403).json([]);
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const apiUrl = `https://api.pcloud.com/listfolder?folderid=${songsFolderId}&auth=${pcloudToken}`;
  const result = await fetch(apiUrl).then(r => r.json());
  const songs = result.metadata.contents.filter(f => f.name.endsWith('.mp3')).map(f => ({
    name: f.name,
    link: `https://eapi.pcloud.com/getfilelink?fileid=${f.fileid}&auth=${pcloudToken}`
  }));
  const links = await Promise.all(songs.map(async s => {
    const l = await fetch(s.link).then(r => r.json());
    return { name: s.name, link: l.hosts[0] + l.path };
  }));
  res.json(links);
});

app.listen(3000, () => console.log('Soundify running on http://localhost:3000'));
