TRIPAS DE ACHILATA — SITIO ESTÁTICO

Estructura:
- index.html: portada y estructura semántica de la página.
- assets\css\styles.css: estilos propios, paleta, diseño adaptable y temas.
- assets\js\app.js: archivo interactivo, buscador, filtros y cambio visual.
- assets\data\posts.json: copia estática de las 26 entradas del archivo público; la entrada vacía "Audioleyendas 2018- En Proceso" no se muestra.
- api\contact.js: función de Vercel que valida y envía el formulario mediante Resend.

La interfaz usa Bootstrap 5.3.3 desde jsDelivr, Roboto y Lora desde Google Fonts, además de estilos propios. El tema inicial respeta la preferencia del sistema y la selección manual se conserva entre visitas. Los controles A− y A+ permiten ajustar el tamaño del texto en cuatro niveles y guardan la preferencia entre visitas. La portada presenta una sola imagen y una introducción breve; el archivo aparece por año en tarjetas con hasta dos imágenes y textos de adelanto. El botón «Explorar el año» abre las historias de ese período, y «Descubrir historia» lleva a una vista de lectura individual con regreso al año. La búsqueda y los filtros por año muestran solo los resultados coincidentes; en móviles, los filtros se recorren horizontalmente. Las historias y sus imágenes se cargan al acercarse al archivo para reducir la carga inicial. Las secuencias de fotos se presentan en una cuadrícula adaptable sin recortar las imágenes. Cuando el navegador lo admite, las publicaciones con texto incluyen lectura en voz alta con control para detenerla; el texto se divide en segmentos para que el lector de voz pueda continuar también en artículos largos. Las fotos del contenido se solicitan a 640 px y usan carga diferida; al abrirlas, conservan el enlace a la imagen original. Las notas de prensa se mantienen en un apartado desplegable y enlazan a sus fuentes originales. Las fotos y los textos de las historias se obtienen del contenido archivado de Blogger. Se necesita conexión a internet para Bootstrap, las tipografías y las imágenes remotas.

Las redes enlazadas son YouTube (@juancarlososman), Instagram (@juan_carlos4955), TikTok (@ninoamalia1) y LinkedIn (juan-carlos-osmán-6a6643b8). En el pie se muestran solamente los logos, con nombres accesibles para tecnologías de asistencia.

La entrada "CONTAGIANDO PALABRAS. LA HISTORIA - EBOOK" lleva al PDF compartido en Google Drive en una pestaña aparte; no se incrusta en la página. El enlace seguirá funcionando mientras el archivo conserve el permiso de acceso compartido.

La sección Contacto envía el formulario a la función `api\contact.js`, que entrega el mensaje a Resend y responde con el resultado. El sitio no guarda los mensajes. El correo y el teléfono permanecen como alternativas de contacto, y las redes sociales se muestran mediante sus logos en el pie.

Publicar con GitHub y Vercel:
1. Sube los archivos de esta carpeta a un repositorio de GitHub.
2. Entra en https://vercel.com/new e inicia sesión.
3. Importa el repositorio. Vercel detectará que es un sitio estático.
4. Deja el directorio raíz en "." y el comando de compilación vacío; pulsa Deploy.
5. En Resend, verifica un dominio y crea una clave API.
6. En el proyecto de Vercel, abre Settings > Environment Variables y configura `RESEND_API_KEY`, `CONTACT_FROM_EMAIL` y `CONTACT_TO_EMAIL` para Production (y Preview si corresponde). El remitente debe usar el dominio verificado en Resend; el destinatario es el correo que recibirá los mensajes.
7. Vuelve a desplegar el proyecto para aplicar las variables. No pongas la clave de Resend en archivos del navegador ni en el repositorio.

Los cambios locales no se guardan automáticamente en GitHub. Para publicarlos, hay que subirlos al repositorio (por Git o desde GitHub); Vercel puede desplegarlos al detectar el nuevo cambio.

Probar localmente el formulario con Vercel CLI:
1. Instala Node.js si todavía no está instalado.
2. Abre una terminal en esta carpeta.
3. Ejecuta: npm install -g vercel
4. Configura las tres variables anteriores en un archivo `.env.local` (no lo subas al repositorio) o en Vercel.
5. Ejecuta: vercel dev
6. Para publicar la versión de producción, ejecuta: vercel --prod
