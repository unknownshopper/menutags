 (function () {
    function qs(id) {
        return document.getElementById(id);
    }

    function getQueryParam(name) {
        try {
            return new URLSearchParams(window.location.search || "").get(name);
        } catch (e) {
            return null;
        }
    }

    function money(n) {
        return "$" + String(n);
    }

    var WA_PHONE = "5219933026066";
    var HEADER = "*Mingo Tortas Ahogadas — Pedido*";

    var PRICES_TORTA = {
        "Mini": { "Panela": 59, "Carnitas": 69, "Camarón": 99 },
        "Clásica": { "Panela": 89, "Carnitas": 99, "Camarón": 129 },
        "Especial": { "Panela": 159, "Carnitas": 179, "Camarón": 219 },
    };

    var PRICES_TACO_DORADO = {
        "Natural": 29,
        "Panela": 45,
        "Carnitas": 49,
        "Camarón": 59,
    };

    var PRICES_TACO_SUAVE = {
        "1": { "Panela": 28, "Carnitas": 30, "Camarón": 40 },
        "3": { "Panela": 80, "Carnitas": 85, "Camarón": 115 },
        "mix": 90,
    };

    var PRICES_TACO_QUEBRADO = {
        "Panela": 55,
        "Carnitas": 55,
        "Camarón": 65,
    };

    var PRICES_BEBIDA = {
        "Coca/Fanta/Peñafiel (355ml)": 35,
        "Horchata de fresa (500ml)": 35,
        "Jamaica (500ml)": 35,
        "Café (230ml)": 35,
        "Coca Cola 1.25L": 65,
        "Lechuguilla (355ml)": 49,
    };

    var PRICES_EXTRA = {
    };

    var PRICES_POSTRE = {
        "Carlota (7oz)": 40,
    };

    var PRICES_COMBO = {
        "Jalisco": 129,
        "Tapatío": 149,
        "Mingo": 179,
    };

    var loader = qs("mtLoader");
    var listTortas = qs("mtListTortas");
    var listTacos = qs("mtListTacos");
    var listBebidas = qs("mtListBebidas");
    var listSuaves = qs("mtListSuaves");
    var listCombos = qs("mtListCombos");
    var listExtras = qs("mtListExtras");

    var cartList = qs("mtCartList");
    var totalEl = qs("mtTotal");
    var waBtn = qs("mtWhatsApp");
    var clearBtn = qs("mtClear");

    if (!listTortas || !listTacos || !listBebidas || !listSuaves || !listCombos || !listExtras || !cartList || !totalEl || !waBtn || !clearBtn) {
        return;
    }

    var ORDER_DONE_KEY = "mtOrderDone:" + String(window.location.pathname || "");
    var SALES_KEY = "mt:sales:mingo";
    var orderLocked = false;

    function safeJsonParse(str, fallback) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback;
        }
    }

    function getSales() {
        try {
            return safeJsonParse(window.localStorage.getItem(SALES_KEY), []) || [];
        } catch (e) {
            return [];
        }
    }

    function setSales(sales) {
        try {
            window.localStorage.setItem(SALES_KEY, JSON.stringify(sales || []));
        } catch (e) {}
    }

    function recordSale() {
        var total = getCartTotal();
        var t = window.mtFirebase && window.mtFirebase.getQueryParam ? window.mtFirebase.getQueryParam("t") : null;
        if (!t) t = getQueryParam("t");
        var tableId = t ? String(t) : null;
        var sale = {
            id: "sale_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e6)),
            createdAt: Date.now(),
            total: total,
            tableId: tableId,
            items: cart.map(function (it) {
                return {
                    kind: it.kind,
                    qty: it.qty,
                    size: it.size,
                    protein: it.protein,
                    taco: it.taco,
                    bebida: it.bebida,
                    postre: it.postre,
                    unit: getUnitPrice(it),
                    lineTotal: getLineTotal(it),
                };
            }),
        };

        var sales = getSales();
        sales.push(sale);
        if (sales.length > 2500) {
            sales = sales.slice(sales.length - 2500);
        }
        setSales(sales);
    }

    function setOrderLocked(locked) {
        orderLocked = !!locked;

        var controls = document.querySelectorAll(
            'button[data-action], input[data-field], select[data-field], #mtWhatsApp, #mtClear'
        );

        for (var i = 0; i < controls.length; i++) {
            controls[i].disabled = orderLocked;
        }

        if (orderLocked) {
            var qtyInputs = document.querySelectorAll('[data-field="qty"]');
            for (var q = 0; q < qtyInputs.length; q++) {
                qtyInputs[q].value = "0";
            }
            try {
                window.scrollTo(0, 0);
            } catch (e) {}
            cartList.innerHTML =
                "<li>" +
                "<div><strong>Este pedido ya fue enviado.</strong></div>" +
                "<div class=\"mt-row\" style=\"margin-top:10px;\">" +
                "<button class=\"mt-btn\" type=\"button\" id=\"mtUnlockOrder\">Hacer otro pedido</button>" +
                "</div>" +
                "</li>";
            totalEl.textContent = money(0);
            if (window.mtSetCartCount) window.mtSetCartCount(0);
        }
    }

    function unlockOrder() {
        try {
            window.sessionStorage.removeItem(ORDER_DONE_KEY);
        } catch (e) {}
        setOrderLocked(false);
        cart = [];
        renderCart();
    }

    var cart = [];

    function getQtyFromInput(inputEl) {
        var v = parseInt(String((inputEl && inputEl.value) || "0"), 10);
        if (!isFinite(v) || v < 0) v = 0;
        if (v > 99) v = 99;
        if (inputEl) inputEl.value = String(v);
        return v;
    }

    function getUnitPrice(item) {
        if (item.kind === "torta") {
            var m = PRICES_TORTA[item.size] || null;
            if (!m) return 0;
            return getProteinPrice(m, item.protein, item.protein2);
        }
        if (item.kind === "taco") {
            return getProteinPrice(PRICES_TACO_DORADO, item.protein, item.protein2);
        }
        if (item.kind === "tacoquebrado") {
            return getProteinPrice(PRICES_TACO_QUEBRADO, item.protein, item.protein2);
        }
        if (item.kind === "suave") {
            var pack = String(item.pack || "");
            var pp = PRICES_TACO_SUAVE[pack] || null;
            if (!pp || typeof pp !== "object") return 0;
            return getProteinPrice(pp, item.protein, item.protein2);
        }
        if (item.kind === "suavemix") {
            return PRICES_TACO_SUAVE["mix"] || 0;
        }
        if (item.kind === "combo") {
            return PRICES_COMBO[item.combo] || 0;
        }
        if (item.kind === "bebida") {
            return PRICES_BEBIDA[item.bebida] || 0;
        }
        if (item.kind === "extra") {
            return PRICES_EXTRA[item.extra] || 0;
        }
        if (item.kind === "postre") {
            return PRICES_POSTRE[item.postre] || 0;
        }
        return 0;
    }

    function getProteinPrice(priceMap, protein1, protein2) {
        var p1 = normalizeProtein(protein1);
        var p2 = normalizeProtein(protein2);

        var n1 = priceForNormalizedProtein(priceMap, p1);
        if (!p2) return n1;

        var n2 = priceForNormalizedProtein(priceMap, p2);
        return Math.max(n1, n2);
    }

    function normalizeProtein(p) {
        var s = String(p || "").trim();
        if (!s) return "";
        var lower = s.toLowerCase();
        if (lower === "maciza") return "Carnitas";
        if (lower === "cuerito") return "Carnitas";
        if (lower === "surtida") return "Carnitas";
        if (lower === "buche") return "Carnitas";
        if (lower === "chicharrón" || lower === "chicharron") return "Carnitas";
        if (lower === "panela") return "Panela";
        if (lower === "camarón" || lower === "camaron") return "Camarón";
        if (lower === "natural") return "Natural";
        return s;
    }

    function priceForNormalizedProtein(priceMap, normalizedProtein) {
        if (!priceMap) return 0;
        var v = priceMap[normalizedProtein];
        return Number(v) || 0;
    }

    function getLineTotal(item) {
        return getUnitPrice(item) * item.qty;
    }

    function setRowPriceText(li, value) {
        if (!li) return;
        var el = li.querySelector('[data-field="price"]');
        if (!el) return;
        var n = parseInt(String(value || 0), 10);
        if (!isFinite(n) || n < 0) n = 0;
        el.textContent = "(" + money(n) + ")";
    }

    function refreshRowPrice(li) {
        if (!li) return;
        var item = buildItemFromRow(li);
        if (!item) return;
        var unit = getUnitPrice(item);
        setRowPriceText(li, unit);
    }

    function getCartTotal() {
        return cart.reduce(function (sum, it) {
            return sum + getLineTotal(it);
        }, 0);
    }

    function getCartCount() {
        return cart.reduce(function (sum, it) {
            return sum + (it.qty || 0);
        }, 0);
    }

    function renderCart() {
        if (!cart.length) {
            cartList.innerHTML = "<li>Tu pedido está vacío.</li>";
            totalEl.textContent = money(0);
            if (window.mtSetCartCount) window.mtSetCartCount(0);
            return;
        }

        cartList.innerHTML = cart.map(function (it, idx) {
            var title =
                it.kind === "torta" ? "Torta" :
                it.kind === "taco" ? "Taco dorado" :
                it.kind === "tacoquebrado" ? "Taco quebrado" :
                it.kind === "suave" ? "Taco suave" :
                it.kind === "suavemix" ? "Suaves mix" :
                it.kind === "combo" ? "Combo" :
                it.kind === "bebida" ? "Bebida" :
                it.kind === "extra" ? "Extra" :
                "Postre";
            var details = [];
            if (it.kind === "torta") details.push(it.size);
            if (it.kind === "taco") details.push(it.taco);
            if (it.kind === "tacoquebrado") details.push("Quebrado");
            if (it.kind === "suave") details.push((it.pack || "") + " pza");
            if (it.kind === "suavemix") details.push("mix");
            if (it.kind === "combo") {
                details.push(it.combo);
                if (it.comboMode) {
                    details.push(it.comboMode === "dorados" ? "2 tacos dorados" : "1 clásica");
                }
                if (it.comboProtein) {
                    details.push(it.comboProtein);
                }
                if (it.comboBebida) {
                    details.push(it.comboBebida);
                }
                if (it.comboLechuguilla) {
                    details.push(it.comboLechuguilla);
                }
                if (it.comboMode === "dorados") {
                    if (it.comboT1Kind) {
                        details.push("T1 " + String(it.comboT1Kind) + (it.comboT1Protein ? " " + String(it.comboT1Protein) : ""));
                    }
                    if (it.comboT2Kind) {
                        details.push("T2 " + String(it.comboT2Kind) + (it.comboT2Protein ? " " + String(it.comboT2Protein) : ""));
                    }
                }
            }
            if (it.kind === "bebida") details.push(it.bebida);
            if (it.kind === "extra") details.push(it.extra);
            if (it.kind === "postre") details.push(it.postre);
            if (it.kind === "torta" || it.kind === "taco" || it.kind === "tacoquebrado" || it.kind === "suave") {
                if (it.protein2) {
                    details.push(String(it.protein || "") + " / " + String(it.protein2 || ""));
                } else {
                    details.push(it.protein);
                }
            }

            var unit = getUnitPrice(it);
            var line = getLineTotal(it);

            return (
                "<li>" +
                "<div><strong>" + it.qty + "x " + title + "</strong> <span>(" + details.join(", ") + ")</span></div>" +
                "<div>" + money(unit) + " c/u · <strong>" + money(line) + "</strong></div>" +
                "<div class=\"mt-row\"><button class=\"mt-pill\" type=\"button\" data-remove=\"" + idx + "\">Eliminar</button></div>" +
                "</li>"
            );
        }).join("");

        totalEl.textContent = money(getCartTotal());
        if (window.mtSetCartCount) window.mtSetCartCount(getCartCount());
    }

    function buildKeyFromItem(it) {
        if (!it) return "";
        if (it.kind === "torta") return ["torta", it.size || "", it.protein || "", it.protein2 || ""].join("|");
        if (it.kind === "taco") return ["taco", it.taco || "", it.protein || "", it.protein2 || ""].join("|");
        if (it.kind === "tacoquebrado") return ["tacoquebrado", it.protein || "", it.protein2 || ""].join("|");
        if (it.kind === "suave") return ["suave", String(it.pack || ""), it.protein || "", it.protein2 || ""].join("|");
        if (it.kind === "suavemix") return ["suavemix"].join("|");
        if (it.kind === "combo") {
            return [
                "combo",
                it.combo || "",
                it.comboMode || "",
                it.comboProtein || "",
                it.comboBebida || "",
                it.comboT1Kind || "",
                it.comboT1Protein || "",
                it.comboT2Kind || "",
                it.comboT2Protein || "",
            ].join("|");
        }
        if (it.kind === "bebida") return ["bebida", it.bebida || ""].join("|");
        if (it.kind === "extra") return ["extra", it.extra || ""].join("|");
        if (it.kind === "postre") return ["postre", it.postre || ""].join("|");
        return String(it.kind || "");
    }

    function findCartIndexByKey(key) {
        if (!key) return -1;
        for (var i = 0; i < cart.length; i++) {
            if (buildKeyFromItem(cart[i]) === key) return i;
        }
        return -1;
    }

    function getCartQtyByKey(key) {
        var idx = findCartIndexByKey(key);
        if (idx < 0) return 0;
        return Number(cart[idx].qty) || 0;
    }

    function buildKeyFromRowConfig(li) {
        if (!li) return "";
        var item = buildItemFromRow(li);
        if (!item) return "";
        item.qty = 1;
        return buildKeyFromItem(item);
    }

    function updateRowQtyFromCart(li) {
        if (!li) return;
        var input = li.querySelector('[data-field="qty"]');
        if (!input) return;
        var key = buildKeyFromRowConfig(li);
        if (!key) return;
        input.value = String(getCartQtyByKey(key));
    }

    function buildItemFromRow(li) {
        if (!li) return null;
        var rowKind = li.getAttribute("data-kind") || "";
        var qtyEl = li.querySelector('[data-field="qty"]');
        var qty = getQtyFromInput(qtyEl);

        function readProtein1() {
            return (li.querySelector('[data-field="protein"]') || {}).value || "";
        }

        function readProtein2IfHalf() {
            var half = li.querySelector('[data-field="half"]');
            var on = !!(half && half.checked);
            if (!on) return "";
            return (li.querySelector('[data-field="protein2"]') || {}).value || "";
        }

        if (rowKind === "torta") {
            return {
                kind: "torta",
                qty: qty,
                size: li.getAttribute("data-size") || "",
                protein: readProtein1(),
                protein2: readProtein2IfHalf(),
            };
        }

        if (rowKind === "taco") {
            return {
                kind: "taco",
                qty: qty,
                taco: li.getAttribute("data-taco") || "",
                protein: readProtein1(),
                protein2: readProtein2IfHalf(),
            };
        }

        if (rowKind === "tacoquebrado") {
            return {
                kind: "tacoquebrado",
                qty: qty,
                taco: li.getAttribute("data-taco") || "Quebrado",
                protein: readProtein1(),
                protein2: readProtein2IfHalf(),
            };
        }

        if (rowKind === "suave") {
            return {
                kind: "suave",
                qty: qty,
                pack: li.getAttribute("data-pack") || "",
                protein: readProtein1(),
                protein2: readProtein2IfHalf(),
            };
        }

        if (rowKind === "suavemix") {
            return {
                kind: "suavemix",
                qty: qty,
            };
        }

        if (rowKind === "combo") {
            var comboName = li.getAttribute("data-combo") || "";
            var modeEl = li.querySelector('select[data-field="comboMode"]');
            var proteinEl = li.querySelector('select[data-field="comboProtein"]');
            var bebidaEl = li.querySelector('select[data-field="comboBebida"]');

            var t1KindEl = li.querySelector('select[data-field="comboT1Kind"]');
            var t1ProteinEl = li.querySelector('select[data-field="comboT1Protein"]');
            var t2KindEl = li.querySelector('select[data-field="comboT2Kind"]');
            var t2ProteinEl = li.querySelector('select[data-field="comboT2Protein"]');

            return {
                kind: "combo",
                qty: qty,
                combo: comboName,
                comboMode: modeEl ? String(modeEl.value || "") : "",
                comboProtein: proteinEl ? String(proteinEl.value || "") : "",
                comboBebida: bebidaEl ? String(bebidaEl.value || "") : "",
                comboLechuguilla: comboName === "Jalisco" ? "Lechuguilla (355ml)" : "",
                comboT1Kind: t1KindEl ? String(t1KindEl.value || "") : "",
                comboT1Protein: t1ProteinEl ? String(t1ProteinEl.value || "") : "",
                comboT2Kind: t2KindEl ? String(t2KindEl.value || "") : "",
                comboT2Protein: t2ProteinEl ? String(t2ProteinEl.value || "") : "",
            };
        }

        if (rowKind === "bebida") {
            return {
                kind: "bebida",
                qty: qty,
                bebida: li.getAttribute("data-bebida") || "",
            };
        }

        if (rowKind === "extra") {
            return {
                kind: "extra",
                qty: qty,
                extra: li.getAttribute("data-extra") || "",
            };
        }

        if (rowKind === "postre") {
            return {
                kind: "postre",
                qty: qty,
                postre: li.getAttribute("data-postre") || "",
            };
        }

        return null;
    }

    function syncRowToCart(li) {
        if (orderLocked) return;
        var item = buildItemFromRow(li);
        if (!item) return;

        var key = buildKeyFromItem(item);
        if (!key) return;

        var idx = -1;
        for (var i = 0; i < cart.length; i++) {
            if (buildKeyFromItem(cart[i]) === key) {
                idx = i;
                break;
            }
        }

        if ((item.qty || 0) <= 0) {
            if (idx >= 0) cart.splice(idx, 1);
            renderCart();
            return;
        }

        if (idx >= 0) {
            cart[idx] = item;
        } else {
            cart.push(item);
        }

        renderCart();
    }

    function buildTicketText() {
        var t = getQueryParam("t");
        var lines = [HEADER];
        if (t) {
            lines.push("*MESA: " + String(t) + "*");
        }
        lines.push("");
        lines.push("Detalle:");

        cart.forEach(function (it, i) {
            var title =
                it.kind === "torta" ? "Torta" :
                it.kind === "taco" ? "Taco dorado" :
                it.kind === "tacoquebrado" ? "Taco quebrado" :
                it.kind === "suave" ? "Taco suave" :
                it.kind === "suavemix" ? "Suaves mix" :
                it.kind === "combo" ? "Combo" :
                it.kind === "bebida" ? "Bebida" :
                it.kind === "extra" ? "Extra" :
                "Postre";
            var details = [];
            if (it.kind === "torta") details.push(it.size);
            if (it.kind === "taco") details.push(it.taco);
            if (it.kind === "tacoquebrado") details.push("Quebrado");
            if (it.kind === "suave") details.push((it.pack || "") + " pza");
            if (it.kind === "suavemix") details.push("mix");
            if (it.kind === "combo") details.push(it.combo);
            if (it.kind === "bebida") details.push(it.bebida);
            if (it.kind === "extra") details.push(it.extra);
            if (it.kind === "postre") details.push(it.postre);
            if (it.kind === "combo") {
                if (it.comboMode) details.push(it.comboMode === "dorados" ? "2 tacos dorados" : "1 clásica");
                if (it.comboProtein) details.push(it.comboProtein);
                if (it.comboBebida) details.push(it.comboBebida);
                if (it.comboLechuguilla) details.push(it.comboLechuguilla);
                if (it.comboMode === "dorados") {
                    if (it.comboT1Kind) details.push("T1 " + String(it.comboT1Kind) + (it.comboT1Protein ? " " + String(it.comboT1Protein) : ""));
                    if (it.comboT2Kind) details.push("T2 " + String(it.comboT2Kind) + (it.comboT2Protein ? " " + String(it.comboT2Protein) : ""));
                }
            }

            if (it.kind === "torta" || it.kind === "taco" || it.kind === "tacoquebrado" || it.kind === "suave") {
                if (it.protein2) {
                    details.push(String(it.protein || "") + " / " + String(it.protein2 || ""));
                } else {
                    details.push(it.protein);
                }
            }

            var unit = getUnitPrice(it);
            var lineTotal = getLineTotal(it);

            var meta = details.length ? (" (" + details.join(", ") + ")") : "";
            lines.push((i + 1) + ") " + it.qty + "x " + title + meta);
            lines.push("    " + money(unit) + " c/u = " + money(lineTotal));
        });

        lines.push("");
        lines.push("TOTAL: " + money(getCartTotal()));
        return lines.join("\n");
    }

    function safeParseInt(value) {
        var n = parseInt(String(value || ""), 10);
        if (!isFinite(n)) return null;
        return n;
    }

    function makeFirestoreOrderRecord() {
        var t = window.mtFirebase && window.mtFirebase.getQueryParam ? window.mtFirebase.getQueryParam("t") : null;
        var k = window.mtFirebase && window.mtFirebase.getQueryParam ? window.mtFirebase.getQueryParam("k") : null;
        var tableId = t ? String(t) : null;
        var tableToken = k ? String(k) : null;

        var items = cart.map(function (it) {
            var title =
                it.kind === "torta" ? "Torta" :
                it.kind === "taco" ? "Taco dorado" :
                it.kind === "tacoquebrado" ? "Taco quebrado" :
                it.kind === "suave" ? "Taco suave" :
                it.kind === "suavemix" ? "Suaves mix" :
                it.kind === "combo" ? "Combo" :
                it.kind === "bebida" ? "Bebida" :
                it.kind === "extra" ? "Extra" :
                "Postre";

            var meta = {
                kind: it.kind || "",
            };
            if (it.kind === "torta") meta.size = it.size || "";
            if (it.kind === "taco") meta.taco = it.taco || "";
            if (it.kind === "tacoquebrado") meta.taco = "Quebrado";
            if (it.kind === "suave") meta.pack = it.pack || "";
            if (it.kind === "suavemix") meta.pack = "mix";
            if (it.kind === "combo") {
                meta.combo = it.combo || "";
                if (it.comboMode) meta.comboMode = it.comboMode || "";
                if (it.comboProtein) meta.comboProtein = it.comboProtein || "";
                if (it.comboBebida) meta.comboBebida = it.comboBebida || "";
                if (it.comboLechuguilla) meta.comboLechuguilla = it.comboLechuguilla || "";
                if (it.comboT1Kind) meta.comboT1Kind = it.comboT1Kind || "";
                if (it.comboT1Protein) meta.comboT1Protein = it.comboT1Protein || "";
                if (it.comboT2Kind) meta.comboT2Kind = it.comboT2Kind || "";
                if (it.comboT2Protein) meta.comboT2Protein = it.comboT2Protein || "";
            }
            if (it.kind === "bebida") meta.bebida = it.bebida || "";
            if (it.kind === "extra") meta.extra = it.extra || "";
            if (it.kind === "postre") meta.postre = it.postre || "";
            if (it.kind === "torta" || it.kind === "taco" || it.kind === "tacoquebrado" || it.kind === "suave") {
                meta.protein = it.protein || "";
                if (it.protein2) meta.protein2 = it.protein2 || "";
            }

            var qty = safeParseInt(it.qty) || 0;
            var unit = getUnitPrice(it);
            var lineTotal = getLineTotal(it);

            return {
                title: title,
                qty: qty,
                unit: unit,
                lineTotal: lineTotal,
                meta: meta,
            };
        });

        var total = getCartTotal();

        return {
            source: "customer",
            status: "sent",
            tableId: tableId,
            tableToken: tableToken,
            currency: "MXN",
            total: total,
            items: items,
        };
    }

    function persistOrderToFirestoreBestEffort() {
        if (!window.mtFirebase || !window.mtFirebase.createOrder || !window.mtFirebase.ensureAnon) return;
        var record = makeFirestoreOrderRecord();
        window.mtFirebase.ensureAnon()
            .then(function () {
                return window.mtFirebase.createOrder("mingo", record);
            })
            .catch(function () {
                // best-effort: never block WhatsApp
            });
    }

    function sendWhatsApp() {
        if (orderLocked) return;
        if (!cart.length) {
            return;
        }

        try {
            window.sessionStorage.setItem(ORDER_DONE_KEY, "1");
        } catch (e) {}

        persistOrderToFirestoreBestEffort();
        recordSale();
        setOrderLocked(true);

        try {
            window.scrollTo(0, 0);
        } catch (e) {}

        var text = buildTicketText();
        var url = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(text);
        window.location.href = url;
    }

    function clearCart() {
        if (orderLocked) return;
        cart = [];
        renderCart();
    }

    waBtn.addEventListener("click", sendWhatsApp);
    clearBtn.addEventListener("click", clearCart);

    function bindList(listEl) {
        listEl.addEventListener("click", function (e) {
            var plusBtn = e.target.closest('button[data-action="plus"]');
            if (plusBtn) {
                var li = plusBtn.closest("li");
                if (!li || orderLocked) return;

                var keyPlus = buildKeyFromRowConfig(li);
                if (!keyPlus) return;

                var idxPlus = findCartIndexByKey(keyPlus);
                if (idxPlus >= 0) {
                    cart[idxPlus].qty = Math.min(99, (Number(cart[idxPlus].qty) || 0) + 1);
                } else {
                    var itemPlus = buildItemFromRow(li);
                    if (!itemPlus) return;
                    itemPlus.qty = 1;
                    cart.push(itemPlus);
                }

                updateRowQtyFromCart(li);
                refreshRowPrice(li);
                renderCart();
                return;
            }

            var minusBtn = e.target.closest('button[data-action="minus"]');
            if (minusBtn) {
                var liMinus = minusBtn.closest("li");
                if (!liMinus || orderLocked) return;

                var keyMinus = buildKeyFromRowConfig(liMinus);
                if (!keyMinus) return;

                var idxMinus = findCartIndexByKey(keyMinus);
                if (idxMinus >= 0) {
                    var nextQty = Math.max(0, (Number(cart[idxMinus].qty) || 0) - 1);
                    if (nextQty <= 0) {
                        cart.splice(idxMinus, 1);
                    } else {
                        cart[idxMinus].qty = nextQty;
                    }
                }

                updateRowQtyFromCart(liMinus);
                refreshRowPrice(liMinus);
                renderCart();
                return;
            }
        });

        listEl.addEventListener("input", function (e) {
            var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
            if (!input) return;
            var li = input.closest("li");
            if (!li || orderLocked) return;

            var desiredQty = getQtyFromInput(input);
            var key = buildKeyFromRowConfig(li);
            if (!key) return;

            var idx = findCartIndexByKey(key);
            if (desiredQty <= 0) {
                if (idx >= 0) cart.splice(idx, 1);
            } else {
                if (idx >= 0) {
                    cart[idx].qty = desiredQty;
                } else {
                    var item = buildItemFromRow(li);
                    if (!item) return;
                    item.qty = desiredQty;
                    cart.push(item);
                }
            }

            updateRowQtyFromCart(li);
            refreshRowPrice(li);
            renderCart();
        }, true);

        listEl.addEventListener("blur", function (e) {
            var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
            if (!input) return;
            getQtyFromInput(input);
            var li = input.closest("li");
            if (!li) return;
            updateRowQtyFromCart(li);
            refreshRowPrice(li);
        }, true);

        listEl.addEventListener("change", function (e) {
            var target = e && e.target ? e.target : null;
            if (!target || !target.matches) return;

            var sel = target.matches('select[data-field="protein"], select[data-field="protein2"]') ? target : null;
            var half = target.matches('input[data-field="half"]') ? target : null;
            var comboField = target.matches('select[data-field^="combo"]') ? target : null;

            if (!sel && !half && !comboField) return;

            var li = target.closest("li");
            if (!li) return;

            if (half) {
                var checked = !!half.checked;
                var p1 = (li.querySelector('select[data-field="protein"]') || {}).value || "";
                if (String(p1 || "") === "Natural") {
                    half.checked = false;
                    checked = false;
                }
                var p2Sel = li.querySelector('select[data-field="protein2"]');
                if (p2Sel) p2Sel.style.display = checked ? "block" : "none";
            }

            if (sel) {
                var p1b = (li.querySelector('select[data-field="protein"]') || {}).value || "";
                if (String(p1b || "") === "Natural") {
                    var halfEl = li.querySelector('input[data-field="half"]');
                    if (halfEl) halfEl.checked = false;
                    var p2Sel2 = li.querySelector('select[data-field="protein2"]');
                    if (p2Sel2) p2Sel2.style.display = "none";
                }
            }

            if (comboField) {
                var modeEl = li.querySelector('select[data-field="comboMode"]');
                var mode = modeEl ? String(modeEl.value || "") : "";
                var doradosWrap = li.querySelector('[data-field="comboDorados"]');
                if (doradosWrap) doradosWrap.style.display = mode === "dorados" ? "grid" : "none";

                var proteinWrap = li.querySelector('[data-field="comboProteinWrap"]');
                if (proteinWrap) proteinWrap.style.display = mode === "dorados" ? "none" : "";

                function syncTacoProteinDisabled(kindField, proteinField) {
                    var kindEl = li.querySelector('select[data-field="' + kindField + '"]');
                    var proteinEl = li.querySelector('select[data-field="' + proteinField + '"]');
                    if (!kindEl || !proteinEl) return;
                    var k = String(kindEl.value || "");
                    var disable = k === "Natural";
                    proteinEl.disabled = disable;
                    if (disable) proteinEl.value = "Maciza";
                }

                syncTacoProteinDisabled("comboT1Kind", "comboT1Protein");
                syncTacoProteinDisabled("comboT2Kind", "comboT2Protein");
            }

            updateRowQtyFromCart(li);
            refreshRowPrice(li);
        }, true);
    }

    bindList(listTortas);
    bindList(listTacos);
    bindList(listBebidas);
    bindList(listSuaves);
    bindList(listCombos);
    bindList(listExtras);

    function initDisplayedPrices() {
        var rows = document.querySelectorAll('li[data-kind]');
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].getAttribute('data-kind') === 'combo') {
                var modeEl = rows[i].querySelector('select[data-field="comboMode"]');
                var mode = modeEl ? String(modeEl.value || "") : "";
                var doradosWrap = rows[i].querySelector('[data-field="comboDorados"]');
                if (doradosWrap) doradosWrap.style.display = mode === 'dorados' ? 'grid' : 'none';

                var proteinWrap = rows[i].querySelector('[data-field="comboProteinWrap"]');
                if (proteinWrap) proteinWrap.style.display = mode === 'dorados' ? 'none' : '';

                function syncTacoProteinDisabled(kindField, proteinField) {
                    var kindEl = rows[i].querySelector('select[data-field="' + kindField + '"]');
                    var proteinEl = rows[i].querySelector('select[data-field="' + proteinField + '"]');
                    if (!kindEl || !proteinEl) return;
                    var k = String(kindEl.value || "");
                    var disable = k === 'Natural';
                    proteinEl.disabled = disable;
                    if (disable) proteinEl.value = 'Maciza';
                }

                syncTacoProteinDisabled('comboT1Kind', 'comboT1Protein');
                syncTacoProteinDisabled('comboT2Kind', 'comboT2Protein');
            }
            updateRowQtyFromCart(rows[i]);
            refreshRowPrice(rows[i]);
        }
    }

    initDisplayedPrices();

    cartList.addEventListener("click", function (e) {
        if (orderLocked) return;
        var btn = e.target.closest("button[data-remove]");
        if (!btn) return;
        var idx = parseInt(btn.getAttribute("data-remove"), 10);
        if (!isFinite(idx) || idx < 0 || idx >= cart.length) return;
        cart.splice(idx, 1);
        renderCart();
    });

    try {
        setOrderLocked(window.sessionStorage.getItem(ORDER_DONE_KEY) === "1");
    } catch (e) {}

    if (!orderLocked) {
        renderCart();
    } else {
        var unlockBtn = document.getElementById("mtUnlockOrder");
        if (unlockBtn) {
            unlockBtn.addEventListener("click", function () {
                unlockOrder();
            });
        }
    }

    if (loader) {
        window.setTimeout(function () {
            loader.classList.add("is-hiding");
            window.setTimeout(function () {
                loader.classList.add("mt-hidden");
            }, 260);
        }, 2000);
    }
})();
