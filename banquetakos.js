(function () {
    function qs(id) {
        return document.getElementById(id);
    }

    function money(n) {
        return "$" + String(n);
    }

    var WA_PHONE = "5219932685093";
    var HEADER = "BANQUETAKOS resumen de pedido";

    var listIds = [
        "btListTacos",
        "btListGringas",
        "btListTortas",
        "btListCostras",
        "btListPizzas",
        "btListBebidas",
    ];

    var lists = listIds
        .map(function (id) {
            return qs(id);
        })
        .filter(Boolean);

    var cartList = qs("btCartList");
    var totalEl = qs("btTotal");
    var waBtn = qs("btWhatsApp");
    var clearBtn = qs("btClear");

    if (!lists.length || !cartList || !totalEl || !waBtn || !clearBtn) {
        return;
    }

    var cart = [];

    function getQtyFromInput(inputEl) {
        var v = parseInt(String((inputEl && inputEl.value) || "1"), 10);
        if (!isFinite(v) || v < 1) v = 1;
        if (v > 99) v = 99;
        if (inputEl) inputEl.value = String(v);
        return v;
    }

    function getUnitPrice(item) {
        return item.unit || 0;
    }

    function getLineTotal(item) {
        return getUnitPrice(item) * item.qty;
    }

    function getCartTotal() {
        return cart.reduce(function (sum, it) {
            return sum + getLineTotal(it);
        }, 0);
    }

    function renderCart() {
        if (!cart.length) {
            cartList.innerHTML = "<li>Tu pedido está vacío.</li>";
            totalEl.textContent = money(0);
            return;
        }

        cartList.innerHTML = cart
            .map(function (it, idx) {
                var title = it.title;
                var details = it.details || [];
                var unit = getUnitPrice(it);
                var line = getLineTotal(it);

                return (
                    "<li>" +
                    "<div><strong>" +
                    it.qty +
                    "x " +
                    title +
                    "</strong> <span>(" +
                    details.join(", ") +
                    ")</span></div>" +
                    "<div>" +
                    money(unit) +
                    " c/u · <strong>" +
                    money(line) +
                    "</strong></div>" +
                    '<div class="mt-row"><button class="mt-pill" type="button" data-remove="' +
                    idx +
                    '">Eliminar</button></div>' +
                    "</li>"
                );
            })
            .join("");

        totalEl.textContent = money(getCartTotal());
    }

    function addFromRow(li) {
        if (!li) return;

        var kind = li.getAttribute("data-kind") || "";
        var item = li.getAttribute("data-item") || "";
        var priceAttr = li.getAttribute("data-price");
        var unit = parseInt(String(priceAttr || "0"), 10);
        if (!isFinite(unit) || unit < 0) unit = 0;

        var qtyEl = li.querySelector('[data-field="qty"]');
        var qty = getQtyFromInput(qtyEl);

        var details = [];

        var bebida = li.getAttribute("data-bebida") || "";
        if (kind === "bebida") {
            details.push(bebida || item);
        }

        var proteinEl = li.querySelector('[data-field="protein"]');
        if (proteinEl && proteinEl.value) {
            details.push(proteinEl.value);
        }

        var title = item;
        if (kind === "bebida") title = "Bebida";

        cart.push({
            kind: kind,
            title: title,
            details: details,
            qty: qty,
            unit: unit,
        });

        if (qtyEl) qtyEl.value = "1";
        renderCart();
    }

    function buildTicketText() {
        var lines = [HEADER, ""];

        cart.forEach(function (it, i) {
            var unit = getUnitPrice(it);
            var lineTotal = getLineTotal(it);

            lines.push(
                String(i + 1) +
                    ". " +
                    it.qty +
                    "x " +
                    it.title +
                    " (" +
                    (it.details || []).join(", ") +
                    ") - " +
                    money(unit) +
                    " c/u = " +
                    money(lineTotal)
            );
        });

        lines.push("");
        lines.push("TOTAL: " + money(getCartTotal()));
        return lines.join("\n");
    }

    function sendWhatsApp() {
        if (!cart.length) return;
        var text = buildTicketText();
        var url = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(text);
        window.location.href = url;
    }

    function clearCart() {
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
                return;
            }

            var minusBtn = e.target.closest('button[data-action="minus"]');
            if (minusBtn) {
                var liMinus = minusBtn.closest("li");
                var inputMinus = liMinus && liMinus.querySelector('[data-field="qty"]');
                if (!inputMinus) return;
                inputMinus.value = String(Math.max(1, getQtyFromInput(inputMinus) - 1));
                return;
            }

            var addBtn = e.target.closest('button[data-action="add"]');
            if (addBtn) {
                addFromRow(addBtn.closest("li"));
            }
        });

        listEl.addEventListener(
            "blur",
            function (e) {
                var input =
                    e.target && e.target.matches && e.target.matches('[data-field="qty"]')
                        ? e.target
                        : null;
                if (!input) return;
                getQtyFromInput(input);
            },
            true
        );
    }

    lists.forEach(bindList);

    cartList.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-remove]");
        if (!btn) return;
        var idx = parseInt(btn.getAttribute("data-remove"), 10);
        if (!isFinite(idx) || idx < 0 || idx >= cart.length) return;
        cart.splice(idx, 1);
        renderCart();
    });

    waBtn.addEventListener("click", sendWhatsApp);
    clearBtn.addEventListener("click", clearCart);

    renderCart();
})();
