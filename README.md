# Austral Map
<br/>

## ¡Hola! 👋

Soy Francisco Calveyra, alumno de Ingeniería Informática en la Universidad Austral.

**Austral Map** es una herramienta interactiva para visualizar el plan de estudios, las correlatividades y el progreso académico directamente desde la información que ya existe en SIU Guaraní.

La idea es simple: importás tu plan una vez desde SIU, el mapa arma la estructura automáticamente y después podés revisar materias disponibles, finales pendientes, optativas, otros requisitos y avances manuales sin depender de archivos externos.
<br/>

## Estado actual del proyecto

El proyecto ya no depende de planes cargados a mano ni de Excels específicos. Ahora usa un **bookmarklet** que lee la página de **Reportes → Plan de estudios** de SIU Guaraní con tu sesión abierta.

Con eso intenta funcionar para cualquier carrera/plan de la Universidad Austral, siempre que SIU exponga las materias, créditos, estado y correlatividades en esa pantalla.
<br/>

## Características principales

- **Importación desde SIU Guaraní** usando un favorito/bookmarklet local.
- **Visualización interactiva** del plan con años, cuatrimestres, optativas y otros requisitos.
- **Correlatividades automáticas** leídas desde SIU, sin cargar relaciones a mano.
- **Estados académicos** diferenciando aprobadas, cursando, en final, disponibles y no disponibles.
- **Persistencia local** de cambios manuales, notas y posiciones movidas en el mapa.
- **Interfaz responsive** para usarla también desde pantallas chicas.

Todo queda en tu navegador: el bookmarklet corre dentro de SIU con tu sesión y vuelve a Austral Map con el plan procesado.
<br/>

## Cómo importar tu plan desde SIU

1. En Austral Map, hacé click en **Importar mi plan**.
2. Arrastrá el botón verde **Austral Map — Importar SIU** a tu barra de favoritos. Esto se hace una sola vez.
3. Entrá a **SIU Guaraní → Reportes → Plan de estudios**.
4. Ya estando en esa pantalla, hacé click en el favorito **Austral Map — Importar SIU**.
5. Esperá a que termine: el bookmarklet carga correlatividades y optativas. Si alguna correlativa no carga, aborta para no generar un mapa incompleto.
6. Cuando termina, volvés automáticamente a Austral Map con tu plan cargado.

Si tu navegador no deja arrastrar el botón, usá **Copiar código del favorito**, creá un favorito manual y pegá ese código como URL.

Nota: algunos navegadores pueden mostrar un ícono genérico para favoritos `javascript:`. No afecta la importación; lo importante es que el favorito se llame **Austral Map — Importar SIU**.
<br/>

## Cómo usar el mapa

- Hacé click en una materia para ver detalles y cambiar su estado.
- Hacé doble click en una materia para alternar aprobación manual rápidamente.
- Activá **Electivas** u **Otros Requisitos** desde la barra inferior cuando quieras ver esos módulos.
- Arrastrá materias verticalmente si necesitás acomodar el mapa.
- Tus cambios manuales se guardan en Local Storage del navegador.

Si reimportás el mismo plan, Austral Map intenta conservar tus cambios locales. Si cambiás de carrera/plan, se toma como un mapa distinto.
<br/>

## Cómo pasarlo al celular

El flujo recomendado para teléfono es importar primero el plan en una computadora y después usar **Pasar al celular**.

Ese botón genera un link privado que incluye tu plan y tus cambios locales: estados, notas y posiciones movidas. Podés compartirlo con el menú nativo del sistema o copiarlo y mandártelo por WhatsApp, AirDrop, mail o Notas.

Al abrir ese link en el teléfono, Austral Map carga el mismo plan y guarda una copia local en ese navegador.
<br/>

## Privacidad y datos

Austral Map no necesita tu usuario ni contraseña de SIU. El bookmarklet se ejecuta localmente en tu navegador, leyendo la página que vos ya tenés abierta.

La información importada y tus cambios manuales se guardan en **Local Storage** del navegador. Si borrás datos del sitio o cambiás de navegador/dispositivo, vas a tener que importar el plan nuevamente.
<br/>

## Tecnologías

<img src="https://skillicons.dev/icons?i=nextjs" alt="Next.js" />
<img src="https://skillicons.dev/icons?i=typescript" alt="TypeScript" />
<img src="https://skillicons.dev/icons?i=react" alt="React" />
<img src="https://skillicons.dev/icons?i=tailwindcss" alt="Tailwind CSS" />
<img src="https://skillicons.dev/icons?i=nodejs" alt="Node.js" />

<br/>

## Contacto

<a href="https://github.com/FranCalveyra" target="_blank" rel="noopener noreferrer">
  <img src="https://skillicons.dev/icons?i=github" alt="GitHub" />
</a>
<a href="https://www.linkedin.com/in/francisco-calveyra/" target="_blank" rel="noopener noreferrer">
  <img src="https://skillicons.dev/icons?i=linkedin" alt="LinkedIn" />
</a>
<a href="mailto:franciscocalveyra24@gmail.com">
  <img src="https://skillicons.dev/icons?i=gmail" alt="Email" />
</a>

<br/>

## Inspiración

Este proyecto está inspirado en el [FIUBA Map](https://fede.dm/FIUBA-Map/), creado por Fede Del Mazo para la Facultad de Ingeniería de la Universidad de Buenos Aires.
