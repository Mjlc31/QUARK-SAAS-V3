# Prospecção Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Improve the Prospecting tab by adding a segment combobox, fixing the base location to Maceió coordinates, and optimizing salespeople's workflow with bulk import and street view.

**Architecture:** Frontend React updates for Prospeccao.tsx (adding custom combobox state, checkbox selection for leads, new buttons). Backend server.js update to accept explicit lat/lon from the request.

**Tech Stack:** React, Tailwind CSS, Node.js (Express)

---

### Task 1: Update Backend to Accept Fixed Coordinates

**Files:**
- Modify: `backend/server.js:148-180`

**Step 1: Write the minimal implementation**

Modify the `/api/prospeccao/buscar` endpoint to accept `lat` and `lon` from `req.body`. If they are provided, skip the Nominatim geocoding.

```javascript
    const { segmento, localizacao, abertoAgora, lat: reqLat, lon: reqLon } = req.body;
    let query = `${segmento} em ${localizacao}`;
    if (abertoAgora) {
      query += " aberto agora";
    }

    console.log(`[PROSPECCAO] Iniciando busca: ${query}`);

    let lat = reqLat || "0";
    let lon = reqLon || "0";
    
    if (!reqLat || !reqLon) {
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(localizacao)}&format=json&limit=1`;
        const geoRes = await fetch(geoUrl, {
          headers: { "User-Agent": "quark-saas" }
        });
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = geoData[0].lat;
          lon = geoData[0].lon;
        }
      } catch (e) {
        console.warn("[PROSPECCAO] Falha no geocode. Usando 0,0", e);
      }
    }
```

### Task 2: Fix Location Input & Add Combobox for Segments

**Files:**
- Modify: `src/pages/Prospeccao.tsx`

**Step 1: Update State and UI**

1. Change `localizacao` state to be hardcoded or simply use a constant for the API call. The UI should display the location as "Maceió - AL (Ponto Fixo)".
2. Implement a custom combobox for the "Segmento" input. Use a state `showDropdown` and an array of suggested segments. When clicking the input, show the dropdown. Filter the dropdown based on what is typed.
3. In `handleSearch`, pass the coordinates `lat: -9.565303169507171, lon: -35.75619080000001` in the `fetch` body.

### Task 3: Optimize Workflow (Bulk Import & Street View)

**Files:**
- Modify: `src/pages/Prospeccao.tsx`

**Step 1: Implement Bulk Import and Street View**

1. Add a `selectedLeads` state (Set or Array of indices).
2. Add a checkbox to each lead card.
3. Add a "Selecionar Todos" checkbox at the top of the list.
4. Add a "Importar Selecionados" button that iterates over `selectedLeads`, calls `addLead` for each, and then clears the selection.
5. Add a "Street View" button next to "Ver Telhado" in the lead card.
   - Street View URL: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${prospect.latitude},${prospect.longitude}`
