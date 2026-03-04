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
        "Mini": 65,
        "Clásica": 85,
        "Jumbo": 105,
    };
    var PRICE_TACO = 65;
    var PRICE_BEBIDA = 35;
    var PRICE_POSTRE = 55;

    var PROTEINS_TORTA = ["Maciza", "Cuerito con maciza", "Camarón con panela"];
    var PROTEINS_TACO = ["Maciza", "Cuerito con maciza"];

    var loader = qs("mtLoader");
    var listTortas = qs("mtListTortas");
    var listTacos = qs("mtListTacos");
    var listBebidas = qs("mtListBebidas");
    var listPostres = qs("mtListPostres");

    var cartList = qs("mtCartList");
    var totalEl = qs("mtTotal");
    var waBtn = qs("mtWhatsApp");
    var clearBtn = qs("mtClear");

    if (!listTortas || !listTacos || !listBebidas || !listPostres || !cartList || !totalEl || !waBtn || !clearBtn) {
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
            return PRICES_TORTA[item.size] || 0;
        }
        if (item.kind === "taco") {
            return PRICE_TACO;
        }
        if (item.kind === "bebida") {
            return PRICE_BEBIDA;
        }
        if (item.kind === "postre") {
            return PRICE_POSTRE;
        }
        return 0;
    }

    function getLineTotal(item) {
        return getUnitPrice(item) * item.qty;
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
            var title = it.kind === "torta" ? "Torta" : (it.kind === "taco" ? "Taco" : (it.kind === "bebida" ? "Bebida" : "Postre"));
            var details = [];
            if (it.kind === "torta") details.push(it.size);
            if (it.kind === "taco") details.push(it.taco);
            if (it.kind === "bebida") details.push(it.bebida);
            if (it.kind === "postre") details.push(it.postre);
            if (it.kind === "torta" || it.kind === "taco") details.push(it.protein);

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
        if (it.kind === "bebida") return ["bebida", it.bebida || ""].join("|");
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

        if (rowKind === "bebida") {
            return {
                kind: "bebida",
                qty: qty,
                bebida: li.getAttribute("data-bebida") || "",
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
            var title = it.kind === "torta" ? "Torta" : (it.kind === "taco" ? "Taco" : (it.kind === "bebida" ? "Bebida" : "Postre"));
            var details = [];
            if (it.kind === "torta") details.push(it.size);
            if (it.kind === "taco") details.push(it.taco);
            if (it.kind === "bebida") details.push(it.bebida);
            if (it.kind === "postre") details.push(it.postre);
            if (it.kind === "torta" || it.kind === "taco") details.push(it.protein);

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
                syncRowToCart(li);
                return;
            }

            var minusBtn = e.target.closest('button[data-action="minus"]');
            if (minusBtn) {
                var liMinus = minusBtn.closest("li");
                var inputMinus = liMinus && liMinus.querySelector('[data-field="qty"]');
                if (!inputMinus) return;
                inputMinus.value = String(Math.max(0, getQtyFromInput(inputMinus) - 1));
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
            syncRowToCart(sel.closest("li"));
        }, true);
    }

    bindList(listTortas);
    bindList(listTacos);
    bindList(listBebidas);
    bindList(listPostres);

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
