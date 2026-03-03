
(function () {
    "use strict";

    var WHATSAPP = "5219931102606";
    var NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

    var ORIGIN = {
        label: "Centro, Villahermosa",
        lat: 17.9896,
        lng: -92.9295,
    };

    var TRAVEL_FEES_BY_MUNICIPIO = {
        "Centro": 0,
        "Nacajuca": 150,
        "Cunduacán": 250,
        "Jalpa de Méndez": 250,
        "Comalcalco": 300,
        "Paraíso": 350,
        "Teapa": 300,
        "Jalapa": 350,
        "Macuspana": 450,
        "Huimanguillo": 450,
        "Tacotalpa": 500,
        "Emiliano Zapata": 650,
        "Jonuta": 600,
        "Balancán": 700,
        "Tenosique": 700,
    };

    var DEFAULT_TRAVEL_FEE = 300;

    var RUBROS = [
        {
            id: "plomeria",
            name: "Plomería",
            base: 350,
            options: [
                { id: "diagnostico", label: "Diagnóstico / revisión", price: 0 },
                { id: "fuga", label: "Fuga (localizar y reparar)", price: 250 },
                { id: "llave", label: "Cambio de llave / mezcladora", price: 300 },
                { id: "wc", label: "Reparación WC (flotador, sapito, fuga)", price: 280 },
                { id: "destape", label: "Destape (lavabo/tarja/baño)", price: 250 },
            ],
        },
        {
            id: "electricidad",
            name: "Electricidad",
            base: 350,
            options: [
                { id: "diagnostico", label: "Diagnóstico / revisión", price: 0 },
                { id: "contacto", label: "Contacto / apagador (revisión o cambio)", price: 200 },
                { id: "lampara", label: "Instalación lámpara / ventilador", price: 250 },
                { id: "corto", label: "Corto / falla eléctrica (detectar y corregir)", price: 350 },
                { id: "tierra", label: "Tierra física / protección", price: 350 },
            ],
        },
        {
            id: "albanileria",
            name: "Albañilería",
            base: 450,
            options: [
                { id: "demolicion", label: "Demolición (retiro / preparación)", price: 450 },
                { id: "resane", label: "Resane (grietas / aplanado)", price: 300 },
                { id: "muros", label: "Levantamiento de muro (estimado inicial)", price: 600 },
                { id: "piso", label: "Nivelación / reparación de piso", price: 450 },
            ],
        },
        {
            id: "pintura",
            name: "Pintura",
            base: 300,
            options: [
                { id: "interior", label: "Pintura interior (estimado inicial)", price: 600 },
                { id: "exterior", label: "Pintura exterior (estimado inicial)", price: 750 },
                { id: "resane", label: "Resane / preparación", price: 300 },
                { id: "sellador", label: "Sellador / primario", price: 250 },
            ],
        },
        {
            id: "impermeabilizacion",
            name: "Impermeabilización",
            base: 400,
            options: [
                { id: "revision", label: "Revisión de azotea", price: 0 },
                { id: "sellado", label: "Sellado de grietas / fisuras", price: 300 },
                { id: "m2_20", label: "Aplicación (hasta 20m²)", price: 1200 },
                { id: "m2_50", label: "Aplicación (hasta 50m²)", price: 2200 },
            ],
        },
        {
            id: "remodelacion",
            name: "Remodelación",
            base: 500,
            options: [
                { id: "banio", label: "Baño (estimado inicial)", price: 1200 },
                { id: "cocina", label: "Cocina (estimado inicial)", price: 1500 },
                { id: "fachada", label: "Fachada (estimado inicial)", price: 1200 },
                { id: "acabados", label: "Acabados (yeso, pasta, pintura)", price: 900 },
            ],
        },
    ];

    function money(n) {
        return "$" + (Math.round((n || 0) * 100) / 100).toFixed(0);
    }

    function getEl(id) {
        return document.getElementById(id);
    }

    var map = null;
    var marker = null;
    var selectedLocation = null;

    function getRubro() {
        var sel = getEl("ecoRubro");
        var id = sel ? sel.value : "";
        return RUBROS.find(function (r) { return r.id === id; }) || RUBROS[0];
    }

    function renderRubros() {
        var sel = getEl("ecoRubro");
        if (!sel) return;

        sel.innerHTML = RUBROS
            .map(function (r) {
                return '<option value="' + r.id + '">' + r.name + "</option>";
            })
            .join("");
    }

    function renderOptions() {
        var rubro = getRubro();
        var baseEl = getEl("ecoBase");
        var wrap = getEl("ecoOptions");
        if (!wrap) return;

        if (baseEl) baseEl.value = money(rubro.base) + " MXN";

        wrap.innerHTML = rubro.options
            .map(function (o) {
                return (
                    '<label class="mt-eco-option">' +
                    '<input type="checkbox" data-opt="' + o.id + '" />' +
                    '<span class="mt-eco-option__label">' + o.label + '</span>' +
                    '<span class="mt-eco-option__price">' + (o.price ? money(o.price) : "—") + '</span>' +
                    "</label>"
                );
            })
            .join("");

        update();
    }

    function getSelectedOptions(rubro) {
        var wrap = getEl("ecoOptions");
        if (!wrap) return [];
        var checked = Array.prototype.slice.call(wrap.querySelectorAll('input[type="checkbox"][data-opt]:checked'));
        var ids = checked.map(function (c) { return c.getAttribute("data-opt"); });
        return rubro.options.filter(function (o) { return ids.indexOf(o.id) >= 0; });
    }

    function getUrgencyLabel(v) {
        if (v === "hoy") return "Hoy";
        if (v === "esta_semana") return "Esta semana";
        if (v === "sin_prisa") return "Sin prisa";
        return v || "";
    }

    function buildText(state) {
        var lines = [];
        lines.push("*Ecoservis — Solicitud de cotización*");
        lines.push("Fecha: " + new Date().toLocaleString());
        lines.push("");
        if (state.name) lines.push("Nombre: " + state.name);
        if (state.address) lines.push("Zona/Dirección: " + state.address);
        if (state.municipio) lines.push("Municipio: " + state.municipio);
        if (state.urgency) lines.push("Urgencia: " + state.urgency);
        lines.push("Rubro: " + state.rubroName);
        lines.push("");
        lines.push("Cargo fijo: " + money(state.base));

        if (state.options.length) {
            lines.push("Conceptos:");
            state.options.forEach(function (o) {
                lines.push("- " + o.label + (o.price ? " (" + money(o.price) + ")" : ""));
            });
        } else {
            lines.push("Conceptos: (no seleccionados)");
        }

        lines.push("");
        lines.push("Traslado (estimado): " + money(state.travelFee));
        lines.push("Estimado: " + money(state.total) + " MXN");
        lines.push("");
        lines.push("*Nota:* El estimado puede ajustarse según materiales y alcance en sitio.");

        if (state.notes) {
            lines.push("");
            lines.push("Detalles:");
            lines.push(state.notes);
        }

        return lines.join("\n");
    }

    function readState() {
        var rubro = getRubro();
        var options = getSelectedOptions(rubro);
        var name = (getEl("ecoName").value || "").trim();
        var address = (getEl("ecoAddress").value || "").trim();
        var urgency = getUrgencyLabel(getEl("ecoUrgency").value);
        var notes = (getEl("ecoNotes").value || "").trim();

        var municipio = selectedLocation && selectedLocation.municipio ? selectedLocation.municipio : "";
        var travelFee = selectedLocation && typeof selectedLocation.travelFee === "number" ? selectedLocation.travelFee : 0;

        var sum = options.reduce(function (s, o) { return s + (o.price || 0); }, 0);
        var total = (rubro.base || 0) + sum + (travelFee || 0);

        return {
            rubroId: rubro.id,
            rubroName: rubro.name,
            base: rubro.base || 0,
            options: options,
            total: total,
            name: name,
            address: address,
            urgency: urgency,
            notes: notes,
            municipio: municipio,
            travelFee: travelFee,
        };
    }

    function update() {
        var state = readState();
        var totalEl = getEl("ecoTotal");
        var textEl = getEl("ecoText");
        var municipioEl = getEl("ecoMunicipio");
        var travelEl = getEl("ecoTravelFee");
        if (totalEl) totalEl.textContent = money(state.total);
        if (textEl) textEl.value = buildText(state);
        if (municipioEl) municipioEl.value = state.municipio || "";
        if (travelEl) travelEl.value = money(state.travelFee) + " MXN";
    }

    function haversineKm(a, b) {
        var R = 6371;
        var dLat = ((b.lat - a.lat) * Math.PI) / 180;
        var dLng = ((b.lng - a.lng) * Math.PI) / 180;
        var lat1 = (a.lat * Math.PI) / 180;
        var lat2 = (b.lat * Math.PI) / 180;
        var s1 = Math.sin(dLat / 2);
        var s2 = Math.sin(dLng / 2);
        var h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    function computeTravelFee(municipio, coords) {
        if (municipio && Object.prototype.hasOwnProperty.call(TRAVEL_FEES_BY_MUNICIPIO, municipio)) {
            return TRAVEL_FEES_BY_MUNICIPIO[municipio];
        }
        if (coords && isFinite(coords.lat) && isFinite(coords.lng)) {
            var km = haversineKm(ORIGIN, coords);
            if (km <= 6) return 0;
            if (km <= 14) return 150;
            if (km <= 28) return 250;
            if (km <= 45) return 350;
            return 450;
        }
        return DEFAULT_TRAVEL_FEE;
    }

    function getMunicipioFromNominatim(data) {
        var addr = data && data.address ? data.address : null;
        if (!addr) return "";
        return (
            addr.municipality ||
            addr.city_district ||
            addr.county ||
            addr.city ||
            addr.town ||
            addr.village ||
            ""
        );
    }

    function reverseGeocode(lat, lng) {
        return fetch(
            NOMINATIM_REVERSE +
                "?format=jsonv2&zoom=12&addressdetails=1&lat=" +
                encodeURIComponent(String(lat)) +
                "&lon=" +
                encodeURIComponent(String(lng)),
            {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                },
            }
        )
            .then(function (r) {
                if (!r.ok) throw new Error("reverse geocode failed");
                return r.json();
            })
            .catch(function () {
                return null;
            });
    }

    function setLocation(lat, lng, municipio) {
        if (!isFinite(lat) || !isFinite(lng)) return;
        var m = municipio || "";
        var fee = computeTravelFee(m, { lat: lat, lng: lng });
        selectedLocation = {
            lat: lat,
            lng: lng,
            municipio: m,
            travelFee: fee,
        };
        update();
    }

    function placeMarker(lat, lng) {
        if (!map || !window.L) return;
        if (!marker) {
            marker = window.L.marker([lat, lng], { draggable: true });
            marker.addTo(map);
            marker.on("dragend", function () {
                var p = marker.getLatLng();
                handlePick(p.lat, p.lng);
            });
        } else {
            marker.setLatLng([lat, lng]);
        }
    }

    function clearLocation() {
        selectedLocation = null;
        if (marker && map) {
            map.removeLayer(marker);
            marker = null;
        }
        var municipioEl = getEl("ecoMunicipio");
        var travelEl = getEl("ecoTravelFee");
        if (municipioEl) municipioEl.value = "";
        if (travelEl) travelEl.value = money(0) + " MXN";
        update();
    }

    function handlePick(lat, lng) {
        placeMarker(lat, lng);
        reverseGeocode(lat, lng).then(function (data) {
            var muni = data ? getMunicipioFromNominatim(data) : "";
            setLocation(lat, lng, muni);
        });
    }

    function initMap() {
        var mapEl = getEl("ecoMap");
        if (!mapEl || !window.L) return;

        map = window.L.map(mapEl, {
            zoomControl: true,
            scrollWheelZoom: false,
        });

        map.setView([ORIGIN.lat, ORIGIN.lng], 12);

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
        }).addTo(map);

        map.on("click", function (e) {
            if (!e || !e.latlng) return;
            handlePick(e.latlng.lat, e.latlng.lng);
        });
    }

    function sendWhatsApp() {
        var textEl = getEl("ecoText");
        var text = textEl ? textEl.value : "";
        if (!text) {
            update();
            text = textEl ? textEl.value : "";
        }
        window.location.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text);
    }

    function copyText() {
        var textEl = getEl("ecoText");
        if (!textEl) return;
        textEl.focus();
        textEl.select();
        try {
            document.execCommand("copy");
        } catch (e) {
            // ignore
        }
    }

    function bind() {
        var rubroSel = getEl("ecoRubro");
        if (rubroSel) {
            rubroSel.addEventListener("change", function () {
                renderOptions();
            });
        }

        var opts = getEl("ecoOptions");
        if (opts) {
            opts.addEventListener("change", update);
        }

        ["ecoName", "ecoAddress", "ecoUrgency", "ecoNotes"].forEach(function (id) {
            var el = getEl(id);
            if (!el) return;
            el.addEventListener("input", update);
            el.addEventListener("change", update);
        });

        var sendBtn = getEl("ecoSend");
        if (sendBtn) sendBtn.addEventListener("click", sendWhatsApp);

        var copyBtn = getEl("ecoCopy");
        if (copyBtn) copyBtn.addEventListener("click", copyText);

        var useBtn = getEl("ecoUseMyLocation");
        if (useBtn) {
            useBtn.addEventListener("click", function () {
                if (!navigator.geolocation) return;
                navigator.geolocation.getCurrentPosition(
                    function (pos) {
                        if (!pos || !pos.coords) return;
                        var lat = pos.coords.latitude;
                        var lng = pos.coords.longitude;
                        if (map) map.setView([lat, lng], 15);
                        handlePick(lat, lng);
                    },
                    function () {
                        // ignore
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
                );
            });
        }

        var clearBtn = getEl("ecoClearLocation");
        if (clearBtn) clearBtn.addEventListener("click", clearLocation);
    }

    renderRubros();
    renderOptions();
    initMap();
    bind();
})();
