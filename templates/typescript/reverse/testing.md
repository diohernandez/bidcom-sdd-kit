# Estrategia de Testing: {{projectName}}

> **Estado**: completed  
> **Fecha de Análisis**: {{analysisDate}}  
> **Analista**: {{analyst}}

---

## 📋 Resumen Ejecutivo

{{overview}}

---

## 📊 Pirámide de Testing

```
        ╱╲
       ╱  ╲
      ╱ E2E╲        Cypress (~{{e2eTestCount}} tests)
     ╱──────╲
    ╱        ╲
   ╱ Component╲     Jest + RTL (~{{componentTestCount}} tests)
  ╱────────────╲
 ╱              ╲
╱   Unit Tests   ╲  Jest (~{{unitTestCount}} tests)
╱────────────────╲
```

---

{{jestAnalysis}}
---

{{rtlAnalysis}}
---

{{cypressAnalysis}}
---

{{storybookAnalysis}}
---

{{coverageAnalysis}}
---

{{mockAnalysis}}
---

## 🎯 Comandos de Testing (scripts reales de package.json)

| Script | Fuente |
|--------|--------|
{{testingCommandsTable}}

---

## ✅ Gates de Validación

- [x] ¿Se documentó la configuración de Jest?
- [x] ¿Se documentó el uso de React Testing Library?
- [x] ¿Se documentó la configuración de Cypress?
- [x] ¿Se listaron los stories de Storybook?
- [x] ¿Se explicaron las estrategias de mocking?
- [x] ¿Se documentaron los comandos de testing?

---

## 📝 Notas

_Las secciones anteriores reportan hechos detectados por grep/find/jq. La estrategia real de mocking, thresholds de cobertura esperados, etc. deben confirmarse contra el proyecto — no asumir lo mismo que en otro análisis previo._

---

**Última actualización**: {{analysisDate}}
**Versión**: 1.0.0
