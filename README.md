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

Aplicación web interactiva que modela la **planificación financiera y distribución de recursos entre 4 unidades estratégicas interdependientes** como un sistema lineal simétrico y definido positivo `Ax = b`, y lo resuelve con:

- **Métodos directos (solución de referencia):** Cholesky `A = L Lᵀ` (referencia oficial), LU de Doolittle `A = L U` y eliminación de Gauss sobre `[A | b]`, los tres con todos los cálculos paso a paso y verificación cruzada.
- **Gradientes Conjugados Precondicionado (GCP)** según Suñagua (2020), con precondicionador de **Jacobi** o **Cholesky incompleto IC(0)**.
- **Gradientes Conjugados simple (GC)** como contraste.

Criterio de parada: `‖rₖ‖₂ / ‖b‖₂ < 10⁻⁶` (editable), `x₀ = 0` (editable), `N_máx = 100` (editable).

### Variables (miles de Bs)

| Variable | Unidad |
|---|---|
| x₁ | Operaciones y Producción |
| x₂ | Tecnologías de Información (nodo transversal) |
| x₃ | Comercial y Marketing |
| x₄ | Innovación y Transformación Digital |

`aᵢᵢ` = retorno directo de flujo por Bs asignado; `aᵢⱼ` = retorno cruzado interdepartamental; `bᵢ` = meta de flujo de caja de la unidad i.

### Escenarios

| Escenario | Descripción | κ(A) | It. GC | It. GCP Jacobi | It. GCP IC(0) |
|---|---|---|---|---|---|
| 1. Ideal | Diagonal dominante, plan base 800/650/500/400 | ≈ 2.00 | 4 | 4 | 3 |
| 2. Bajo estrés | Inflación de costos ≈ 12 %: aᵢᵢ × 0.92, a₁₂ 0.25→0.35, b +11–12 % | ≈ 2.33 | 4 | 4 | 3 |
| 3. Mal condicionado | ρ₁₂ = 0.98 y escalas de 0.04 a 400 | ≈ 9.76×10⁴ | 5 | 4 | 3 |

Los datos son ilustrativos y calibrados por el autor (no provienen de estados financieros reales).

## Secciones de la página

1. Inicio (incluye mapa de la rúbrica) · 2. Caso de estudio (proceso, reglas de negocio R1–R5 verificadas automáticamente, red y matriz de flujo de caja interdepartamental) · 3. Formulación (simetría y Sylvester paso a paso: Δ₂ directo, Δ₃ por cofactores, Δ₄ por pivotes de Gauss; autovalores) · 4. Entrada de datos · 5. Tres escenarios (cálculo con que se construyó cada A y b) · 6. Solución de referencia (Cholesky, LU y Gauss paso a paso, tabla de los tres escenarios, multiplicadores A⁻¹) · 7. GCP vs GC (construcción de M, traza numérica completa de cada iteración, gráfico de convergencia, tabla comparativa obligatoria) · 8. Análisis de errores (Eₐ, Eᵣ, Eₚ con sustitución, residuo, κ(A) y κ(M⁻¹A) por autovalores) · 9. Módulo QA en vivo · 10. Conclusiones y referencias.

## Arquitectura

Un único archivo `index.html` autocontenido:

- **Estilos:** CSS propio con variables (tema claro/oscuro) + Tailwind CSS (CDN 3.4.17) para utilidades de maquetación.
- **Núcleo numérico (`NM`, JavaScript puro):** `validate` (cuadrada, numérica, simétrica, Sylvester), `solveCholesky`, `solveLU`, `solveGauss` (todos registran cada paso para mostrarlo), `inverse`, `ic0` (con desplazamiento diagonal automático si aparece un pivote no positivo), `makePreconditioner`, `pcg` (GCP de Suñagua; con M = I es GC simple), `eigSym` (Jacobi cíclico), `condSPD`, `condPrecond` (κ(M⁻¹A) = κ(L⁻¹AL⁻ᵀ)), `errors`, `run`.
- **Capa de interfaz:** estado reactivo; cada edición vuelve a validar y recalcula todas las secciones. Los errores de entrada se muestran como alerta sin interrumpir la aplicación.
- **Módulo QA en vivo:** un "usuario simulado" asíncrono hace clic en botones, escribe en las celdas y cambia selectores; una consola con marcas de tiempo y una vista en vivo de la matriz muestran cada acción. Las entradas de varias pruebas se generan al azar en cada corrida. Al terminar se restauran los datos del usuario y se guarda un historial de ejecuciones.

## Ejecución local

No requiere instalación ni compilación.

```bash
git clone <URL-del-repositorio>
cd <carpeta>
# opción 1: abrir index.html con el navegador
# opción 2: servidor local
python -m http.server 8000   # luego abrir http://localhost:8000
```

Requiere conexión a internet solo para cargar Tailwind y las fuentes; los cálculos funcionan sin ellos.

## Publicación (GitHub Pages)

1. Subir `index.html` y `README.md` a un repositorio público.
2. Settings → Pages → Branch `main` / carpeta raíz → Save.
3. El enlace público queda en `https://<usuario>.github.io/<repositorio>/`.

## Pruebas (QA)

| ID | Tipo | Prueba | Entrada |
|---|---|---|---|
| QA-01 | Obligatoria | Carga de los tres escenarios | Clic en los tres botones de escenario |
| QA-02 | Obligatoria | Matriz no válida | Aleatoria: par no simétrico, par simétrico que rompe Sylvester y celda no numérica |
| QA-03 | Obligatoria | Edición dinámica | Aleatoria: un aᵢᵢ y un bᵢ; se contrasta con LU independiente |
| QA-04 | Obligatoria | Comparativa de precondicionamiento | Escenario 3 con Jacobi y con IC(0): GCP ≤ GC |
| QA-05 | Adicional | Consistencia Cholesky / LU / Gauss | Tres escenarios, tolerancia 100·κ(A)·ε |
| QA-06 | Adicional | Parámetros inválidos | Tolerancia y N_máx aleatorios no válidos |
| QA-07 | Adicional | Matriz SPD aleatoria | Matriz y vector generados al azar, escritos celda por celda |

Resultado de la última verificación: 7 de 7 PASA.

## Referencias

- Suñagua S., P. (2020). Método de Gradientes Conjugados Precondicionado. *Revista Boliviana de Matemática – UMSA*, 04, 2–7.
- Golub, G. H., & Van Loan, C. F. (2013). *Matrix Computations* (4th ed.). Johns Hopkins University Press.
- Saad, Y. (2003). *Iterative Methods for Sparse Linear Systems* (2nd ed.). SIAM.
- Hestenes, M. R., & Stiefel, E. (1952). Methods of Conjugate Gradients for Solving Linear Systems. *J. Res. Nat. Bur. Standards*, 49(6), 409–436.
