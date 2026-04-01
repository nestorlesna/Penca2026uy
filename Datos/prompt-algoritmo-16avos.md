# Algoritmo de Clasificación y Emparejamientos - Fase Eliminatoria Mundial 2026

## Contexto

Estoy desarrollando una app de penca/quiniela para el Mundial 2026. Necesito implementar el algoritmo completo que determina los emparejamientos de la fase de 16avos de final (Round of 32) en adelante.

El Mundial 2026 tiene **48 equipos** en **12 grupos** (A-L), con 4 equipos por grupo. Clasifican a 16avos: los **2 primeros** de cada grupo (24 equipos) + los **8 mejores terceros** (de los 12 terceros posibles).

## Stack tecnológico

React 18 + TypeScript + Vite + Supabase (PostgreSQL). Adaptar al stack existente del proyecto.

---

## PARTE 1: Clasificación dentro de cada grupo

### Estructura de la fase de grupos

- 12 grupos: A, B, C, D, E, F, G, H, I, J, K, L
- 4 equipos por grupo
- Cada equipo juega 3 partidos (todos contra todos)
- Total: 72 partidos de fase de grupos (partidos 1-72)

### Criterios de desempate (en orden de prioridad)

Cuando dos o más equipos empatan en puntos dentro de un grupo, se aplican estos criterios en cascada:

1. **Puntos** (PTS): Victoria=3, Empate=1, Derrota=0
2. **Diferencia de goles** (DG): Goles a favor - Goles en contra
3. **Goles a favor** (GF)
4. **Enfrentamiento directo** (entre los empatados): puntos, luego DG, luego GF
5. **Menor cantidad de tarjetas amarillas/rojas** (fair play) — simplificar: si sigue empate, usar orden alfabético del nombre del país
6. **Sorteo FIFA** — simplificar: usar orden alfabético

### Resultado esperado

Para cada grupo, producir un ranking ordenado del 1° al 4°. Cada posición se identifica como `"1A"`, `"2A"`, `"3A"`, `"4A"` para el grupo A, etc.

```typescript
interface GroupStanding {
  position: number;      // 1, 2, 3, 4
  group: string;         // "A", "B", ..., "L"
  teamId: string;        // ID del equipo
  played: number;        // Partidos jugados
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  positionCode: string;  // "1A", "2B", "3C", etc.
}
```

---

## PARTE 2: Ranking de los 8 mejores terceros

De los 12 terceros (uno por grupo), se seleccionan los 8 mejores. El ranking entre terceros usa los mismos criterios que dentro de grupo:

1. Puntos
2. Diferencia de goles
3. Goles a favor
4. Fair play / orden alfabético del grupo

### Resultado esperado

- Los 8 mejores terceros clasifican
- Se genera un string con las letras de sus grupos, **ordenadas alfabéticamente** (ej: `"DEFGHIJKL"`)
- Este string es la **clave de combinación** para determinar los emparejamientos

---

## PARTE 3: Emparejamientos de 16avos de final

### Partidos fijos (16 partidos, números 73-88)

Los 16 partidos de 16avos tienen una estructura fija definida por FIFA. La columna LOCAL siempre es un primero o segundo de grupo. La columna VISITANTE puede ser un segundo de grupo o un mejor tercero.

```typescript
const ROUND_OF_32_MATCHES = [
  { matchNumber: 73, homeSlot: "2A", awaySlot: "2B",     label: "2A vs 2B" },
  { matchNumber: 74, homeSlot: "1E", awaySlot: "3*",     label: "1E vs 3°", thirdPlacePool: "ABCDF" },
  { matchNumber: 75, homeSlot: "1F", awaySlot: "2C",     label: "1F vs 2C" },
  { matchNumber: 76, homeSlot: "1C", awaySlot: "2F",     label: "1C vs 2F" },
  { matchNumber: 77, homeSlot: "1I", awaySlot: "3*",     label: "1I vs 3°", thirdPlacePool: "CDFGH" },
  { matchNumber: 78, homeSlot: "2E", awaySlot: "2I",     label: "2E vs 2I" },
  { matchNumber: 79, homeSlot: "1A", awaySlot: "3*",     label: "1A vs 3°", thirdPlacePool: "CEFHI" },
  { matchNumber: 80, homeSlot: "1L", awaySlot: "3*",     label: "1L vs 3°", thirdPlacePool: "EHIJK" },
  { matchNumber: 81, homeSlot: "1D", awaySlot: "3*",     label: "1D vs 3°", thirdPlacePool: "BEFIJ" },
  { matchNumber: 82, homeSlot: "1G", awaySlot: "3*",     label: "1G vs 3°", thirdPlacePool: "AEHIJ" },
  { matchNumber: 83, homeSlot: "2K", awaySlot: "2L",     label: "2K vs 2L" },
  { matchNumber: 84, homeSlot: "1H", awaySlot: "2J",     label: "1H vs 2J" },
  { matchNumber: 85, homeSlot: "1B", awaySlot: "3*",     label: "1B vs 3°", thirdPlacePool: "EFGIJ" },
  { matchNumber: 86, homeSlot: "1J", awaySlot: "2H",     label: "1J vs 2H" },
  { matchNumber: 87, homeSlot: "1K", awaySlot: "3*",     label: "1K vs 3°", thirdPlacePool: "DEIJL" },
  { matchNumber: 88, homeSlot: "2D", awaySlot: "2G",     label: "2D vs 2G" },
];
```

### Resolución de los rivales

**Para slots tipo "1X" o "2X"** (primero o segundo de grupo):
- Buscar directamente en la tabla de posiciones del grupo X qué equipo quedó en esa posición.
- Ejemplo: `"1A"` → el equipo que quedó primero en el grupo A.

**Para slots tipo "3*"** (mejor tercero):
- Requiere consultar la **tabla de combinaciones**.
- La clave de búsqueda es el string de los 8 grupos clasificados (ej: `"DEFGHIJKL"`).
- La tabla te dice, para cada primero de grupo que juega contra un tercero, **de qué grupo viene ese tercero**.

### Ejemplo completo

Supongamos que los 8 mejores terceros vienen de los grupos D, E, F, G, H, I, J, K → clave = `"DEFGHJKL"`.

Se busca esa clave en la tabla de combinaciones y se obtiene:
- 1A juega contra 3E
- 1B juega contra 3G
- 1D juega contra 3J
- 1E juega contra 3D
- 1G juega contra 3H
- 1I juega contra 3F
- 1K juega contra 3L
- 1L juega contra 3K

---

## PARTE 4: Bracket de eliminación directa (octavos en adelante)

### Octavos de final (partidos 89-96)

```typescript
const ROUND_OF_16_MATCHES = [
  { matchNumber: 89, homeSlot: "W73", awaySlot: "W75" },  // Ganador P73 vs Ganador P75
  { matchNumber: 90, homeSlot: "W74", awaySlot: "W77" },  // Ganador P74 vs Ganador P77
  { matchNumber: 91, homeSlot: "W76", awaySlot: "W78" },  // Ganador P76 vs Ganador P78
  { matchNumber: 92, homeSlot: "W79", awaySlot: "W80" },  // Ganador P79 vs Ganador P80
  { matchNumber: 93, homeSlot: "W83", awaySlot: "W84" },  // Ganador P83 vs Ganador P84
  { matchNumber: 94, homeSlot: "W81", awaySlot: "W82" },  // Ganador P81 vs Ganador P82
  { matchNumber: 95, homeSlot: "W86", awaySlot: "W88" },  // Ganador P86 vs Ganador P88
  { matchNumber: 96, homeSlot: "W85", awaySlot: "W87" },  // Ganador P85 vs Ganador P87
];
```

### Cuartos de final (partidos 97-100)

```typescript
const QUARTER_FINAL_MATCHES = [
  { matchNumber: 97,  homeSlot: "W89", awaySlot: "W90" },
  { matchNumber: 98,  homeSlot: "W93", awaySlot: "W94" },
  { matchNumber: 99,  homeSlot: "W91", awaySlot: "W92" },
  { matchNumber: 100, homeSlot: "W95", awaySlot: "W96" },
];
```

### Semifinales (partidos 101-102)

```typescript
const SEMI_FINAL_MATCHES = [
  { matchNumber: 101, homeSlot: "W97",  awaySlot: "W98" },
  { matchNumber: 102, homeSlot: "W99",  awaySlot: "W100" },
];
```

### Tercer puesto y final (partidos 103-104)

```typescript
const FINAL_MATCHES = [
  { matchNumber: 103, homeSlot: "L101", awaySlot: "L102", label: "3er puesto" },
  { matchNumber: 104, homeSlot: "W101", awaySlot: "W102", label: "Final" },
];
```

---

## PARTE 5: Determinación del ganador de cada partido eliminatorio

En fase eliminatoria no hay empates. La lógica es:

```typescript
function getMatchWinner(match: KnockoutMatch): string | null {
  if (match.homeGoals === null || match.awayGoals === null) return null; // Pendiente

  if (match.homeGoals > match.awayGoals) return match.homeTeamId;
  if (match.homeGoals < match.awayGoals) return match.awayTeamId;

  // Empate en tiempo regular → penales
  if (match.homePenalties === null || match.awayPenalties === null) return null; // Pendiente
  if (match.homePenalties > match.awayPenalties) return match.homeTeamId;
  if (match.homePenalties < match.awayPenalties) return match.awayTeamId;

  return null; // No debería llegar acá
}
```

---

## PARTE 6: Tabla de combinaciones de terceros (DATOS)

Esta es la tabla oficial FIFA con las 495 combinaciones posibles (C(12,8) = 495).

**Formato**: `[clave, rival_1A, rival_1B, rival_1D, rival_1E, rival_1G, rival_1I, rival_1K, rival_1L]`

Donde `clave` es el string alfabético de los 8 grupos cuyos terceros clasifican, y cada `rival_1X` indica de qué grupo viene el tercer clasificado que enfrenta al primero del grupo X.

**IMPORTANTE**: Cargar estos datos desde el archivo adjunto `combinaciones-terceros-mundial-2026.json`. El archivo contiene un array de 495 objetos con la estructura:

```json
{
  "key": "EFGHIJKL",
  "1A": "3E",
  "1B": "3J",
  "1D": "3I",
  "1E": "3F",
  "1G": "3H",
  "1I": "3G",
  "1K": "3L",
  "1L": "3K"
}
```

### Función de búsqueda

```typescript
function getThirdPlaceOpponent(
  qualifiedThirdGroups: string[],  // ej: ["D","E","F","G","H","J","K","L"]
  firstPlaceSlot: string           // ej: "1A"
): string {
  // 1. Ordenar las letras alfabéticamente y concatenar
  const key = qualifiedThirdGroups.sort().join("");  // "DEFGHJKL"
  
  // 2. Buscar en la tabla de combinaciones
  const combo = COMBINATIONS.find(c => c.key === key);
  if (!combo) throw new Error(`Combinación no encontrada: ${key}`);
  
  // 3. Retornar el rival correspondiente
  return combo[firstPlaceSlot];  // ej: "3E"
}
```

---

## PARTE 7: Algoritmo principal integrado

```typescript
function generateKnockoutBracket(groupResults: GroupMatch[]): KnockoutMatch[] {
  // PASO 1: Calcular posiciones de cada grupo
  const standings = calculateAllGroupStandings(groupResults);
  
  // PASO 2: Extraer los 12 terceros y rankearlos
  const allThirds = standings.filter(s => s.position === 3);
  const rankedThirds = rankThirdPlaceTeams(allThirds);
  
  // PASO 3: Los 8 mejores terceros → generar clave de combinación
  const qualified8 = rankedThirds.slice(0, 8);
  const combinationKey = qualified8.map(t => t.group).sort().join("");
  
  // PASO 4: Buscar combinación en la tabla FIFA
  const combo = COMBINATIONS.find(c => c.key === combinationKey);
  
  // PASO 5: Resolver los 16 partidos de 16avos
  const roundOf32 = ROUND_OF_32_MATCHES.map(match => {
    const homeTeam = resolveSlot(match.homeSlot, standings);
    let awayTeam: string;
    
    if (match.awaySlot === "3*") {
      // Es un mejor tercero → buscar en la tabla de combinaciones
      const thirdGroupCode = combo[match.homeSlot]; // ej: "3E"
      const thirdGroup = thirdGroupCode[1];          // ej: "E"
      awayTeam = standings.find(s => s.group === thirdGroup && s.position === 3).teamId;
    } else {
      awayTeam = resolveSlot(match.awaySlot, standings);
    }
    
    return { matchNumber: match.matchNumber, homeTeam, awayTeam };
  });
  
  // PASO 6: Las rondas siguientes se resuelven con los ganadores
  // W73 = ganador del partido 73, etc.
  // Seguir la estructura de octavos, cuartos, semis, final
  
  return [...roundOf32, ...roundOf16, ...quarterFinals, ...semiFinals, ...finals];
}
```

---

## Notas de implementación

1. **Estado parcial**: La fase de grupos puede estar incompleta. Mientras no se hayan jugado todos los partidos de un grupo, las posiciones son provisorias. Los emparejamientos de 16avos solo son definitivos cuando **todos los 72 partidos de grupo** se hayan jugado.

2. **Terceros**: El string de combinación solo se puede calcular cuando los 12 grupos estén resueltos. Antes de eso, mostrar los placeholders genéricos (ej: `"3ABCDF"`).

3. **Penales**: En fase eliminatoria, si hay empate en tiempo regular, se registran los penales por separado. El modelo de datos debe soportar `homePenalties` y `awayPenalties` como campos opcionales/nullable.

4. **El tercer puesto y la final** usan `L101`/`L102` (perdedores de semifinales) y `W101`/`W102` (ganadores de semifinales).

5. **Persistencia**: Las combinaciones son datos estáticos, se pueden almacenar en una tabla SQL o como constante en el código. Para la penca lo más eficiente es tenerlas como constante TypeScript.
