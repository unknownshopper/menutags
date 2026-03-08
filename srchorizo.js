(function () {
    var WA_PHONE = "+529932313162";
    var HEADER = "Pedido Sr Chorizo";

    function getQueryParam(name) {
        try {
            return new URLSearchParams(window.location.search || "").get(name);
        } catch (e) {
            return null;
        }
    }

    var seatId = (getQueryParam("seat") || "").trim();
    if (!seatId) seatId = null;

    var tabId = (getQueryParam("tab") || "").trim();
    if (!tabId) tabId = null;

    function qs(id) {
        return document.getElementById(id);
    }

    function money(n) {
        var v = Math.round((Number(n) || 0) * 100) / 100;
        if (Math.abs(v - Math.round(v)) < 0.00001) {
            return "$" + String(Math.round(v));
        }
        return "$" + v.toFixed(1);
    }

    var listChoripan = qs("szListChoripan");
    var listGringas = qs("szListGringas");
    var listTacos = qs("szListTacos");
    var listParrilladas = qs("szListParrilladas");
    var listBebidas = qs("szListBebidas");
    var listPostres = qs("szListPostres");
    var listExtras = qs("szListExtras");

    var cartList = qs("szCartList");
    var totalEl = qs("szTotal");
    var waBtn = qs("szWhatsApp");
    var clearBtn = qs("szClear");
    var tableSel = qs("szTable");

    if (!listChoripan || !listGringas || !listTacos || !listParrilladas || !listBebidas || !listPostres || !listExtras || !cartList || !totalEl || !waBtn || !clearBtn) {
        return;
    }

    var ORDER_DONE_KEY = "mtOrderDone:" + String(window.location.pathname || "");
    var ORDERS_KEY = "mt:orders:srchorizo:v1";
    var orderLocked = false;

    function safeJsonParse(text, fallback) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return fallback;
        }
    }

    function loadOrders() {
        try {
            var raw = window.localStorage.getItem(ORDERS_KEY);
            var data = safeJsonParse(raw || "[]", []);
            if (!Array.isArray(data)) return [];
            return data;
        } catch (e) {
            return [];
        }
    }

    function saveOrders(orders) {
        try {
            window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders || []));
        } catch (e) {}
    }

    function makeOrderRecord() {
        var now = new Date();
        var total = getCartTotal();
        var items = cart.map(function (it) {
            var title = String(it.title || "");
            var qty = Number(it.qty || 0) || 0;
            var unit = Number(getUnitPrice(it) || 0) || 0;
            var kind = String(it.kind || "");
            var meta = {};
            if (it.kind === "bebida") meta.bebida = String(it.bebida || "");
            return {
                kind: kind,
                title: title,
                qty: qty,
                unit: unit,
                lineTotal: Math.round(qty * unit * 100) / 100,
                meta: meta,
            };
        });

        return {
            id: "sz_" + String(now.getTime()) + "_" + String(Math.floor(Math.random() * 1000000)),
            createdAt: now.toISOString(),
            total: Math.round(total * 100) / 100,
            currency: "MXN",
            source: String(window.location.pathname || ""),
            seatId: seatId,
            tabId: tabId,
            items: items,
        };
    }

    function persistCurrentOrder() {
        var record = makeOrderRecord();
        var orders = loadOrders();
        orders.push(record);
        saveOrders(orders);
    }

    function setOrderLocked(locked) {
        orderLocked = !!locked;

        var controls = document.querySelectorAll(
            'button[data-action], input[data-field], select[data-field], #szWhatsApp, #szClear'
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
            cartList.innerHTML = "<li>Este pedido ya fue enviado. Para hacer otro, vuelve a acercar el NFC.</li>";
            totalEl.textContent = money(0);
            if (window.mtSetCartCount) window.mtSetCartCount(0);
        }
    }

    var cart = [];

    function buildItemFromRow(li) {
        if (!li) return null;
        var kind = li.getAttribute("data-kind") || "";
        var item = li.getAttribute("data-item") || "";

        var qtyEl = li.querySelector('[data-field="qty"]');
        var qty = getQtyFromInput(qtyEl);

        if (qty <= 0) return null;

        if (kind === "item") {
            var unitItem = parseFloat(String(li.getAttribute("data-price") || "0"));
            if (!isFinite(unitItem) || unitItem < 0) unitItem = 0;
            return {
                kind: "item",
                title: item || "Producto",
                qty: qty,
                unit: unitItem,
            };
        }

        if (kind === "bebida") {
            var bebida = li.getAttribute("data-bebida") || "";
            var unitB = parseFloat(String(li.getAttribute("data-price") || "0"));
            if (!isFinite(unitB) || unitB < 0) unitB = 0;
            return {
                kind: "bebida",
                title: "Bebida",
                bebida: bebida,
                qty: qty,
                unit: unitB,
            };
        }

        return null;
    }

    function rebuildCartFromUi() {
        if (orderLocked) return;
        var rows = document.querySelectorAll('li[data-kind]');
        var next = [];
        for (var i = 0; i < rows.length; i++) {
            var it = buildItemFromRow(rows[i]);
            if (it) next.push(it);
        }
        cart = next;
        renderCart();
    }

    function getQtyFromInput(inputEl) {
        var v = parseInt(String((inputEl && inputEl.value) || "0"), 10);
        if (!isFinite(v) || v < 0) v = 0;
        if (v > 99) v = 99;
        if (inputEl) inputEl.value = String(v);
        return v;
    }

    function getUnitPrice(it) {
        return it.unit || 0;
    }

    function getLineTotal(it) {
        return getUnitPrice(it) * (it.qty || 0);
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

        cartList.innerHTML = cart
            .map(function (it, i) {
                var details = [];

                if (it.kind === "bebida") {
                    details.push(it.bebida || "Bebida");
                }

                return (
                    "<li class=\"mt-cart-item\">" +
                    "<div class=\"mt-cart-item__main\">" +
                    "<div><strong>" +
                    it.qty +
                    "x</strong> " +
                    it.title +
                    "</div>" +
                    "<div class=\"mt-cart-item__meta\">" +
                    details.join(" · ") +
                    "</div>" +
                    "</div>" +
                    "<div class=\"mt-cart-item__right\">" +
                    "<div><strong>" +
                    money(getLineTotal(it)) +
                    "</strong></div>" +
                    "<button class=\"mt-pill\" type=\"button\" data-remove=\"" +
                    i +
                    "\">Quitar</button>" +
                    "</div>" +
                    "</li>"
                );
            })
            .join("");

        totalEl.textContent = money(getCartTotal());
        if (window.mtSetCartCount) window.mtSetCartCount(getCartCount());
    }

    function addFromRow(li) {
        if (!li) return;

        var kind = li.getAttribute("data-kind") || "";
        var item = li.getAttribute("data-item") || "";

        var qtyEl = li.querySelector('[data-field="qty"]');
        var qty = getQtyFromInput(qtyEl);
        if (qty <= 0) qty = 1;

        if (kind === "item") {
            var unitItem = parseFloat(String(li.getAttribute("data-price") || "0"));
            if (!isFinite(unitItem) || unitItem < 0) unitItem = 0;

            cart.push({
                kind: "item",
                title: item || "Producto",
                qty: qty,
                unit: unitItem,
            });
        }

        if (kind === "bebida") {
            var bebida = li.getAttribute("data-bebida") || "";
            var unitB = parseFloat(String(li.getAttribute("data-price") || "0"));
            if (!isFinite(unitB) || unitB < 0) unitB = 0;

            cart.push({
                kind: "bebida",
                title: "Bebida",
                bebida: bebida,
                qty: qty,
                unit: unitB,
            });
        }

        if (qtyEl) qtyEl.value = "0";
        renderCart();
    }

    function buildTicketText() {
        var lines = [HEADER, ""]; 

        var tableNo = (tableSel && tableSel.value) ? String(tableSel.value).trim() : "";
        if (tableNo) {
            lines.push("Mesa: " + tableNo);
            lines.push("");
        }

        if (seatId) {
            lines.push("Asiento: " + seatId);
            if (tabId) lines.push("Cuenta: " + tabId);
            lines.push("");
        }

        cart.forEach(function (it, i) {
            var unit = getUnitPrice(it);
            var lineTotal = getLineTotal(it);
            var details = [];

            if (it.kind === "bebida") {
                details.push(it.bebida || "");
            }

            lines.push(
                String(i + 1) +
                    ". " +
                    it.qty +
                    "x " +
                    it.title +
                    (details.length ? " (" + details.join(", ") + ")" : "") +
                    " - " +
                    money(unit) +
                    " c/u = " +
                    money(lineTotal)
            );
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
        var tableNo = (tableSel && tableSel.value) ? String(tableSel.value).trim() : "";
        var items = cart.map(function (it) {
            var title = String(it.title || "Producto");
            var qty = safeParseInt(it.qty) || 0;
            var unit = Number(getUnitPrice(it) || 0) || 0;
            var lineTotal = Math.round(qty * unit * 100) / 100;
            var meta = {};
            if (it.kind === "bebida") meta.bebida = String(it.bebida || "");
            return {
                title: title,
                qty: qty,
                unit: unit,
                lineTotal: lineTotal,
                meta: meta,
            };
        });

        return {
            source: "operator",
            status: "sent",
            tableNo: tableNo || null,
            seatId: seatId,
            tabId: tabId,
            currency: "MXN",
            total: Math.round(getCartTotal() * 100) / 100,
            items: items,
        };
    }

    function clearQtyInputs() {
        var qtyInputs = document.querySelectorAll('[data-field="qty"]');
        for (var q = 0; q < qtyInputs.length; q++) {
            qtyInputs[q].value = "0";
        }
    }

    function persistOrderToFirestoreBestEffort() {
        if (!window.mtFirebase || !window.mtFirebase.createOrder) return;
        var record = makeFirestoreOrderRecord();
        var p = window.mtFirebase.ensureAnon ? window.mtFirebase.ensureAnon() : Promise.resolve();
        p.then(function () {
            return window.mtFirebase.createOrder("srchorizo", record);
        }).catch(function () {
            // best-effort: never block WhatsApp
        });
    }

    function sendWhatsApp() {
        if (orderLocked) return;
        if (!cart.length) return;

        persistOrderToFirestoreBestEffort();

        var text = buildTicketText();

        if (!seatId) {
            try {
                window.sessionStorage.setItem(ORDER_DONE_KEY, "1");
            } catch (e) {}
            setOrderLocked(true);
            try {
                window.scrollTo(0, 0);
            } catch (e) {}
        } else {
            clearQtyInputs();
            cart = [];
            renderCart();
            try {
                window.scrollTo(0, 0);
            } catch (e) {}
        }
        var url = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(text);
        window.location.href = url;
    }

    function clearCart() {
        if (orderLocked) return;
        cart = [];
        renderCart();
    }

    function bindList(listEl) {
        listEl.addEventListener("click", function (e) {
            var plusBtn = e.target.closest('button[data-action="plus"]');
            if (plusBtn) {
                var li = plusBtn.closest("li");
                var input = li && li.querySelector('[data-field="qty"]');
                if (!input) return;
                input.value = String(Math.min(99, getQtyFromInput(input) + 1));
                rebuildCartFromUi();
                return;
            }

            var minusBtn = e.target.closest('button[data-action="minus"]');
            if (minusBtn) {
                var liMinus = minusBtn.closest("li");
                var inputMinus = liMinus && liMinus.querySelector('[data-field="qty"]');
                if (!inputMinus) return;
                inputMinus.value = String(Math.max(0, getQtyFromInput(inputMinus) - 1));
                rebuildCartFromUi();
                return;
            }

            var addBtn = e.target.closest('button[data-action="add"]');
            if (addBtn) {
                return;
            }
        });

        listEl.addEventListener("input", function (e) {
            var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
            if (!input) return;
            getQtyFromInput(input);
            rebuildCartFromUi();
        }, true);

        listEl.addEventListener(
            "blur",
            function (e) {
                var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
                if (!input) return;
                getQtyFromInput(input);
                rebuildCartFromUi();
            },
            true
        );

        listEl.addEventListener("change", function (e) {
            return;
        });
    }

    bindList(listChoripan);
    bindList(listGringas);
    bindList(listTacos);
    bindList(listParrilladas);
    bindList(listBebidas);
    bindList(listPostres);
    bindList(listExtras);

    cartList.addEventListener("click", function (e) {
        if (orderLocked) return;
        var btn = e.target.closest("button[data-remove]");
        if (!btn) return;
        var idx = parseInt(btn.getAttribute("data-remove"), 10);
        if (!isFinite(idx) || idx < 0 || idx >= cart.length) return;
        cart.splice(idx, 1);
        renderCart();
    });

    waBtn.addEventListener("click", sendWhatsApp);
    clearBtn.addEventListener("click", clearCart);

    try {
        if (seatId) {
            window.sessionStorage.removeItem(ORDER_DONE_KEY);
            setOrderLocked(false);
        } else {
            setOrderLocked(window.sessionStorage.getItem(ORDER_DONE_KEY) === "1");
        }
    } catch (e) {}

    if (!orderLocked) {
        rebuildCartFromUi();
    }
})();
