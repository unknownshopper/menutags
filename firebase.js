import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    getDocs,
    limit,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

(function () {
    var firebaseConfig = {
        apiKey: "AIzaSyDSdLW_P-iYh4tsNRThs1s2-lU4GKRLKNI",
        authDomain: "nfcpool-748fa.firebaseapp.com",
        projectId: "nfcpool-748fa",
        storageBucket: "nfcpool-748fa.firebasestorage.app",
        messagingSenderId: "407408858613",
        appId: "1:407408858613:web:c6a64448524712ccafbcbc",
    };

    var app = initializeApp(firebaseConfig);
    var auth = getAuth(app);
    var db = getFirestore(app);

    function getQueryParam(name) {
        try {
            return new URLSearchParams(window.location.search || "").get(name);
        } catch (e) {
            return null;
        }
    }

    var readyResolve;
    var readyReject;
    var readyPromise = new Promise(function (resolve, reject) {
        readyResolve = resolve;
        readyReject = reject;
    });

    function ensureAnon() {
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return signInAnonymously(auth).then(function (cred) {
            return cred.user;
        });
    }

    function loginOwner(email, password) {
        return signInWithEmailAndPassword(auth, email, password).then(function (cred) {
            return cred.user;
        });
    }

    function logout() {
        return signOut(auth);
    }

    function getRestaurantOrdersCollection(restaurantId) {
        return collection(db, "restaurants", String(restaurantId || ""), "orders");
    }

    function getRestaurantTabsCollection(restaurantId) {
        return collection(db, "restaurants", String(restaurantId || ""), "tabs");
    }

    function getRestaurantPaymentsCollection(restaurantId) {
        return collection(db, "restaurants", String(restaurantId || ""), "payments");
    }

    function createOrder(restaurantId, orderData) {
        if (!restaurantId) return Promise.reject(new Error("missing restaurantId"));
        var data = Object.assign({}, orderData || {});
        data.restaurantId = String(restaurantId);
        data.createdAt = serverTimestamp();
        return addDoc(getRestaurantOrdersCollection(restaurantId), data);
    }

    function listOrdersByRange(restaurantId, startIso, endIso, max) {
        if (!restaurantId) return Promise.resolve([]);
        var col = getRestaurantOrdersCollection(restaurantId);
        var q = query(
            col,
            where("createdAt", ">=", new Date(startIso)),
            where("createdAt", "<", new Date(endIso)),
            orderBy("createdAt", "desc"),
            limit(max || 500)
        );
        return getDocs(q).then(function (snap) {
            var out = [];
            snap.forEach(function (docSnap) {
                out.push(Object.assign({ id: docSnap.id }, docSnap.data()));
            });
            return out;
        });
    }

    function listOrdersByTabId(restaurantId, tabId, max) {
        if (!restaurantId || !tabId) return Promise.resolve([]);
        var col = getRestaurantOrdersCollection(restaurantId);
        var q = query(
            col,
            where("tabId", "==", String(tabId)),
            orderBy("createdAt", "desc"),
            limit(max || 500)
        );
        return getDocs(q).then(function (snap) {
            var out = [];
            snap.forEach(function (docSnap) {
                out.push(Object.assign({ id: docSnap.id }, docSnap.data()));
            });
            return out;
        });
    }

    function createTab(restaurantId, tabData) {
        if (!restaurantId) return Promise.reject(new Error("missing restaurantId"));
        var data = Object.assign({}, tabData || {});
        data.restaurantId = String(restaurantId);
        data.openedAt = serverTimestamp();
        if (!data.status) data.status = "open";
        return addDoc(getRestaurantTabsCollection(restaurantId), data);
    }

    function updateTab(restaurantId, tabId, patch) {
        if (!restaurantId || !tabId) return Promise.reject(new Error("missing ids"));
        var ref = doc(db, "restaurants", String(restaurantId), "tabs", String(tabId));
        var next = Object.assign({}, patch || {});
        next.updatedAt = serverTimestamp();
        return updateDoc(ref, next);
    }

    function getTab(restaurantId, tabId) {
        if (!restaurantId || !tabId) return Promise.resolve(null);
        var ref = doc(db, "restaurants", String(restaurantId), "tabs", String(tabId));
        return getDoc(ref).then(function (snap) {
            if (!snap.exists()) return null;
            return Object.assign({ id: snap.id }, snap.data());
        });
    }

    function listTabsByStatus(restaurantId, status, max) {
        if (!restaurantId) return Promise.resolve([]);
        var col = getRestaurantTabsCollection(restaurantId);
        var q = status
            ? query(col, where("status", "==", String(status)), orderBy("openedAt", "desc"), limit(max || 200))
            : query(col, orderBy("openedAt", "desc"), limit(max || 200));

        return getDocs(q).then(function (snap) {
            var out = [];
            snap.forEach(function (docSnap) {
                out.push(Object.assign({ id: docSnap.id }, docSnap.data()));
            });
            return out;
        });
    }

    function createPayment(restaurantId, paymentData) {
        if (!restaurantId) return Promise.reject(new Error("missing restaurantId"));
        var data = Object.assign({}, paymentData || {});
        data.restaurantId = String(restaurantId);
        data.createdAt = serverTimestamp();
        return addDoc(getRestaurantPaymentsCollection(restaurantId), data);
    }

    window.mtFirebase = {
        app: app,
        auth: auth,
        db: db,
        ensureAnon: ensureAnon,
        loginOwner: loginOwner,
        logout: logout,
        onAuthStateChanged: function (cb) {
            return onAuthStateChanged(auth, cb);
        },
        createOrder: createOrder,
        listOrdersByRange: listOrdersByRange,
        listOrdersByTabId: listOrdersByTabId,
        createTab: createTab,
        updateTab: updateTab,
        getTab: getTab,
        listTabsByStatus: listTabsByStatus,
        createPayment: createPayment,
        getQueryParam: getQueryParam,
    };

    onAuthStateChanged(auth, function (user) {
        window.mtFirebaseUser = user || null;
        readyResolve(user || null);
    }, function (err) {
        readyReject(err);
    });

    window.mtFirebaseReady = readyPromise;
})();
