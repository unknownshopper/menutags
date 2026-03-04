 (function () {
    function setVh() {
        var vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", vh + "px");
    }

    function findCartTarget() {
        return document.querySelector("[data-mt-cart]");
    }

    function findFabMount() {
        var demo = document.getElementById("demo");
        if (demo) return demo;
        return document.body;
    }

    function ensureCartFab() {
        if (document.getElementById("mtCartFab")) return;
        var mount = findFabMount();
        if (!mount) return;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.id = "mtCartFab";
        btn.className = "mt-cart-fab mt-hidden";
        btn.setAttribute("aria-label", "Ver pedido");
        btn.setAttribute("aria-hidden", "true");
        btn.innerHTML = '<span class="mt-cart-fab__label">Pedido</span><span id="mtCartBadge" class="mt-cart-badge mt-hidden" aria-hidden="true">0</span>';

        btn.addEventListener("click", function () {
            var target = findCartTarget();
            if (!target) return;
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        mount.appendChild(btn);
    }

    var lastBadgeCount = null;

    function setCartCount(count) {
        ensureCartFab();

        var fab = document.getElementById("mtCartFab");
        if (fab) {
            var nFab = parseInt(String(count || 0), 10);
            if (!isFinite(nFab) || nFab < 0) nFab = 0;
            if (nFab <= 0) {
                fab.classList.add("mt-hidden");
                fab.setAttribute("aria-hidden", "true");
            } else {
                fab.classList.remove("mt-hidden");
                fab.setAttribute("aria-hidden", "false");
            }
        }

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

    window.addEventListener("mt:setCartCount", function (e) {
        if (!e || !e.detail) return;
        setCartCount(e.detail.count);
    });

    window.addEventListener("resize", setVh, { passive: true });
    window.addEventListener("orientationchange", setVh, { passive: true });
})();
