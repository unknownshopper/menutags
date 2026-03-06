 (function () {
    function setVh() {
        var vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", vh + "px");
    }

    function safeGetStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function ensurePrivacyBanner() {
        var KEY = "mt:privacy:ack:v1";
        if (safeGetStorage(KEY) === "1") return;
        if (document.getElementById("mtPrivacy")) return;

        var wrap = document.createElement("div");
        wrap.id = "mtPrivacy";
        wrap.className = "mt-privacy";
        wrap.setAttribute("role", "dialog");
        wrap.setAttribute("aria-live", "polite");
        wrap.innerHTML =
            '<div class="mt-privacy__row">' +
            '  <div class="mt-privacy__text">' +
            '    <strong>Aviso de privacidad:</strong> no recopilamos ni vendemos datos personales. Este sitio puede guardar en tu dispositivo información técnica (localStorage) para recordar preferencias y facilitar el uso. Puedes borrarla desde la configuración de tu navegador.' +
            '  </div>' +
            '  <div class="mt-privacy__actions">' +
            '    <a class="mt-privacy__link" href="https://menutags.unknownshoppers.com/" target="_blank" rel="noopener">Más info</a>' +
            '    <button class="mt-privacy__btn" type="button" id="mtPrivacyOk">Aceptar</button>' +
            '  </div>' +
            '</div>';

        document.body.appendChild(wrap);

        var ok = document.getElementById("mtPrivacyOk");
        if (ok) {
            ok.addEventListener("click", function () {
                safeSetStorage(KEY, "1");
                var el = document.getElementById("mtPrivacy");
                if (el && el.parentNode) el.parentNode.removeChild(el);
            });
        }
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

    ensurePrivacyBanner();

    window.mtSetCartCount = setCartCount;

    window.addEventListener("mt:setCartCount", function (e) {
        if (!e || !e.detail) return;
        setCartCount(e.detail.count);
    });

    window.addEventListener("resize", setVh, { passive: true });
    window.addEventListener("orientationchange", setVh, { passive: true });
})();
