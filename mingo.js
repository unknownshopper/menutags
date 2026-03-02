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

    var cart = [];

    function getQtyFromInput(inputEl) {
        var v = parseInt(String((inputEl && inputEl.value) || "1"), 10);
        if (!isFinite(v) || v < 1) v = 1;
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

    function renderCart() {
        if (!cart.length) {
            cartList.innerHTML = "<li>Tu pedido está vacío.</li>";
            totalEl.textContent = money(0);
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
    }

    function addFromRow(li) {
        if (!li) return;
        var rowKind = li.getAttribute("data-kind") || "";
        var qtyEl = li.querySelector('[data-field="qty"]');
        var qty = getQtyFromInput(qtyEl);

        if (rowKind === "torta") {
            var size = li.getAttribute("data-size") || "";
            var protein = (li.querySelector('[data-field="protein"]') || {}).value || "";
            cart.push({ kind: "torta", qty: qty, size: size, protein: protein });
        }

        if (rowKind === "taco") {
            var taco = li.getAttribute("data-taco") || "";
            var proteinTaco = (li.querySelector('[data-field="protein"]') || {}).value || "";
            cart.push({ kind: "taco", qty: qty, taco: taco, protein: proteinTaco });
        }

        if (rowKind === "bebida") {
            var bebida = li.getAttribute("data-bebida") || "";
            cart.push({ kind: "bebida", qty: qty, bebida: bebida });
        }

        if (rowKind === "postre") {
            var postre = li.getAttribute("data-postre") || "";
            cart.push({ kind: "postre", qty: qty, postre: postre });
        }

        if (qtyEl) qtyEl.value = "1";
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
        if (!cart.length) {
            return;
        }

        var text = buildTicketText();
        var url = "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(text);
        window.location.href = url;
    }

    function clearCart() {
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

        listEl.addEventListener("blur", function (e) {
            var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
            if (!input) return;
            getQtyFromInput(input);
        }, true);
    }

    bindList(listTortas);
    bindList(listTacos);
    bindList(listBebidas);
    bindList(listPostres);

    cartList.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-remove]");
        if (!btn) return;
        var idx = parseInt(btn.getAttribute("data-remove"), 10);
        if (!isFinite(idx) || idx < 0 || idx >= cart.length) return;
        cart.splice(idx, 1);
        renderCart();
    });

    renderCart();

    if (loader) {
        window.setTimeout(function () {
            loader.classList.add("mt-hidden");
        }, 4000);
    }
})();
