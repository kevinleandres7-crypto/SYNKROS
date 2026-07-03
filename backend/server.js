const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (req, res) => {
    res.send('¡Servidor de SYNKROS funcionando con éxito!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'SYNKROS en línea y funcionando', timestamp: new Date() });
});

app.post('/api/events', (req, res) => {
    const { title, flexibility } = req.body;
    console.log(`[Mod 4] Evento recibido: "${title}" | Flexibilidad: ${flexibility}`);
    res.json({ success: true, message: 'Evento procesado por SYNKROS' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Motor de SYNKROS corriendo en http://0.0.0.0:${PORT}`);
});

