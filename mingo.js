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

     var PROTEINS_TORTA = ["Maciza", "Cuerito con maciza", "Camarón con panela"];
     var PROTEINS_TACO = ["Maciza", "Cuerito con maciza"];

     var loader = qs("mtLoader");
     var kindTorta = qs("mtKindTorta");
     var kindTaco = qs("mtKindTaco");

     var fieldTortaSize = qs("mtFieldTortaSize");
     var fieldTacoType = qs("mtFieldTacoType");
     var proteinSelect = qs("mtProtein");
     var tortaSizeSelect = qs("mtTortaSize");
     var tacoTypeSelect = qs("mtTacoType");

     var qtyInput = qs("mtQty");
     var qtyMinus = qs("mtQtyMinus");
     var qtyPlus = qs("mtQtyPlus");
     var addBtn = qs("mtAdd");

     var cartList = qs("mtCartList");
     var totalEl = qs("mtTotal");
     var waBtn = qs("mtWhatsApp");
     var clearBtn = qs("mtClear");

     if (!kindTorta || !kindTaco || !fieldTortaSize || !fieldTacoType || !proteinSelect || !tortaSizeSelect || !tacoTypeSelect || !qtyInput || !qtyMinus || !qtyPlus || !addBtn || !cartList || !totalEl || !waBtn || !clearBtn) {
         return;
     }

     var kind = "torta";
     var cart = [];

     function hide(el) {
         el.classList.add("mt-hidden");
     }

     function show(el) {
         el.classList.remove("mt-hidden");
     }

     function setActiveKind(next) {
         kind = next;

         kindTorta.classList.toggle("is-selected", kind === "torta");
         kindTaco.classList.toggle("is-selected", kind === "taco");
         kindTorta.setAttribute("aria-pressed", String(kind === "torta"));
         kindTaco.setAttribute("aria-pressed", String(kind === "taco"));

         if (kind === "torta") {
             show(fieldTortaSize);
             hide(fieldTacoType);
             setProteinOptions(PROTEINS_TORTA);
             return;
         }

         if (kind === "taco") {
             hide(fieldTortaSize);
             show(fieldTacoType);
             setProteinOptions(PROTEINS_TACO);
         }
     }

     function setProteinOptions(options) {
         proteinSelect.innerHTML = options.map(function (p) {
             return '<option value="' + p + '">' + p + "</option>";
         }).join("");
     }

     function getQty() {
         var v = parseInt(String(qtyInput.value || "1"), 10);
         if (!isFinite(v) || v < 1) v = 1;
         if (v > 99) v = 99;
         qtyInput.value = String(v);
         return v;
     }

     function getUnitPrice(item) {
         if (item.kind === "torta") {
             return PRICES_TORTA[item.size] || 0;
         }
         if (item.kind === "taco") {
             return PRICE_TACO;
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
             var title = it.kind === "torta" ? "Torta" : "Taco";
             var details = [];
             if (it.kind === "torta") details.push(it.size);
             if (it.kind === "taco") details.push(it.taco);
             details.push(it.protein);

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

     function addToCart() {
         var qty = getQty();
         var protein = proteinSelect.value;

         if (kind === "torta") {
             var size = tortaSizeSelect.value;
             cart.push({ kind: "torta", qty: qty, size: size, protein: protein });
         }

         if (kind === "taco") {
             var taco = tacoTypeSelect.value;
             cart.push({ kind: "taco", qty: qty, taco: taco, protein: protein });
         }

         qtyInput.value = "1";
         renderCart();
     }

     function buildTicketText() {
         var lines = [HEADER, ""]; 

         cart.forEach(function (it, i) {
             var title = it.kind === "torta" ? "Torta" : "Taco";
             var details = [];
             if (it.kind === "torta") details.push(it.size);
             if (it.kind === "taco") details.push(it.taco);
             details.push(it.protein);

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

     kindTorta.addEventListener("click", function () {
         setActiveKind("torta");
     });
     kindTaco.addEventListener("click", function () {
         setActiveKind("taco");
     });

     qtyMinus.addEventListener("click", function () {
         qtyInput.value = String(Math.max(1, getQty() - 1));
     });
     qtyPlus.addEventListener("click", function () {
         qtyInput.value = String(Math.min(99, getQty() + 1));
     });
     qtyInput.addEventListener("blur", function () {
         getQty();
     });

     addBtn.addEventListener("click", addToCart);
     waBtn.addEventListener("click", sendWhatsApp);
     clearBtn.addEventListener("click", clearCart);

     cartList.addEventListener("click", function (e) {
         var btn = e.target.closest("button[data-remove]");
         if (!btn) return;
         var idx = parseInt(btn.getAttribute("data-remove"), 10);
         if (!isFinite(idx) || idx < 0 || idx >= cart.length) return;
         cart.splice(idx, 1);
         renderCart();
     });

     setActiveKind("torta");
     renderCart();

     if (loader) {
         window.setTimeout(function () {
             loader.classList.add("mt-hidden");
         }, 4000);
     }
 })();
