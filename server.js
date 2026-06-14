const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8742;

app.use(compression());
app.use(express.static(path.join(__dirname)));

// SPA fallback: все маршруты → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`СТРАТЕГОС запущен на http://localhost:${PORT}`);
});
