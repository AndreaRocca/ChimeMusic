# 🦋 Chimeleta: Encendé el ritmo

Un videojuego musical interactivo para navegador web desarrollado con **HTML5, CSS3 y JavaScript puro**, con una identidad visual propia inspirada en el controlador físico **Chimeleta** y en el espíritu creativo, artesanal y lúdico de la electrónica maker.

---

## ⚡ Cómo Funciona el Circuito de Chimeleta

El dispositivo **Chimeleta** funciona mediante conducción táctil:
1. **Borne de Masa (GND) a la izquierda:** En el lateral izquierdo del dispositivo se encuentra la toma metálica de tierra (**GND**). Allí se conecta la **pulsera o anillo conductor** que lleva puesta la persona.
2. **Cierre de Circuito al Tocar las Teclas:** Cuando el usuario toca cualquiera de los 5 contactos físicos (**←, ↓, ↑, → o Barra Espaciadora**), su propio cuerpo completa y cierra el circuito eléctrico a tierra (**GND**), registrando la nota de forma instantánea.
3. **La Barra Espaciadora es una tecla de juego (Carril 5):** No es el borne de tierra; es la quinta nota que se toca con los dedos al igual que las cuatro flechas de dirección.

---

## 🎨 Identidad Visual y Concepto: "Encendé el ritmo"

1. **Pantalla Inicial (Splash Screen):**
   - Logotipo con estética artesanal y maker: la letra **H** formada por bandas de resistencia con código de colores, la **M** como la silueta icónica de la mariposa Chimeleta, la **T** con pistas y perforaciones de protoboard, y un cable azul con pinzas cocodrilo uniendo el nombre.
   - Explica claramente el uso de la **pulsera o anillo GND** y las 5 teclas de juego.
   - Acceso con botón destacado **"¡CONECTAR Y JUGAR!"**, selector de Modo Práctica y botón de prueba rápida.

2. **Marca Discreta en Partida:**
   - Durante la canción, una insignia elegante en la esquina superior izquierda muestra `⚡ CHIMELETA • Encendé el ritmo` con la silueta de la mariposa en miniatura, sin invadir el área de juego.

3. **Ilustración Interactiva de Chimeleta al Costado de la Pista:**
   - Reproduce fielmente la placa física: chasis en tono filamento 3D naranja, zócalo de pines Arduino hembra central, logo en relieve `chiMeleta`, puerto USB lateral y el **borne metálico GND a la izquierda**.
   - **Toma GND Activa:** Un cable celeste conectado al contacto izquierdo sale hacia la pulsera conductora. Al tocar cualquier tecla, la toma GND y el carril correspondiente se iluminan simultáneamente mostrando el flujo de corriente.
   - **5 Nodos de Contacto Físico:**
     - 🟢 **Ala Superior Izquierda:** Flecha Izquierda (`←`)
     - 🔴 **Ala Inferior Izquierda:** Flecha Abajo (`↓`)
     - 🟡 **Ala Superior Derecha:** Flecha Arriba (`↑`)
     - 🔵 **Ala Inferior Derecha:** Flecha Derecha (`→`)
     - 🟠 **Núcleo / Cabeza:** Barra Espaciadora (`␣`)
   - **Celebración de Rachas:** Al alcanzar hitos de combo (10, 20, 30+ notas), la mariposa aletea con una animación festiva y despliega la insignia `¡CHIMELETA ENCENDIDA! 🎉`.

4. **Receptores con Cables de Colores y Pinzas Cocodrilo:**
   - Los 5 receptores inferiores simulan contactos de cobre circulares con remaches y micro-pistas.
   - De cada receptor cuelga una pinza cocodrilo con su cable flexible de color (verde, rojo, amarillo, azul y naranja), manteniendo las flechas y el símbolo de espacio con máxima legibilidad y contraste.

5. **Personajes Secundarios: Las Pinzas Cocodrilo "Copi" y "Dili":**
   - **Copi** (pinza azul en el lateral izquierdo) y **Dili** (pinza amarilla en el lateral derecho): pequeños personajes con ojos expresivos, fundas de silicona y mandíbulas metálicas.
   - Reaccionan a tus aciertos abriendo y cerrando sus mandíbulas, y emiten frases de aliento con bocadillos de diálogo (fuera de la pista para no distraer).

6. **Medidor "Energía Chimeleta":**
   - Medidor de flujo eléctrico con mensajes contextuales:
     - `¡Chimeleta está encendida!` (energía alta)
     - `¡Seguí conectando!` (energía media)
     - `¡Hiciste conexión!` (al impactar notas)
     - `¡Hiciste conexión baja!` (aviso en zona de peligro)

7. **Pantalla Final Celebratoria:**
   - Reconoce el desempeño con la mariposa Chimeleta festejando entre chispas de colores, rango de conexión (S, A, B, C), precisión de contacto y botón directo de un clic para **"¡VOLVER A CONECTAR Y JUGAR!"**.

---

## 🎮 Controles y Asignación de Entradas

| Carril / Borne | Función en el Circuito | Entrada / Tecla | Frecuencia Sintetizador |
| :---: | :---: | :---: | :---: |
| **Borne Izquierdo (GND)** | ⚡ **Masa (Tierra)** | Conexión para Pulsera / Anillo Conductor | Cierra circuito al tocar |
| **Carril 1 (Verde)** | Tecla Ala Sup. Izq | `ArrowLeft` (`←`) | Mi 3 (164.8 Hz) |
| **Carril 2 (Rojo)** | Tecla Ala Inf. Izq | `ArrowDown` (`↓`) | Sol 3 (196.0 Hz) |
| **Carril 3 (Amarillo)** | Tecla Ala Sup. Der | `ArrowUp` (`↑`) | Si 3 (246.9 Hz) |
| **Carril 4 (Azul)** | Tecla Ala Inf. Der | `ArrowRight` (`→`) | Re 4 (293.6 Hz) |
| **Carril 5 (Naranja)** | Tecla Núcleo Central | `Space` (`␣` - Barra Espaciadora) | Mi 4 (329.6 Hz) |

> ⚠️ **Aislamiento de la Barra Espaciadora:** La barra espaciadora es exclusivamente el control de nota del Carril 5. Todos los botones de la interfaz tienen desenfoque automático (`blur()`) para que el espacio jamás active botones por error ni pause el juego.

---

## ⚡ Calibración y Banco de Prueba

El botón **"⚡ TEST CHIMELETA"** abre una pantalla de diagnóstico en tiempo real:
- Verificación del borne GND y pulsera conductora.
- Iluminación inmediata de los 5 sensores al cerrar el circuito con los dedos.
- Contador de toques por carril (para calibrar la sensibilidad mecánica y detectar rebotes).
- Detector de acordes y pulsaciones simultáneas.
- Confirmación de filtrado de autorrepetición del sistema operativo (`e.repeat`).

---

## 🚀 Cómo Jugar

1. Abrí [index.html](file:///c:/Cursosmoviles/Chimeleta/Antigravity%20Google/index.html) en cualquier navegador web.
2. Colocate la pulsera o anillo conductor conectado al borne izquierdo de GND.
3. Hacé clic en **"¡CONECTAR Y JUGAR!"** en la pantalla inicial.
4. ¡Tocá los contactos con tus dedos para cerrar el circuito y encender el ritmo!
