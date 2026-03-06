 (function () {
    function qs(id) {
        return document.getElementById(id);
    }

    function money(n) {
        return "$" + String(n);
    }

    var WA_PHONE = "5219933026066";
    var HEADER = "MINGO TORTAS AHOGADAS resumen de pedido";

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
    };

    var PRICES_EXTRA = {
        "Lechuguilla (355ml)": 49,
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
        var sale = {
            id: "sale_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e6)),
            createdAt: Date.now(),
            total: total,
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
            cartList.innerHTML = "<li>Este pedido ya fue enviado. Para hacer otro, vuelve a acercar el NFC.</li>";
            totalEl.textContent = money(0);
            if (window.mtSetCartCount) window.mtSetCartCount(0);
        }
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
            return m[item.protein] || 0;
        }
        if (item.kind === "taco") {
            return PRICES_TACO_DORADO[item.protein] || 0;
        }
        if (item.kind === "tacoquebrado") {
            return PRICES_TACO_QUEBRADO[item.protein] || 0;
        }
        if (item.kind === "suave") {
            var pack = String(item.pack || "");
            var pp = PRICES_TACO_SUAVE[pack] || null;
            if (!pp || typeof pp !== "object") return 0;
            return pp[item.protein] || 0;
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
            if (it.kind === "combo") details.push(it.combo);
            if (it.kind === "bebida") details.push(it.bebida);
            if (it.kind === "extra") details.push(it.extra);
            if (it.kind === "postre") details.push(it.postre);
            if (it.kind === "torta" || it.kind === "taco" || it.kind === "tacoquebrado" || it.kind === "suave") details.push(it.protein);

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
        if (it.kind === "torta") return ["torta", it.size || "", it.protein || ""].join("|");
        if (it.kind === "taco") return ["taco", it.taco || "", it.protein || ""].join("|");
        if (it.kind === "tacoquebrado") return ["tacoquebrado", it.protein || ""].join("|");
        if (it.kind === "suave") return ["suave", String(it.pack || ""), it.protein || ""].join("|");
        if (it.kind === "suavemix") return ["suavemix"].join("|");
        if (it.kind === "combo") return ["combo", it.combo || ""].join("|");
        if (it.kind === "bebida") return ["bebida", it.bebida || ""].join("|");
        if (it.kind === "extra") return ["extra", it.extra || ""].join("|");
        if (it.kind === "postre") return ["postre", it.postre || ""].join("|");
        return String(it.kind || "");
    }

    function buildItemFromRow(li) {
        if (!li) return null;
        var rowKind = li.getAttribute("data-kind") || "";
        var qtyEl = li.querySelector('[data-field="qty"]');
        var qty = getQtyFromInput(qtyEl);

        if (rowKind === "torta") {
            return {
                kind: "torta",
                qty: qty,
                size: li.getAttribute("data-size") || "",
                protein: (li.querySelector('[data-field="protein"]') || {}).value || "",
            };
        }

        if (rowKind === "taco") {
            return {
                kind: "taco",
                qty: qty,
                taco: li.getAttribute("data-taco") || "",
                protein: (li.querySelector('[data-field="protein"]') || {}).value || "",
            };
        }

        if (rowKind === "tacoquebrado") {
            return {
                kind: "tacoquebrado",
                qty: qty,
                taco: li.getAttribute("data-taco") || "Quebrado",
                protein: (li.querySelector('[data-field="protein"]') || {}).value || "",
            };
        }

        if (rowKind === "suave") {
            return {
                kind: "suave",
                qty: qty,
                pack: li.getAttribute("data-pack") || "",
                protein: (li.querySelector('[data-field="protein"]') || {}).value || "",
            };
        }

        if (rowKind === "suavemix") {
            return {
                kind: "suavemix",
                qty: qty,
            };
        }

        if (rowKind === "combo") {
            return {
                kind: "combo",
                qty: qty,
                combo: li.getAttribute("data-combo") || "",
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
        var lines = [HEADER, ""];

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
            if (it.kind === "torta" || it.kind === "taco" || it.kind === "tacoquebrado" || it.kind === "suave") details.push(it.protein);

            var unit = getUnitPrice(it);
            var lineTotal = getLineTotal(it);

            lines.push(
                (i + 1) + ". " + it.qty + "x " + title + " (" + details.join(", ") + ") - " + money(unit) + " c/u = " + money(lineTotal)
            );
        });

        lines.push("");
        lines.push("TOTAL: " + money(getCartTotal()));
        return lines.join("\n");
    }

    function sendWhatsApp() {
        if (orderLocked) return;
        if (!cart.length) {
            return;
        }

        try {
            window.sessionStorage.setItem(ORDER_DONE_KEY, "1");
        } catch (e) {}

        recordSale();
        setOrderLocked(true);

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
                var input = li && li.querySelector('[data-field="qty"]');
                if (!input) return;
                input.value = String(Math.min(99, getQtyFromInput(input) + 1));
                refreshRowPrice(li);
                syncRowToCart(li);
                return;
            }

            var minusBtn = e.target.closest('button[data-action="minus"]');
            if (minusBtn) {
                var liMinus = minusBtn.closest("li");
                var inputMinus = liMinus && liMinus.querySelector('[data-field="qty"]');
                if (!inputMinus) return;
                inputMinus.value = String(Math.max(0, getQtyFromInput(inputMinus) - 1));
                refreshRowPrice(liMinus);
                syncRowToCart(liMinus);
                return;
            }
        });

        listEl.addEventListener("input", function (e) {
            var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
            if (!input) return;
            getQtyFromInput(input);
            syncRowToCart(input.closest("li"));
        }, true);

        listEl.addEventListener("blur", function (e) {
            var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
            if (!input) return;
            getQtyFromInput(input);
            syncRowToCart(input.closest("li"));
        }, true);

        listEl.addEventListener("change", function (e) {
            var sel = e.target && e.target.matches && e.target.matches('select[data-field="protein"]') ? e.target : null;
            if (!sel) return;
            refreshRowPrice(sel.closest("li"));
            syncRowToCart(sel.closest("li"));
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
