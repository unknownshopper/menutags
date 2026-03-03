 (function () {
    function setVh() {
        var vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", vh + "px");
    }

    function findCartTarget() {
        return document.querySelector("[data-mt-cart]");
    }

    function ensureCartFab() {
        if (document.getElementById("mtCartFab")) return;
        if (!document.body) return;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.id = "mtCartFab";
        btn.className = "mt-cart-fab";
        btn.setAttribute("aria-label", "Ver pedido");
        btn.innerHTML = '<span class="mt-cart-fab__label">Pedido</span><span id="mtCartBadge" class="mt-cart-badge mt-hidden" aria-hidden="true">0</span>';

        btn.addEventListener("click", function () {
            var target = findCartTarget();
            if (!target) return;
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        document.body.appendChild(btn);
    }

    var lastBadgeCount = null;

    function setCartCount(count) {
        ensureCartFab();

        var badge = document.getElementById("mtCartBadge");
        if (!badge) return;

        var n = parseInt(String(count || 0), 10);
        if (!isFinite(n) || n < 0) n = 0;

        var changed = lastBadgeCount === null ? true : n !== lastBadgeCount;
        lastBadgeCount = n;

        badge.textContent = String(n);
        if (n <= 0) {
            badge.classList.add("mt-hidden");
            badge.setAttribute("aria-hidden", "true");
            return;
        }

        badge.classList.remove("mt-hidden");
        badge.setAttribute("aria-hidden", "false");

        if (changed) {
            badge.classList.remove("mt-badge-animate");
            badge.offsetWidth;
            badge.classList.add("mt-badge-animate");
        }
    }

    setVh();

    window.mtSetCartCount = setCartCount;
    ensureCartFab();

    window.addEventListener("mt:setCartCount", function (e) {
        if (!e || !e.detail) return;
        setCartCount(e.detail.count);
    });

    window.addEventListener("resize", setVh, { passive: true });
    window.addEventListener("orientationchange", setVh, { passive: true });
})();
