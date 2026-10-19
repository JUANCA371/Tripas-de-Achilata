TRIPAS DE ACHILATA — SITIO ESTÁTICO

Estructura:
- index.html: portada y estructura semántica de la página.
- assets\css\styles.css: estilos propios, paleta, diseño adaptable y temas.
- assets\js\app.js: archivo interactivo, buscador, filtros y cambio visual.
- assets\data\posts.json: copia estática de las 26 entradas del archivo público.

La interfaz usa Bootstrap 5.3.3 desde jsDelivr, Roboto y Lora desde Google Fonts, además de estilos propios. La portada incluye un carrusel de dos fotos de grupos de estudiantes con transición suave y controles accesibles; se detiene al pasar el puntero o el foco y respeta la preferencia de movimiento reducido. También muestra tres historias destacadas con imágenes; cada enlace abre la publicación correspondiente en el archivo. El archivo presenta primero las publicaciones de 2018 y agrupa las demás por año en tarjetas con imagen y contenido desplegable. Incluye búsqueda y filtros por año; en pantallas grandes, la barra de búsqueda queda fija durante el desplazamiento. Al abrir una publicación, su tarjeta ocupa el ancho del archivo y las secuencias de fotos se presentan en una cuadrícula adaptable sin recortar las imágenes. Las fotos del contenido se solicitan a 640 px y usan carga diferida; al abrirlas, conservan el enlace a la imagen original. Las miniaturas de Blogger se solicitan a mayor tamaño para presentarlas como imágenes de tarjeta, no como fondos detrás del texto. Las cabeceras anuales usan fondo liso para facilitar la lectura. Las fotos y los textos originales se obtienen del contenido archivado de Blogger. Se necesita conexión a internet para Bootstrap, las tipografías y las imágenes remotas.

Las redes enlazadas son YouTube (@juancarlososman), Instagram (@juan_carlos4955) y TikTok (@ninoamalia1).

La entrada "CONTAGIANDO PALABRAS. LA HISTORIA - EBOOK" lleva al PDF compartido en Google Drive en una pestaña aparte; no se incrusta en la página. El enlace seguirá funcionando mientras el archivo conserve el permiso de acceso compartido.

La sección Contacto muestra el correo y teléfono públicos indicados por el autor, abre un borrador en Gmail y presenta un mapa de referencia general de Tucumán, Argentina. El sitio estático no envía ni almacena los mensajes.

Publicar con GitHub y Vercel:
1. Sube los archivos de esta carpeta a un repositorio de GitHub.
2. Entra en https://vercel.com/new e inicia sesión.
3. Importa el repositorio. Vercel detectará que es un sitio estático.
4. Deja el directorio raíz en "." y el comando de compilación vacío; pulsa Deploy.

Los cambios locales no se guardan automáticamente en GitHub. Para publicarlos, hay que subirlos al repositorio (por Git o desde GitHub); Vercel puede desplegarlos al detectar el nuevo cambio.

Publicar con Vercel CLI:
1. Instala Node.js si todavía no está instalado.
2. Abre una terminal en esta carpeta.
3. Ejecuta: npm install -g vercel
4. Ejecuta: vercel
5. Para publicar la versión de producción, ejecuta: vercel --prod
