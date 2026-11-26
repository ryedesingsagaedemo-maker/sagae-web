# SAGAE — Notas operativas para sesiones de trabajo (repositorio PÚBLICO)

Este repositorio es **público**. Aquí va **solo** el programa publicado. Todo lo demás (servidor, documentos
legales, plan de tareas, informes de seguridad, estado interno) vive en el repositorio **privado**
`ryedesingsagaedemo-maker/sagae-privado`. Lee allí `docs/coordinacion/ESTADO-SAGAE.md` y
`docs/coordinacion/PLAN-TAREAS-*.md` antes de empezar.

## Reglas
- **Nunca** subir aquí: código del servidor, documentos legales o comerciales, informes o checklists de
  seguridad, claves, tokens, contraseñas, datos o nombres de clientes (ni del colegio piloto).
- GitHub Pages publica solo `main`. **Publicar en `main` únicamente con OK expreso del titular.**
- Trabajar y probar antes; cambios pequeños, un cambio por commit.
- Portal web y móvil son casi uno: todo cambio de lógica va en `index.html` **y** `SAGAE_index_mobile.html`;
  si afecta la app instalada, subir la versión de `sw.js` y el `?v=` del registro en el móvil.
- `index.html`, `SAGAE_index_mobile.html` y `sw.js` usan saltos de línea CRLF: conservarlos (revisar `git diff --stat`).
- Dominio: `sagae.ryedesign.app` (archivo `CNAME`).
- Idioma: español. El titular es hombre: usar masculino.

## Documentación obligatoria (titular, 26 nov 2026)
- Ningún cambio sin su documentación. Antes de cada commit: `node tools/verificar-documentacion.js` (debe decir OK); corre solo en GitHub Actions en cada push.
- Si cambia el texto de `aviso-privacidad.html` o `terminos-de-uso.html`: subir su versión (meta + texto visible + `privacidad/inventario-datos.json` + `AVISO_PRIVACIDAD_VERSION` del portal) y registrar la huella con `--registrar`.
- La forma de trabajo completa, el estado y la memoria del proyecto están en el repositorio privado (`CLAUDE.md` y `docs/coordinacion/ESTADO-SAGAE.md`).
