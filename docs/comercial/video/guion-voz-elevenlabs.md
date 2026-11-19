# SAGAE — Video promocional (vertical 1080×1920, 42 s)

Texto para generar la voz en ElevenLabs (español, tono cercano y seguro, ritmo medio).
Genera **cada línea como clip aparte** y colócala en el segundo indicado; así encaja con las escenas.

| # | Entra en | Escena en pantalla | Locución |
|---|----------|--------------------|----------|
| 1 | 0.4 s  | "¿Todavía controlas tu escuela en hojas sueltas?" | Lunes, siete de la mañana. ¿Todavía controlas el inventario de tu escuela en hojas sueltas y WhatsApp? |
| 2 | 6.0 s  | "Un solo lugar" | Con SAGAE, todo queda en un solo lugar. |
| 3 | 10.0 s | Escanea el QR. Y listo. | Escanea el código QR de cualquier equipo y consulta su ubicación e historial al instante. |
| 4 | 16.4 s | Del reporte a la solución | Un docente reporta una falla. El técnico la recibe, la atiende… y todos quedan al tanto. |
| 5 | 23.2 s | Todo tu inventario, bajo control | Equipos, mobiliario, licencias y mantenimientos. Con alertas antes de que algo venza. |
| 6 | 29.8 s | Seguro desde el diseño | Cada persona ve solo lo que le corresponde, con verificación en dos pasos y respaldo automático. |
| 7 | 35.8 s | Pide tu demo | SAGAE. Todo el control de tu institución, en un solo lugar. Pide tu demostración. |

Cada línea dura 3–6 s; si una te queda más larga, acelérala un poco en ElevenLabs (Speed 1.05–1.1).

## Unir la voz al video (ffmpeg)

1. Exporta cada clip como `v1.mp3` … `v7.mp3`.
2. Ejecuta en esta carpeta:

```bash
ffmpeg -i SAGAE-Video-Promocional-sin-voz.mp4 \
 -i v1.mp3 -i v2.mp3 -i v3.mp3 -i v4.mp3 -i v5.mp3 -i v6.mp3 -i v7.mp3 \
 -filter_complex "[1]adelay=400|400[a1];[2]adelay=6000|6000[a2];[3]adelay=10000|10000[a3];[4]adelay=16400|16400[a4];[5]adelay=23200|23200[a5];[6]adelay=29800|29800[a6];[7]adelay=35800|35800[a7];[a1][a2][a3][a4][a5][a6][a7]amix=inputs=7:normalize=0[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest SAGAE-Video-Promocional.mp4
```

(Si prefieres un solo clip de voz corrido, también sirve: `-i voz.mp3 -map 0:v -map 1:a`.)

## Notas
- El QR final abre el chat de WhatsApp 6225-1042 con el mensaje "quiero la prueba gratis de 1 mes de SAGAE".
- Se quitó la etiqueta "Probado en una escuela real" (19 nov 2026) hasta contar con autorización escrita del colegio piloto.
- Los datos de la tarjeta (Laptop Dell, Prof. Ruiz, etc.) son de ejemplo.
- Versión 2026-11-19: todas las capturas se rehicieron con **datos de demostración inventados** (Colegio Demo SAGAE) usando `fuente/demo-datos/` (servidor simulado + datos ficticios). No contiene cifras ni nombres reales.
- El cierre muestra el WhatsApp y la dirección `sagae.ryedesign.app`.
