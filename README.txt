TRIPAS DE ACHILATA — SITIO ESTÁTICO

Contenido:
- index.html: página principal
- assets\styles.css: estilos
- assets\app.js: buscador y archivo por año
- assets\posts.json: copia estática de las 26 entradas del archivo público consultado

La portada destaca 2018, el año de origen indicado para los proyectos, y muestra primero sus 11 entradas. Las demás entradas y sus contenidos se muestran a continuación, agrupados por año; el buscador y los filtros permiten recorrerlas. Una entrada de audio del archivo original no conserva texto ni cuerpo publicado, por lo que la página la señala sin inventar contenido.

La entrada "CONTAGIANDO PALABRAS. LA HISTORIA - EBOOK" incluye un visor de Google Drive y un enlace alternativo para abrir o descargar el PDF. El archivo de Drive debe seguir compartido para que los visitantes puedan verlo.

Publicar conectando un repositorio Git:
1. Sube el contenido de esta carpeta a un repositorio de GitHub.
2. Entra en https://vercel.com/new e inicia sesión.
3. Importa ese repositorio. Vercel detectará que es un sitio estático.
4. Deja el directorio raíz en "." y el comando de compilación vacío; pulsa Deploy.

Publicar con Vercel CLI:
1. Instala Node.js si todavía no está instalado.
2. Abre una terminal en esta carpeta.
3. Ejecuta: npm install -g vercel
4. Ejecuta: vercel
5. Para publicar la versión de producción, ejecuta: vercel --prod

Las imágenes de la galería se cargan desde Unsplash y el video desde YouTube; se necesita conexión a internet para verlos.
