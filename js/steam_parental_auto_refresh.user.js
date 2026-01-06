// ==UserScript==
// @name         Steam Parental Unlock Auto-Reload
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically reloads the page when the Steam Parental Unlock request succeeds
// @author       Gemini
// @match        https://store.steampowered.com/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Checks if the URL path matches strictly, ignoring query params.
     * Matches:
     * - /parental/ajaxunlock
     * - /parental/ajaxunlock/
     */
    function isTargetUrl(urlString) {
        if (!urlString) return false;
        try {
            // "location.origin" handles relative URLs if necessary
            const u = new URL(urlString, window.location.origin);
            return u.pathname === '/parental/ajaxunlock' || u.pathname === '/parental/ajaxunlock/';
        } catch (e) {
            return false;
        }
    }

    function checkAndReload(jsonResponse) {
        try {
            if (jsonResponse?.success === true) {
                console.log('🔓 Parental Unlock successful. Reloading page...');
                window.location.reload();
            }
        } catch (e) {
            console.error('Error parsing parental unlock response:', e);
        }
    }

    // ==========================================================
    // 1. Intercept XMLHttpRequest
    // ==========================================================
    const OriginalXHR = unsafeWindow.XMLHttpRequest;

    unsafeWindow.XMLHttpRequest = function() {
        const xhr = new OriginalXHR();

        xhr.addEventListener('load', function() {
            // Strict check on the URL path
            if (isTargetUrl(xhr.responseURL)) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        checkAndReload(data);
                    } catch (e) {}
                }
            }
        });

        return xhr;
    };

    // Restore prototype chain and static methods so Steam doesn't break
    Object.assign(unsafeWindow.XMLHttpRequest, OriginalXHR);
    unsafeWindow.XMLHttpRequest.prototype = OriginalXHR.prototype;


    // ==========================================================
    // 2. Intercept Fetch
    // ==========================================================
    const originalFetch = unsafeWindow.fetch;

    unsafeWindow.fetch = async function(...args) {
        const response = await originalFetch(...args);

        // Fetch URL can be a string or a Request object
        let url = response.url;
        if (!url && args[0]) {
             url = typeof args[0] === 'string' ? args[0] : args[0].url;
        }

        // Strict check on the URL path
        if (isTargetUrl(url)) {
            if (response.status === 200) {
                const clone = response.clone();
                clone.json().then(data => {
                    checkAndReload(data);
                }).catch(() => {});
            }
        }

        return response;
    };

})();
