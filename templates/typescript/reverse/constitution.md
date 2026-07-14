# Constitución del Proyecto: {{projectName}}

> **IMPORTANTE**: Este documento define los principios inmutables que gobiernan el análisis y documentación del proyecto. Todas las fases del workflow deben cumplir con esta constitución.

---

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| **Proyecto** | {{projectName}} |
| **Fecha de Análisis** | {{date}} |
| **Analista** | {{analyst}} |
| **Versión** | 1.0.0 |
| **Estado** | {{status}} |

---

## 🎯 Propósito del Análisis

[DESCRIBE_EL_PROPOSITO_DEL_ANALISIS]

**Ejemplo**: "Analizar el repositorio bidcom-website para generar documentación técnica completa que permita el onboarding de nuevos desarrolladores, facilitar la migración a nuevas tecnologías y mantener la consistencia arquitectónica."

---

## 📜 Artículos de la Constitución

### Artículo I: Principio de Completitud

```
Toda especificación generada debe ser lo suficientemente completa para:
1. Permitir el onboarding de nuevos desarrolladores sin documentación adicional
2. Facilitar la migración a diferentes stacks tecnológicos
3. Servir como base para refactorizaciones y mejoras
4. Generar tests automáticamente si es necesario
```

**Gate de Validación**:
- [ ] ¿La documentación permite entender el proyecto sin acceso al código?
- [ ] ¿Se pueden identificar todos los componentes y sus responsabilidades?
- [ ] ¿El flujo de datos está completamente documentado?

---

### Artículo II: Principio de Trazabilidad

```
Toda decisión técnica documentada debe:
1. Rastrear su origen en el código existente
2. Incluir ejemplos de código reales
3. Documentar alternativas consideradas
4. Justificar la elección realizada
```

**Gate de Validación**:
- [ ] ¿Cada patrón de diseño tiene ejemplos del código real?
- [ ] ¿Las decisiones técnicas están justificadas?
- [ ] ¿Se documentaron alternativas consideradas?

---

### Artículo III: Principio de Ejecutabilidad

```
Las especificaciones generadas deben ser:
1. Lo suficientemente precisas para regenerar el código
2. Independientes del lenguaje de programación específico
3. Enfocadas en el "qué" y "por qué", no en el "cómo"
4. Validadas contra el código existente
```

**Gate de Validación**:
- [ ] ¿Las especificaciones son independientes del stack tecnológico?
- [ ] ¿Se enfocan en requisitos y no en implementación?
- [ ] ¿Pueden usarse para crear una implementación alternativa?

---

### Artículo IV: Principio de Claridad

```
Toda documentación debe:
1. Usar lenguaje claro y sin ambigüedades
2. Incluir marcadores [NEEDS CLARIFICATION] para áreas inciertas
3. Evitar jerga técnica sin explicación
4. Incluir glosario de términos específicos del proyecto
```

**Gate de Validación**:
- [ ] ¿No hay marcadores [NEEDS CLARIFICATION] sin resolver?
- [ ] ¿El lenguaje es accesible para desarrolladores junior?
- [ ] ¿Existe un glosario de términos?

---

### Artículo V: Principio de Consistencia

```
Toda la documentación debe:
1. Seguir las mismas convenciones de formato
2. Usar la misma terminología en todo el documento
3. Mantener coherencia entre diferentes secciones
4. Referenciar correctamente entre documentos
```

**Gate de Validación**:
- [ ] ¿La terminología es consistente en toda la documentación?
- [ ] ¿Las referencias cruzadas son correctas?
- [ ] ¿El formato es uniforme?

---

### Artículo VI: Principio de Pragmatismo

```
El análisis debe:
1. Enfocarse en lo esencial, no en detalles triviales
2. Priorizar documentación de alto valor
3. Evitar sobre-documentación
4. Ser útil para el equipo de desarrollo
```

**Gate de Validación**:
- [ ] ¿La documentación es útil para el día a día?
- [ ] ¿Se evitó sobre-documentar aspectos obvios?
- [ ] ¿Se priorizó lo esencial?

---

### Artículo VII: Principio de Simplicidad

```
La documentación debe:
1. Ser lo más simple posible, pero no más simple
2. Evitar abstracciones innecesarias
3. Usar diagramas cuando ayuden a la comprensión
4. Preferir ejemplos sobre explicaciones abstractas
```

**Gate de Validación**:
- [ ] ¿La documentación es fácil de entender?
- [ ] ¿Se usan diagramas cuando ayudan?
- [ ] ¿Hay ejemplos concretos?

---

### Artículo VIII: Principio de Mantenibilidad

```
La documentación debe:
1. Ser fácil de actualizar cuando el código cambie
2. Tener secciones claramente delimitadas
3. Incluir fechas de última actualización
4. Ser versionada junto con el código
```

**Gate de Validación**:
- [ ] ¿Es fácil actualizar la documentación?
- [ ] ¿Las secciones están bien delimitadas?
- [ ] ¿Incluye fechas de actualización?

---

### Artículo IX: Principio de Validación Continua

```
Durante todo el análisis:
1. Validar constantemente contra el código real
2. Corregir discrepancias inmediatamente
3. Documentar cualquier desviación del código
4. Asegurar que la documentación refleje la realidad
```

**Gate de Validación**:
- [ ] ¿La documentación refleja el código real?
- [ ] ¿Se corrigieron discrepancias?
- [ ] ¿Se documentaron desviaciones?

---

## 🎯 Criterios de Éxito

El análisis se considera exitoso cuando:

1. **Completitud**: 100% de los componentes críticos están documentados
2. **Claridad**: Un desarrollador nuevo puede entender el proyecto en < 1 día
3. **Ejecutabilidad**: Las especificaciones pueden usarse para regenerar el código
4. **Utilidad**: El equipo encuentra la documentación útil para el día a día
5. **Mantenibilidad**: La documentación puede actualizarse fácilmente

---

## 📊 Métricas de Calidad

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| **Completitud** | 100% | [ACTUAL]% |
| **Claridad** | < 1 día para onboarding | [ACTUAL] días |
| **Ejecutabilidad** | Regenerable | [SI/NO] |
| **Utilidad** | Feedback positivo | [FEEDBACK] |
| **Mantenibilidad** | Fácil actualización | [FACIL/DIFICIL] |

---

## 🔄 Proceso de Enmienda

Modificaciones a esta constitución requieren:

1. **Documentación explícita** de la razón del cambio
2. **Revisión y aprobación** por el equipo de desarrollo
3. **Evaluación de compatibilidad** con documentación existente
4. **Actualización de fecha** y versión

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambio | Autor |
|-------|---------|--------|-------|
| {{date}} | 1.0.0 | Constitución inicial | {{analyst}} |

---

**Última actualización**: {{date}}  
**Versión**: 1.0.0  
**Estado**: {{status}}
