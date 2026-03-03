(function () {
  "use strict";

  var WA_PHONE = "5219932171855";
  var STORAGE_DRAFT_KEY = "ggm:casaxcasa:draft";
  var STORAGE_HISTORY_KEY = "ggm:casaxcasa:history";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function makeId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
      }
    } catch (e) {
      // ignore
    }
    return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function safeJsonParse(s, fallback) {
    try {
      return JSON.parse(s);
    } catch (e) {
      return fallback;
    }
  }

  function getParam(name) {
    var url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function setStatus(msg, kind) {
    var el = qs("#ggmStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("ggm-status--ok");
    el.classList.remove("ggm-status--bad");
    if (kind === "ok") el.classList.add("ggm-status--ok");
    if (kind === "bad") el.classList.add("ggm-status--bad");
  }

  function normalizeTagId(v) {
    if (!v) return "";
    return String(v).trim().slice(0, 80);
  }

  function validateEmail(v) {
    if (!v) return true;
    var s = String(v).trim();
    if (!s) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function buildMapsUrl(lat, lng) {
    if (lat == null || lng == null) return "";
    var q = encodeURIComponent(lat + "," + lng);
    return "https://www.google.com/maps?q=" + q;
  }

  function buildMapsUrlFromAddress(addr) {
    if (!addr) return "";
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr);
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("timeout"));
      }, timeoutMs);

      fetch(url, options)
        .then(function (res) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(res);
        })
        .catch(function (err) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function reverseGeocode(lat, lng) {
    var url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
      encodeURIComponent(lat) +
      "&lon=" +
      encodeURIComponent(lng);

    return fetchWithTimeout(url, { headers: { Accept: "application/json" } }, 9000)
      .then(function (res) {
        if (!res.ok) throw new Error("reverse geocode failed");
        return res.json();
      })
      .then(function (data) {
        if (!data) return "";
        if (typeof data.display_name === "string") return data.display_name;
        return "";
      })
      .catch(function () {
        return "";
      });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function refreshMapLink() {
    var lat = (qs("#ggmLat").value || "").trim();
    var lng = (qs("#ggmLng").value || "").trim();
    var mapLinkEl = qs("#ggmOpenMap");
    var mapInput = (qs("#ggmMapLink").value || "").trim();
    var addr = (qs("#ggmAddress").value || "").trim();

    var url = "";
    if (mapInput) url = mapInput;
    else if (lat && lng) url = buildMapsUrl(lat, lng);
    else if (addr) url = buildMapsUrlFromAddress(addr);

    mapLinkEl.href = url || "#";
    mapLinkEl.setAttribute("aria-disabled", url ? "false" : "true");
    mapLinkEl.style.opacity = url ? "1" : "0.55";
    mapLinkEl.style.pointerEvents = url ? "auto" : "none";
  }

  function readForm() {
    return {
      tagId: normalizeTagId(qs("#ggmTagId").textContent),
      name: (qs("#ggmName").value || "").trim(),
      address: (qs("#ggmAddress").value || "").trim(),
      lat: (qs("#ggmLat").value || "").trim(),
      lng: (qs("#ggmLng").value || "").trim(),
      mapLink: (qs("#ggmMapLink").value || "").trim(),
      request: (qs("#ggmRequest").value || "").trim(),
    };
  }

  function writeForm(d) {
    if (!d) return;
    if (typeof d.name === "string") qs("#ggmName").value = d.name;
    if (typeof d.address === "string") qs("#ggmAddress").value = d.address;
    if (typeof d.lat === "string") qs("#ggmLat").value = d.lat;
    if (typeof d.lng === "string") qs("#ggmLng").value = d.lng;
    if (typeof d.mapLink === "string") qs("#ggmMapLink").value = d.mapLink;
    if (typeof d.request === "string") qs("#ggmRequest").value = d.request;

    refreshMapLink();
  }

  function getHistory() {
    var raw = localStorage.getItem(STORAGE_HISTORY_KEY) || "[]";
    var list = safeJsonParse(raw, []);
    if (!Array.isArray(list)) return [];
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      if (!list[i] || typeof list[i] !== "object") continue;
      if (!list[i].id) {
        list[i].id = makeId();
        changed = true;
      }
    }
    if (changed) setHistory(list);
    return list;
  }

  function setHistory(list) {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(list));
  }

  function addHistoryEntry(entry) {
    var list = getHistory();
    list.unshift(entry);
    if (list.length > 200) list = list.slice(0, 200);
    setHistory(list);
  }

  function renderHistory() {
    var ul = qs("#ggmHistory");
    if (!ul) return;
    var list = getHistory();
    if (!list.length) {
      ul.innerHTML = "<li class=\"ggm-list-item\"><div class=\"ggm-list-item__body\">Sin registros aún.</div></li>";
      return;
    }

    ul.innerHTML = list
      .map(function (it) {
        var title = [it.name || "(sin nombre)", it.tagId ? "tag:" + it.tagId : ""].filter(Boolean).join(" · ");
        var meta = [it.createdAt || "", it.tagId ? "tag:" + it.tagId : ""].filter(Boolean).join("  ");
        var bodyLines = [];
        if (it.address) bodyLines.push("Dirección: " + it.address);
        if (it.mapLink) bodyLines.push("Mapa: " + it.mapLink);
        if (it.request) bodyLines.push("Solicitud: " + it.request);
        var body = bodyLines.join("\n");
        return (
          "<li class=\"ggm-list-item\">" +
          "<div class=\"ggm-list-item__top\">" +
          "<div class=\"ggm-list-item__title\">" +
          escapeHtml(title) +
          "</div>" +
          "<div class=\"ggm-list-item__meta\">" +
          escapeHtml(meta) +
          "</div>" +
          "</div>" +
          "<div class=\"ggm-list-item__body\">" +
          escapeHtml(body) +
          "</div>" +
          "</li>"
        );
      })
      .join("");
  }

  function saveDraft() {
    var data = readForm();
    localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(data));
    setStatus("Respaldo guardado en este dispositivo.", "ok");
  }

  function loadDraft() {
    var raw = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (!raw) return;
    var data = safeJsonParse(raw, null);
    if (!data) return;
    writeForm(data);
  }

  function clearDraft() {
    localStorage.removeItem(STORAGE_DRAFT_KEY);
    qs("#ggmForm").reset();
    qs("#ggmLat").value = "";
    qs("#ggmLng").value = "";
    qs("#ggmMapLink").value = "";
    refreshMapLink();
    setStatus("Formulario limpio.", "ok");
  }

  function clearLocation() {
    qs("#ggmLat").value = "";
    qs("#ggmLng").value = "";
    refreshMapLink();
    setStatus("Ubicación removida.", "ok");
  }

  function getLocation() {
    if (!navigator.geolocation) {
      setStatus("Este dispositivo no soporta geolocalización.", "bad");
      return;
    }
    setStatus("Obteniendo ubicación…", "");

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        qs("#ggmLat").value = String(lat);
        qs("#ggmLng").value = String(lng);
        if (!(qs("#ggmMapLink").value || "").trim()) {
          qs("#ggmMapLink").value = buildMapsUrl(lat, lng);
        }

        reverseGeocode(lat, lng).then(function (addr) {
          var addressEl = qs("#ggmAddress");
          var currentAddress = (addressEl.value || "").trim();
          if (!currentAddress) {
            if (addr) addressEl.value = addr;
            else addressEl.value = "Ubicación: " + String(lat) + ", " + String(lng);
          }
          refreshMapLink();
          setStatus("Ubicación lista.", "ok");
        });
      },
      function (err) {
        setStatus("No se pudo obtener ubicación: " + (err && err.message ? err.message : ""), "bad");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  function buildWhatsAppText(d) {
    var lines = [];
    lines.push("*Solicitud Casa x Casa*");
    if (d.tagId) lines.push("Brigadista(Tag): " + d.tagId);
    lines.push("Fecha: " + new Date().toLocaleString());
    lines.push("");
    lines.push("Nombre: " + (d.name || ""));
    lines.push("Dirección: " + (d.address || ""));
    if (d.mapLink) lines.push("Mapa: " + d.mapLink);
    if (d.lat && d.lng) lines.push("Coords: " + d.lat + "," + d.lng);
    lines.push("");
    lines.push("Solicitud:");
    lines.push(d.request || "");
    return lines.join("\n");
  }

  function sendWhatsApp() {
    var data = readForm();

    if (!data.name) {
      setStatus("Falta el nombre.", "bad");
      return;
    }
    if (!data.address) {
      setStatus("Falta la dirección.", "bad");
      return;
    }
    if (!data.request) {
      setStatus("Falta la descripción de la solicitud.", "bad");
      return;
    }

    if (!data.mapLink) {
      if (data.lat && data.lng) data.mapLink = buildMapsUrl(data.lat, data.lng);
      else if (data.address) data.mapLink = buildMapsUrlFromAddress(data.address);
    }

    var entry = Object.assign({}, data, {
      id: makeId(),
      createdAt: nowIso(),
    });
    addHistoryEntry(entry);
    localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(data));
    renderHistory();

    var text = buildWhatsAppText(entry);
    var url = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(text);
    setStatus("Abriendo WhatsApp…", "ok");
    window.location.href = url;
  }

  function exportHistory() {
    var list = getHistory();
    var payload = {
      exportedAt: nowIso(),
      count: list.length,
      items: list,
    };
    var json = JSON.stringify(payload, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ggm_casaxcasa_historial.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
    setStatus("Exportación lista.", "ok");
  }

  function clearHistory() {
    if (!confirm("¿Borrar historial local de este dispositivo?")) return;
    localStorage.removeItem(STORAGE_HISTORY_KEY);
    renderHistory();
    setStatus("Historial borrado.", "ok");
  }

  async function shareLink() {
    var url = new URL(window.location.href);
    url.searchParams.delete("_t");
    var shareUrl = url.toString();

    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: shareUrl });
        setStatus("Enlace compartido.", "ok");
        return;
      }
    } catch (e) {
      // ignore
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Enlace copiado.", "ok");
    } catch (e2) {
      prompt("Copia este enlace:", shareUrl);
      setStatus("Copia el enlace manualmente.", "ok");
    }
  }

  function initTag() {
    var tag = getParam("tag") || getParam("t") || "";
    tag = normalizeTagId(tag);
    qs("#ggmTagId").textContent = tag || "(sin tag)";
  }

  function bind() {
    qs("#ggmForm").addEventListener("submit", function (e) {
      e.preventDefault();
      sendWhatsApp();
    });

    qs("#ggmGetLocation").addEventListener("click", function () {
      getLocation();
    });

    qs("#ggmClearLocation").addEventListener("click", function () {
      clearLocation();
    });

    qs("#ggmSaveDraft").addEventListener("click", function () {
      saveDraft();
    });

    qs("#ggmClearDraft").addEventListener("click", function () {
      if (!confirm("¿Limpiar el formulario?")) return;
      clearDraft();
    });

    qs("#ggmExport").addEventListener("click", function () {
      exportHistory();
    });

    qs("#ggmClearHistory").addEventListener("click", function () {
      clearHistory();
    });

    qs("#ggmShareLink").addEventListener("click", function () {
      shareLink();
    });

    var inputs = qsa("#ggmForm input, #ggmForm textarea");
    inputs.forEach(function (el) {
      el.addEventListener("input", function () {
        if (
          el.id === "ggmLat" ||
          el.id === "ggmLng" ||
          el.id === "ggmMapLink" ||
          el.id === "ggmAddress"
        ) {
          refreshMapLink();
        }
      });
    });

    refreshMapLink();
  }

  initTag();
  loadDraft();
  bind();
  renderHistory();
})();
