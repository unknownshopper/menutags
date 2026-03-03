(function () {
    var WA_PHONE = "+529932313162";
    var HEADER = "Pedido Sr Chorizo";

    function qs(id) {
        return document.getElementById(id);
    }

    function money(n) {
        var v = Math.round((Number(n) || 0) * 100) / 100;
        return "$" + v.toFixed(0);
    }

    var listChoripan = qs("szListChoripan");
    var listBebidas = qs("szListBebidas");
    var listPostres = qs("szListPostres");

    var cartList = qs("szCartList");
    var totalEl = qs("szTotal");
    var waBtn = qs("szWhatsApp");
    var clearBtn = qs("szClear");

    if (!listChoripan || !listBebidas || !listPostres || !cartList || !totalEl || !waBtn || !clearBtn) {
        return;
    }

    var ORDER_DONE_KEY = "mtOrderDone:" + String(window.location.pathname || "");
    var orderLocked = false;

    function setOrderLocked(locked) {
        orderLocked = !!locked;

        var controls = document.querySelectorAll(
            'button[data-action], input[data-field], select[data-field], #szWhatsApp, #szClear'
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

    function getUnitPrice(it) {
        if (it.kind === "choripan") {
            return it.unit + (it.cheese ? it.extraCheese : 0);
        }
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

                if (it.kind === "choripan") {
                    details.push("Choripán" + (it.cheese ? " (+ queso)" : ""));
                }

                if (it.kind === "bebida") {
                    details.push(it.bebida || "Bebida");
                }

                if (it.kind === "postre") {
                    if (it.scoops === 2) {
                        details.push("2 bolas: " + (it.flavor1 || "") + " + " + (it.flavor2 || ""));
                    } else {
                        details.push("1 bola: " + (it.flavor1 || ""));
                    }
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

        if (kind === "choripan") {
            var unit = parseInt(String(li.getAttribute("data-price") || "0"), 10);
            if (!isFinite(unit) || unit < 0) unit = 0;

            var extraCheese = parseInt(String(li.getAttribute("data-extra-cheese") || "0"), 10);
            if (!isFinite(extraCheese) || extraCheese < 0) extraCheese = 0;

            var cheese = !!(li.querySelector('[data-field="cheese"]') || {}).checked;

            cart.push({
                kind: "choripan",
                title: item || "Choripán",
                qty: qty,
                unit: unit,
                extraCheese: extraCheese,
                cheese: cheese,
            });
        }

        if (kind === "bebida") {
            var bebida = li.getAttribute("data-bebida") || "";
            var unitB = parseInt(String(li.getAttribute("data-price") || "0"), 10);
            if (!isFinite(unitB) || unitB < 0) unitB = 0;

            cart.push({
                kind: "bebida",
                title: "Bebida",
                bebida: bebida,
                qty: qty,
                unit: unitB,
            });
        }

        if (kind === "postre") {
            var scoops = parseInt(String((li.querySelector('[data-field="scoops"]') || {}).value || "1"), 10);
            if (!isFinite(scoops) || (scoops !== 1 && scoops !== 2)) scoops = 1;

            var price1 = parseInt(String(li.getAttribute("data-price-1") || "0"), 10);
            var price2 = parseInt(String(li.getAttribute("data-price-2") || "0"), 10);
            if (!isFinite(price1) || price1 < 0) price1 = 0;
            if (!isFinite(price2) || price2 < 0) price2 = 0;

            var flavor1 = String(((li.querySelector('[data-field="flavor1"]') || {}).value) || "");
            var flavor2 = String(((li.querySelector('[data-field="flavor2"]') || {}).value) || "");

            cart.push({
                kind: "postre",
                title: item || "Postre",
                qty: qty,
                unit: scoops === 2 ? price2 : price1,
                scoops: scoops,
                flavor1: flavor1,
                flavor2: flavor2,
            });
        }

        if (qtyEl) qtyEl.value = "0";
        renderCart();
    }

    function buildTicketText() {
        var lines = [HEADER, ""]; 

        cart.forEach(function (it, i) {
            var unit = getUnitPrice(it);
            var lineTotal = getLineTotal(it);
            var details = [];

            if (it.kind === "choripan") {
                if (it.cheese) details.push("+ queso");
            }

            if (it.kind === "bebida") {
                details.push(it.bebida || "");
            }

            if (it.kind === "postre") {
                if (it.scoops === 2) {
                    details.push("2 bolas: " + (it.flavor1 || "") + " + " + (it.flavor2 || ""));
                } else {
                    details.push("1 bola: " + (it.flavor1 || ""));
                }
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

    function sendWhatsApp() {
        if (orderLocked) return;
        if (!cart.length) return;

        try {
            window.sessionStorage.setItem(ORDER_DONE_KEY, "1");
        } catch (e) {}
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
                inputMinus.value = String(Math.max(0, getQtyFromInput(inputMinus) - 1));
                return;
            }

            var addBtn = e.target.closest('button[data-action="add"]');
            if (addBtn) {
                if (orderLocked) return;
                addFromRow(addBtn.closest("li"));
            }
        });

        listEl.addEventListener(
            "blur",
            function (e) {
                var input = e.target && e.target.matches && e.target.matches('[data-field="qty"]') ? e.target : null;
                if (!input) return;
                getQtyFromInput(input);
            },
            true
        );

        listEl.addEventListener("change", function (e) {
            var scoopsEl = e.target && e.target.matches && e.target.matches('[data-field="scoops"]') ? e.target : null;
            if (!scoopsEl) return;

            var li = scoopsEl.closest("li");
            if (!li) return;

            var scoops = parseInt(String(scoopsEl.value || "1"), 10);
            var flavor2 = li.querySelector('[data-field="flavor2"]');
            if (!flavor2) return;

            flavor2.disabled = scoops !== 2;
        });
    }

    bindList(listChoripan);
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

    waBtn.addEventListener("click", sendWhatsApp);
    clearBtn.addEventListener("click", clearCart);

    try {
        setOrderLocked(window.sessionStorage.getItem(ORDER_DONE_KEY) === "1");
    } catch (e) {}

    if (!orderLocked) {
        renderCart();
    }
})();
