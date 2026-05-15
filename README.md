# NeuralForge

App personal tipo PWA para entrenar IA, deep learning y matemáticas con preguntas creadas por ti.

## Qué incluye

- Test diario de preguntas avanzadas.
- Corrección con respuesta esperada.
- Checklist ponderado.
- Rúbrica 0–5.
- Historial local en el navegador.
- Racha diaria.
- Banco de preguntas.
- Vista de errores.
- Exportación del progreso.

## Cómo añadir tus preguntas

Edita `questions.json`.

Cada pregunta debe tener esta forma:

```json
{
  "id": "mi-id-unico-001",
  "topic": "Transformers",
  "difficulty": 9,
  "type": "derivation",
  "question": "Tu pregunta aquí",
  "expected_answer": [
    "Punto esperado 1",
    "Punto esperado 2"
  ],
  "checklist": [
    {
      "label": "Criterio que debería aparecer en tu respuesta",
      "weight": 2
    }
  ],
  "rubric": {
    "5": "Respuesta excelente.",
    "4": "Respuesta muy buena.",
    "3": "Respuesta aceptable.",
    "2": "Respuesta parcial.",
    "1": "Respuesta muy floja.",
    "0": "Respuesta incorrecta o vacía."
  },
  "tags": ["tag1", "tag2"]
}
```

## Cómo probarla en tu ordenador

Por seguridad, no abras `index.html` directamente como archivo local. Lánzala con un servidor local.

Con Python:

```bash
cd NeuralForge
python3 -m http.server 8000
```

Luego abre:

```text
http://localhost:8000
```

## Cómo subirla gratis a GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos estos archivos.
3. Ve a Settings → Pages.
4. En Source, selecciona la rama `main`.
5. Abre la URL que te da GitHub Pages.
6. En el móvil, abre esa URL y usa “Añadir a pantalla de inicio”.

## Notas

- El progreso se guarda en `localStorage`, es decir, en el navegador del dispositivo.
- Si borras datos del navegador, puedes perder el progreso. Usa “Exportar progreso” de vez en cuando.
