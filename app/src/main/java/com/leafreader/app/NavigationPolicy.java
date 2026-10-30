package com.leafreader.app;

import java.net.URI;

/** Trust only the packaged UI and publication frames created by that UI. */
final class NavigationPolicy {
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST;

    static boolean allow(String value, boolean mainFrame) {
        try {
            URI uri = URI.create(value);
            if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                    && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443)) {
                return true;
            }
        } catch (IllegalArgumentException ignored) {
            return false;
        }
        // WebView calls shouldOverrideUrlLoading for Blob and about: subframes,
        // not just external links. Never promote publication URLs to the main UI.
        return !mainFrame && ("about:blank".equals(value)
                || value.startsWith("blob:" + ORIGIN + "/"));
    }
}
