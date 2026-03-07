(function () {
    "use strict";

    var SALES_KEY = "mt:sales:mingo";

    function qs(id) {
        return document.getElementById(id);
    }

    function safeJsonParse(str, fallback) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback;
        }
    }

    function getSales() {
        try {
            var raw = window.localStorage.getItem(SALES_KEY);
            var arr = safeJsonParse(raw, []);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function toMillis(ts) {
        if (!ts) return null;
        if (typeof ts === "number" && isFinite(ts)) return ts;
        if (ts && typeof ts.toDate === "function") {
            var d = ts.toDate();
            return d && d.getTime ? d.getTime() : null;
        }
        if (ts && typeof ts.seconds === "number") return ts.seconds * 1000;
        return null;
    }

    function makeSaleFromOrderDoc(o) {
        var createdAtMs = toMillis(o && o.createdAt);
        if (!createdAtMs) return null;
        var items = Array.isArray(o.items) ? o.items : [];
        return {
            id: String(o.id || ""),
            createdAt: createdAtMs,
            total: Number(o.total || 0) || 0,
            tableId: o && o.tableId ? String(o.tableId) : null,
            items: items,
        };
    }

    function money(n) {
        var v = Math.round((Number(n) || 0) * 100) / 100;
        return "$" + v.toFixed(0);
    }

    function pad2(n) {
        return String(n < 10 ? "0" + n : n);
    }

    function monthKey(d) {
        return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
    }

    function monthLabel(key) {
        var parts = String(key || "").split("-");
        if (parts.length !== 2) return String(key || "");
        var y = parts[0];
        var m = parseInt(parts[1], 10);
        var names = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
        ];
        return (names[m - 1] || parts[1]) + " " + y;
    }

    function startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }

    function startOfWeekMonday(d) {
        var day = d.getDay();
        var diff = (day + 6) % 7;
        var monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
        monday.setHours(0, 0, 0, 0);
        return monday.getTime();
    }

    function startOfMonth(d) {
        return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    }

    function computeRange(state) {
        var now = new Date();

        if (state.range === "day") {
            var sDay = startOfDay(now);
            return { start: sDay, end: now.getTime(), label: "Día" };
        }

        if (state.range === "week") {
            var sWeek = startOfWeekMonday(now);
            return { start: sWeek, end: now.getTime(), label: "Semana" };
        }

        if (state.range === "month") {
            var key = state.monthKey || monthKey(now);
            var parts = key.split("-");
            var y = parseInt(parts[0], 10);
            var m = parseInt(parts[1], 10) - 1;
            var sMonth = new Date(y, m, 1).getTime();
            var eMonth = new Date(y, m + 1, 1).getTime() - 1;
            return { start: sMonth, end: eMonth, label: "Mes" };
        }

        var s = startOfDay(now);
        return { start: s, end: now.getTime(), label: "Día" };
    }

    function normalizeSales(sales) {
        return sales
            .filter(function (s) {
                return s && isFinite(s.createdAt) && isFinite(s.total);
            })
            .sort(function (a, b) {
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
    }

    function computeTopItems(sales) {
        var map = {};
        sales.forEach(function (s) {
            (s.items || []).forEach(function (it) {
                var key = "";
                if (it.kind === "torta") {
                    key = "Torta " + String(it.size || "");
                } else if (it.kind === "taco") {
                    key = "Taco " + String(it.taco || "");
                } else if (it.kind === "bebida") {
                    key = "Bebida " + String(it.bebida || "");
                } else if (it.kind === "postre") {
                    key = "Postre " + String(it.postre || "");
                } else {
                    key = String(it.kind || "Item");
                }
                var qty = Number(it.qty) || 0;
                if (!map[key]) map[key] = { name: key, qty: 0 };
                map[key].qty += qty;
            });
        });

        return Object.keys(map)
            .map(function (k) {
                return map[k];
            })
            .sort(function (a, b) {
                return (b.qty || 0) - (a.qty || 0);
            })
            .slice(0, 10);
    }

    function render(state) {
        var totalSalesEl = qs("mrTotalSales");
        var totalOrdersEl = qs("mrTotalOrders");
        var avgTicketEl = qs("mrAvgTicket");
        var topEl = qs("mrTopItems");
        var listEl = qs("mrSalesList");
        var monthSel = qs("mrMonth");

        var sales = normalizeSales(getSales());

        var months = {};
        sales.forEach(function (s) {
            var key = monthKey(new Date(s.createdAt));
            months[key] = true;
        });

        var monthKeys = Object.keys(months).sort().reverse();
        var currentMonth = monthKey(new Date());
        if (monthKeys.indexOf(currentMonth) === -1) monthKeys.unshift(currentMonth);

        if (monthSel) {
            var existing = monthSel.getAttribute("data-filled") === "1";
            if (!existing) {
                monthSel.innerHTML = monthKeys
                    .map(function (k) {
                        return '<option value="' + k + '">' + monthLabel(k) + "</option>";
                    })
                    .join("");
                monthSel.setAttribute("data-filled", "1");
            }

            if (state.monthKey && monthSel.value !== state.monthKey) {
                monthSel.value = state.monthKey;
            }
            if (!state.monthKey) {
                state.monthKey = monthSel.value || currentMonth;
            }
        }

        var range = computeRange(state);

        var filtered = sales.filter(function (s) {
            return (s.createdAt || 0) >= range.start && (s.createdAt || 0) <= range.end;
        });

        var total = filtered.reduce(function (sum, s) {
            return sum + (Number(s.total) || 0);
        }, 0);
        var orders = filtered.length;
        var avg = orders ? total / orders : 0;

        if (totalSalesEl) totalSalesEl.textContent = money(total);
        if (totalOrdersEl) totalOrdersEl.textContent = String(orders);
        if (avgTicketEl) avgTicketEl.textContent = money(avg);

        if (topEl) {
            var top = computeTopItems(filtered);
            topEl.innerHTML = top.length
                ? top
                      .map(function (t) {
                          return "<li><strong>" + t.qty + "</strong> <span>" + t.name + "</span></li>";
                      })
                      .join("")
                : "<li>Sin datos.</li>";
        }

        if (listEl) {
            listEl.innerHTML = filtered.length
                ? filtered
                      .slice()
                      .sort(function (a, b) {
                          return (b.createdAt || 0) - (a.createdAt || 0);
                      })
                      .slice(0, 80)
                      .map(function (s) {
                          var dt = new Date(s.createdAt || Date.now()).toLocaleString();
                          var mesa = s.tableId ? ("Mesa: " + String(s.tableId)) : "";
                          var lines = (s.items || [])
                              .map(function (it) {
                                  var label = it.kind || "item";
                                  if (it.kind === "torta") label = "Torta " + String(it.size || "");
                                  if (it.kind === "taco") label = "Taco " + String(it.taco || "");
                                  if (it.kind === "bebida") label = "Bebida " + String(it.bebida || "");
                                  if (it.kind === "postre") label = "Postre " + String(it.postre || "");
                                  return (Number(it.qty) || 0) + "× " + label;
                              })
                              .join(", ");
                          return (
                              "<li>" +
                              "<div style=\"display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;\">" +
                              "<strong>" + dt + (mesa ? " · <span style=\\\"opacity:0.85\\\">" + mesa + "</span>" : "") + "</strong>" +
                              "<strong>" + money(s.total) + "</strong>" +
                              "</div>" +
                              "<div style=\"opacity:0.9; margin-top:6px;\">" + (lines || "—") + "</div>" +
                              "</li>"
                          );
                      })
                      .join("")
                : "<li>Sin ventas registradas.</li>";
        }
    }

    function setActiveButtons(state) {
        var dayBtn = qs("mrRangeDay");
        var weekBtn = qs("mrRangeWeek");
        var monthBtn = qs("mrRangeMonth");

        function set(btn, active) {
            if (!btn) return;
            btn.style.opacity = active ? "1" : "0.78";
        }

        set(dayBtn, state.range === "day");
        set(weekBtn, state.range === "week");
        set(monthBtn, state.range === "month");

        var monthSel = qs("mrMonth");
        if (monthSel) {
            monthSel.disabled = state.range !== "month";
            monthSel.style.opacity = state.range === "month" ? "1" : "0.65";
        }
    }

    function bind() {
        var state = { range: "day", monthKey: "" };

        var authStatusEl = qs("mrAuthStatus");
        var loginBtn = qs("mrLogin");
        var logoutBtn = qs("mrLogout");
        var emailEl = qs("mrEmail");
        var passEl = qs("mrPass");
        var sourceNoteEl = qs("mrSourceNote");
        var summarySection = qs("mrSummary");
        var salesSection = qs("mrSales");

        var mode = "local";
        var fsSales = [];

        function setAuthStatus(text) {
            if (authStatusEl) authStatusEl.textContent = text || "";
        }

        function setMode(nextMode) {
            mode = nextMode;
            if (sourceNoteEl) {
                sourceNoteEl.textContent =
                    mode === "firestore"
                        ? "Este reporte se basa en pedidos guardados en Firestore (multi-dispositivo)."
                        : "Este reporte se basa en pedidos enviados desde este dispositivo/navegador (localStorage).";
            }
        }

        function setReportVisible(visible) {
            var show = !!visible;
            if (summarySection) summarySection.style.display = show ? "" : "none";
            if (salesSection) salesSection.style.display = show ? "" : "none";
        }

        function getActiveSales() {
            return mode === "firestore" ? fsSales : getSales();
        }

        function refresh() {
            setActiveButtons(state);
            renderWithSales(state, getActiveSales());
        }

        function renderWithSales(state, rawSales) {
            var totalSalesEl = qs("mrTotalSales");
            var totalOrdersEl = qs("mrTotalOrders");
            var avgTicketEl = qs("mrAvgTicket");
            var topEl = qs("mrTopItems");
            var listEl = qs("mrSalesList");
            var monthSel = qs("mrMonth");

            var sales = normalizeSales(rawSales || []);

            var months = {};
            sales.forEach(function (s) {
                var key = monthKey(new Date(s.createdAt));
                months[key] = true;
            });

            var monthKeys = Object.keys(months).sort().reverse();
            var currentMonth = monthKey(new Date());
            if (monthKeys.indexOf(currentMonth) === -1) monthKeys.unshift(currentMonth);

            if (monthSel) {
                monthSel.innerHTML = monthKeys
                    .map(function (k) {
                        return '<option value="' + k + '">' + monthLabel(k) + "</option>";
                    })
                    .join("");

                if (state.monthKey && monthSel.value !== state.monthKey) {
                    monthSel.value = state.monthKey;
                }
                if (!state.monthKey) {
                    state.monthKey = monthSel.value || currentMonth;
                }
            }

            var range = computeRange(state);
            var filtered = sales.filter(function (s) {
                return (s.createdAt || 0) >= range.start && (s.createdAt || 0) <= range.end;
            });

            var total = filtered.reduce(function (sum, s) {
                return sum + (Number(s.total) || 0);
            }, 0);
            var orders = filtered.length;
            var avg = orders ? total / orders : 0;

            if (totalSalesEl) totalSalesEl.textContent = money(total);
            if (totalOrdersEl) totalOrdersEl.textContent = String(orders);
            if (avgTicketEl) avgTicketEl.textContent = money(avg);

            if (topEl) {
                var top = computeTopItems(filtered);
                topEl.innerHTML = top.length
                    ? top
                          .map(function (t) {
                              return "<li><strong>" + t.qty + "</strong> <span>" + t.name + "</span></li>";
                          })
                          .join("")
                    : "<li>Sin datos.</li>";
            }

            if (listEl) {
                listEl.innerHTML = filtered.length
                    ? filtered
                          .slice()
                          .sort(function (a, b) {
                              return (b.createdAt || 0) - (a.createdAt || 0);
                          })
                          .slice(0, 80)
                          .map(function (s) {
                              var dt = new Date(s.createdAt || Date.now()).toLocaleString();
                              var mesa = s.tableId ? ("Mesa: " + String(s.tableId)) : "";
                              var lines = (s.items || [])
                                  .map(function (it) {
                                      var label = it.kind || "item";
                                      if (it.kind === "torta") label = "Torta " + String(it.size || "");
                                      if (it.kind === "taco") label = "Taco " + String(it.taco || "");
                                      if (it.kind === "bebida") label = "Bebida " + String(it.bebida || "");
                                      if (it.kind === "postre") label = "Postre " + String(it.postre || "");
                                      return (Number(it.qty) || 0) + "× " + label;
                                  })
                                  .join(", ");
                              return (
                                  "<li>" +
                                  "<div style=\"display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;\">" +
                                  "<strong>" + dt + (mesa ? " · <span style=\\\"opacity:0.85\\\">" + mesa + "</span>" : "") + "</strong>" +
                                  "<strong>" + money(s.total) + "</strong>" +
                                  "</div>" +
                                  "<div style=\"opacity:0.9; margin-top:6px;\">" + (lines || "—") + "</div>" +
                                  "</li>"
                              );
                          })
                          .join("")
                    : "<li>Sin ventas registradas.</li>";
            }
        }

        function loadFirestoreForCurrentRange() {
            if (!window.mtFirebase || !window.mtFirebase.listOrdersByRange) {
                setAuthStatus("Firebase no está disponible.");
                setMode("local");
                refresh();
                return;
            }

            var range = computeRange(state);
            var startIso = new Date(range.start).toISOString();
            var endIso = new Date(range.end + 1).toISOString();

            setAuthStatus("Cargando pedidos...");
            window.mtFirebase
                .listOrdersByRange("mingo", startIso, endIso, 800)
                .then(function (orders) {
                    fsSales = (orders || []).map(makeSaleFromOrderDoc).filter(Boolean);
                    setAuthStatus("Sesión activa · " + String((orders && orders.length) || 0) + " pedidos en este rango.");
                    setMode("firestore");
                    refresh();
                })
                .catch(function (err) {
                    var code = err && err.code ? String(err.code) : "";
                    setAuthStatus(
                        "No se pudo leer Firestore (verifica owners UID y Rules)" + (code ? " · " + code : "") + "."
                    );
                    setMode("local");
                    refresh();
                });
        }

        function setupAuthUi() {
            if (!window.mtFirebase || !window.mtFirebase.onAuthStateChanged) {
                setAuthStatus("Firebase no está disponible.");
                setReportVisible(false);
                return;
            }

            window.mtFirebase.onAuthStateChanged(function (user) {
                if (user) {
                    if (logoutBtn) logoutBtn.style.display = "inline-flex";
                    setReportVisible(true);
                    loadFirestoreForCurrentRange();
                } else {
                    if (logoutBtn) logoutBtn.style.display = "none";
                    setAuthStatus("No has iniciado sesión.");
                    setReportVisible(false);
                    setMode("local");
                }
            });

            if (loginBtn) {
                loginBtn.addEventListener("click", function () {
                    var email = (emailEl && emailEl.value) ? String(emailEl.value).trim() : "";
                    var pass = (passEl && passEl.value) ? String(passEl.value) : "";
                    if (!email || !pass) {
                        setAuthStatus("Escribe email y contraseña.");
                        return;
                    }
                    setAuthStatus("Iniciando sesión...");
                    window.mtFirebase
                        .loginOwner(email, pass)
                        .then(function () {
                            setAuthStatus("Sesión activa.");
                            loadFirestoreForCurrentRange();
                        })
                        .catch(function () {
                            setAuthStatus("No se pudo iniciar sesión.");
                        });
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener("click", function () {
                    if (!window.mtFirebase || !window.mtFirebase.logout) return;
                    window.mtFirebase.logout();
                });
            }
        }

        function setupAuthUiWhenReady() {
            if (window.mtFirebase && window.mtFirebase.onAuthStateChanged) {
                setupAuthUi();
                return;
            }

            setAuthStatus("Cargando Firebase...");

            var p = window.mtFirebaseReady && window.mtFirebaseReady.then ? window.mtFirebaseReady : null;
            if (p) {
                p.then(function () {
                    setupAuthUi();
                }).catch(function () {
                    setAuthStatus("Firebase no está disponible.");
                });
                return;
            }

            var tries = 0;
            var timer = window.setInterval(function () {
                tries++;
                if (window.mtFirebase && window.mtFirebase.onAuthStateChanged) {
                    window.clearInterval(timer);
                    setupAuthUi();
                    return;
                }
                if (tries > 40) {
                    window.clearInterval(timer);
                    setAuthStatus("Firebase no está disponible.");
                }
            }, 250);
        }

        var dayBtn = qs("mrRangeDay");
        var weekBtn = qs("mrRangeWeek");
        var monthBtn = qs("mrRangeMonth");
        var monthSel = qs("mrMonth");

        if (dayBtn)
            dayBtn.addEventListener("click", function () {
                state.range = "day";
                refresh();
                if (mode === "firestore") loadFirestoreForCurrentRange();
            });
        if (weekBtn)
            weekBtn.addEventListener("click", function () {
                state.range = "week";
                refresh();
                if (mode === "firestore") loadFirestoreForCurrentRange();
            });
        if (monthBtn)
            monthBtn.addEventListener("click", function () {
                state.range = "month";
                refresh();
                if (mode === "firestore") loadFirestoreForCurrentRange();
            });
        if (monthSel)
            monthSel.addEventListener("change", function () {
                state.monthKey = monthSel.value;
                state.range = "month";
                refresh();
                if (mode === "firestore") loadFirestoreForCurrentRange();
            });

        refresh();
        setupAuthUiWhenReady();
    }

    bind();
})();
