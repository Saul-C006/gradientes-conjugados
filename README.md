# Gradientes Conjugados Precondicionado en la planificación financiera interdepartamental

**Desafío Académico de Métodos Numéricos** · Universidad Mayor de San Andrés (UMSA) · Facultad de Ciencias Puras y Naturales · Carrera de Informática · Gestión 2026

| | |
|---|---|
| Estudiante | Saúl Walter Callisaya Sumi |
| C.I. | 15074779 |
| Mención | Ingeniería de Sistemas |
| Modalidad | Individual |
| Área | Finanzas |

## Descripción

Aplicación web interactiva que modela la **planificación financiera y la distribución de recursos entre 4 unidades estratégicas interdependientes** (Operaciones, TI, Comercial e Innovación) como un sistema lineal simétrico y definido positivo `Ax = b`, y lo resuelve con:

- **Tres métodos directos**, cada uno en su propia página con el cálculo paso a paso:
  - **Cholesky** `A = L Lᵀ`: solución numérica de referencia oficial.
  - **LU de Doolittle** `A = L U`: incluye su relación con Cholesky (`U = D Lᵀ`).
  - **Eliminación de Gauss** sobre `[A | b]`: visor por etapas.
- **Gradientes Conjugados Precondicionado (GCP)** según Suñagua (2020), con tres precondicionadores: **Jacobi**, **Cholesky incompleto IC(0)** y **SSOR**.
- **Gradientes Conjugados simple (GC)** como contraste.

Criterio de parada: `‖rₖ‖₂ / ‖b‖₂ < 10⁻⁶`. La tolerancia, `x₀` (por defecto 0), `N_máx` (por defecto 100), el precondicionador y la dimensión `n` (de 4 a 8) se pueden editar.

Cada cambio en la matriz o en los parámetros vuelve a validar el sistema (simetría y criterio de Sylvester) y recalcula al instante todas las soluciones, los errores, las tablas y los gráficos de todas las páginas.

## Secciones de la página

La barra superior permite cambiar de escenario o de precondicionador desde cualquier página.

| Grupo | Página | Módulo de la guía | Contenido |
|---|---|---|---|
| Proyecto | Inicio | 1 | Título, datos del estudiante, síntesis, resultados de un vistazo, mapa del proyecto y correspondencia con la rúbrica |
| | Caso de estudio | 2 | Unidades, proceso modelado, reglas de negocio R1–R5 verificadas automáticamente, red y matriz de flujo de caja, procedencia de los datos |
| | Formulación | 3 | Variables, sistema `Ax = b`, demostración de simetría, Sylvester paso a paso, autovalores y discos de Gershgorin |
| Datos | Entrada de datos | 4 | Editor de `A`, `b`, `x₀`, tolerancia, `N_máx`, `M`, `ω` y `n`; generador de matrices SPD aleatorias; registro de ediciones |
| | Tres escenarios | 5 | Botones de carga, justificación y cálculo de cada `A` y `b`, impacto del estrés y gráficos de κ e iteraciones |
| Métodos directos | Solución de referencia | 6 | Los tres métodos frente a frente, tabla de los tres escenarios y multiplicadores `A⁻¹` |
| | Cholesky · LU · Gauss | 6 | Una página por método: fórmulas, algoritmo, cálculo de cada elemento con sustitución numérica, sustituciones, verificación y mapas de calor |
| Métodos iterativos | GC simple · GCP | 7 | Algoritmo, construcción de `M`, tabla y traza completa de iteraciones, convergencia, error frente a la cota teórica, espectro de `M⁻¹A`, ortogonalidad y conjugación |
| | Comparativa GCP vs GC | 7 | Vectores, iteraciones, residuos y diagnósticos de los cuatro métodos, y la **tabla comparativa obligatoria** de la sección 8 de la guía |
| Análisis | Análisis de errores | 8 | Tabla interactiva `Eₐ`, `Eᵣ`, `Eₚ`, residuo global, κ(A) y κ(M⁻¹A) por autovalores, y experimento de sensibilidad |
| | Geometría 3D | complemento | Superficie de energía con las trayectorias de GC, GCP y descenso más pronunciado, curvas de nivel con y sin precondicionar, trayectoria 3D y relieve 3D de `A` y `L⁻¹AL⁻ᵀ` |
| Calidad y cierre | Pruebas (QA) | 9 | 8 casos de prueba ejecutados en vivo por un usuario simulado, con consola, vista en vivo, registro formal e historial |
| | Conclusiones | 10 | Interpretación técnica y financiera calculada en vivo y referencias |

## Variables y escenarios

| Variable | Unidad (miles de Bs) |
|---|---|
| x₁ | Operaciones y Producción |
| x₂ | Tecnologías de Información (nodo transversal) |
| x₃ | Comercial y Marketing |
| x₄ | Innovación y Transformación Digital |

`aᵢᵢ` = retorno directo de flujo por cada Bs asignado; `aᵢⱼ` = retorno cruzado interdepartamental; `bᵢ` = meta de flujo de caja de la unidad i.

| Escenario | Construcción | κ(A) | GC | GCP Jacobi | GCP IC(0) | GCP SSOR |
|---|---|---|---|---|---|---|
| 1. Ideal | Diagonal dominante; `b = A·(800, 650, 500, 400)` | 2.0022 | 4 | 4 | 3 | 3 |
| 2. Bajo estrés | Inflación ≈ 12 %: `aᵢᵢ × 0.92`, `a₁₂` de 0.25 a 0.35, `b × 1.12` | 2.3318 | 4 | 4 | 3 | 3 |
| 3. Mal condicionado | `A = D S D`, ρ₁₂ = 0.98, `D = diag(20, 1, 0.2, 4)`; `b = A·(820, 700, 540, 430)` | 97 631.63 | 5 | 4 | 3 | 3 |

κ(M⁻¹A) en el escenario 3: Jacobi 592.61 · IC(0) 5.23 · SSOR 141.50.

Las soluciones, κ(A), los menores de Sylvester y κ(M⁻¹A) con Jacobi se verificaron de forma independiente con NumPy. Los datos son ilustrativos y calibrados por el autor; no provienen de estados financieros reales.

## Arquitectura

Es un sitio estático sin compilación. El núcleo numérico está escrito en JavaScript puro y se comparte entre el navegador y las pruebas en Node.

```
index.html                    Esqueleto: barra superior, navegación, barra de datos y contenedor de vistas
assets/
  css/main.css                Diseño (tokens de color, tema claro/oscuro, adaptable a móvil)
  js/core/                    Sin dependencias del DOM (también se usa en Node)
    numerics.js               validate, solveCholesky, solveLU, solveGauss, ic0, ssorFactor,
                              makePreconditioner, pcg (Suñagua 2020), steepest, eigSym,
                              condSPD, condPrecond, errors, run
    scenarios.js              Unidades, tres escenarios con su construcción documentada, rúbrica
    format.js                 Formato de números para texto y para fórmulas TeX
  js/app/                     Capa de aplicación
    store.js                  Estado reactivo: valida, recalcula y notifica; guarda en localStorage
    ui.js                     Componentes (tarjetas, tablas, KPI, fórmulas KaTeX)
    charts.js                 Envoltorios de Plotly con el tema de la página
    app.js                    Enrutador por hash (#/ruta), barra de datos y editor de la matriz
  js/views/                   Una vista por sección (inicio, caso, formulacion, datos, escenarios,
                              directos, cholesky, lu, gauss, iterativos, comparativa, errores,
                              geometria, qa, conclusiones)
  vendor/                     Plotly.js 2.35.2 y KaTeX 0.16.22 (incluidos: funciona sin internet)
tests/
  numerics.test.js            Pruebas unitarias del núcleo (node --test), comparadas con NumPy
  e2e.js                      Pruebas de extremo a extremo con Chromium (Playwright)
.github/workflows/tests.yml   Integración continua: ejecuta ambas pruebas en cada push
```

**Flujo de datos:** el editor o la barra de escenarios llaman a `Store` → `Store` valida (`NM.validate`) y ejecuta `NM.run`, que corre todos los métodos y todos los precondicionadores → la vista activa se vuelve a dibujar. Las vistas con editor solo actualizan sus resultados, así que no se pierde el foco al escribir. Una entrada no válida nunca lanza un error: se muestra una alerta con el motivo y se marca la celda.

## Ejecución local

No requiere instalación ni compilación.

```bash
git clone https://github.com/saul-c006/gradientes-conjugados.git
cd gradientes-conjugados
# opción 1: abrir index.html con el navegador (doble clic)
# opción 2: servidor local
python3 -m http.server 8000      # luego abrir http://localhost:8000
```

Las librerías (Plotly y KaTeX) están en `assets/vendor/`, así que la página funciona sin conexión. Solo las fuentes tipográficas se cargan de Google Fonts; sin internet se usan las fuentes del sistema.

## Pruebas

```bash
npm test               # 12 pruebas unitarias del núcleo numérico (Node ≥ 18, sin dependencias)
npm install            # instala Playwright (solo para las pruebas en navegador)
npx playwright install chromium
npm run test:e2e       # recorre las 16 secciones en los 3 escenarios, edita celdas, prueba
                       # entradas inválidas, ejecuta el módulo QA completo y revisa la vista móvil
```

### Módulo QA de la página

| ID | Tipo | Prueba | Entrada |
|---|---|---|---|
| QA-01 | Obligatoria | Carga de los tres escenarios | Clic en los botones de escenario de la barra superior |
| QA-02 | Obligatoria | Matriz no válida | Aleatoria: par no simétrico, par simétrico que rompe Sylvester y celda no numérica |
| QA-03 | Obligatoria | Edición dinámica | Aleatoria: un aᵢᵢ y un bᵢ; se contrasta con Gauss con pivoteo independiente |
| QA-04 | Obligatoria | Comparativa de precondicionamiento | Escenario 3 con Jacobi, IC(0) y SSOR: GCP ≤ GC y κ(M⁻¹A) < κ(A) |
| QA-05 | Adicional | Consistencia Cholesky / LU / Gauss | Tres escenarios, tolerancia 100·κ(A)·ε |
| QA-06 | Adicional | Parámetros inválidos | Tolerancia y N_máx aleatorios no válidos |
| QA-07 | Adicional | Matriz SPD aleatoria con n = 5 | Matriz y vector generados al azar, escritos celda por celda |
| QA-08 | Adicional | Formato de entrada flexible | Coma decimal y notación científica |

Resultado de la última verificación: **8 de 8 pruebas superadas** a velocidad instantánea y a velocidad normal. Las pruebas unitarias dieron 12 de 12, y la prueba de extremo a extremo pasó todas sus comprobaciones.

## Publicación (GitHub Pages)

1. Settings → Pages → *Deploy from a branch* → rama `main`, carpeta `/ (root)` → Save.
2. El enlace público queda en `https://saul-c006.github.io/gradientes-conjugados/`.

El archivo `.nojekyll` hace que GitHub Pages publique los archivos tal cual.

## Referencias

- Suñagua S., P. (2020). Método de Gradientes Conjugados Precondicionado. *Revista Boliviana de Matemática – UMSA*, 04, 2–7.
- Golub, G. H., & Van Loan, C. F. (2013). *Matrix Computations* (4th ed.). Johns Hopkins University Press.
- Saad, Y. (2003). *Iterative Methods for Sparse Linear Systems* (2nd ed.). SIAM.
- Hestenes, M. R., & Stiefel, E. (1952). Methods of Conjugate Gradients for Solving Linear Systems. *J. Res. Nat. Bur. Standards*, 49(6), 409–436.
- Shewchuk, J. R. (1994). *An Introduction to the Conjugate Gradient Method Without the Agonizing Pain*. Carnegie Mellon University.
