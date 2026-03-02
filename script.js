 (function () {
     function setVh() {
         var vh = window.innerHeight * 0.01;
         document.documentElement.style.setProperty("--vh", vh + "px");
     }

     setVh();

     window.addEventListener("resize", setVh, { passive: true });
     window.addEventListener("orientationchange", setVh, { passive: true });
 })();
