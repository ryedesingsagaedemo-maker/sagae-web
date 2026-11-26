# Verificador de documentacion

Regla: todo cambio de codigo va acompanado de la actualizacion de la documentacion (aviso de privacidad, terminos, inventario).

    node tools/verificar-documentacion.js              # verifica (exit 1 si algo no esta al dia)
    node tools/verificar-documentacion.js --registrar  # registra la huella de una version NUEVA (nunca sobrescribe una ya registrada)
    node tools/prueba-verificador.js                   # demuestra que el verificador detecta cada error

Comprueba:
1. Todo host externo usado por el codigo esta en `privacidad/inventario-datos.json` (`proveedores`).
2. Cada `mencionEnAviso` aparece literalmente en `aviso-privacidad.html`.
3. Cada clave de localStorage/sessionStorage del codigo esta inventariada, y viceversa.
4. Las versiones (meta del aviso y de los terminos, constantes del codigo) coinciden con el inventario.
5. El texto del aviso/terminos no cambio sin subir su version (huella SHA-256).
6. La version de `sw.js` coincide con `register("sw.js?v=X.Y")` del movil.

Flujo al cambiar el texto legal: edita el documento, sube su version (meta + inventario + constantes), corre `--registrar`.
Se ejecuta automaticamente en GitHub Actions (`.github/workflows/verificar.yml`).
