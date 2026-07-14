# Arquitectura: {{projectName}}

> **Estado**: completed
> **Fecha de Análisis**: {{analysisDate}}
> **Analista**: {{analyst}}
> **Convención de capas detectada**: {{layerConvention}}

---

## 📋 Resumen Ejecutivo

{{overview}}

---

## 📁 Estructura de Directorios

{{directoryStructure}}
---

{{layerAnalysis}}
---

## 🎯 Hallazgos de Patrones (hechos, no interpretación)

| Patrón buscado | Archivos | Ocurrencias | Ejemplo |
|-----------------|----------|-------------|---------|
{{patternsFactsTable}}
_Esta tabla reporta coincidencias de búsqueda (grep), no un juicio sobre si el patrón está "bien aplicado". La síntesis arquitectónica (qué significan estos hallazgos en conjunto) la completa quien analiza el proyecto — humano o agente de IA — a partir de estos hechos, no este script._

---

{{tsConfigAnalysis}}
---

## ✅ Gates de Validación

- [x] ¿Se documentó la estructura de directorios completa?
- [x] ¿Se detectó (o se descartó con claridad) una convención de capas?
- [x] ¿Se reportaron los hallazgos de patrones como hechos verificables (archivo, cantidad, ejemplo)?
- [x] ¿Se documentó la configuración de TypeScript?
- [x] ¿Se identificaron los path aliases?

---

## 📝 Notas

{{notes}}
---

**Última actualización**: {{analysisDate}}
**Versión**: 1.0.0
