package com.leafreader.app;

/** Explicit content types for the packaged WebView UI, independent of OS MIME tables. */
final class AssetMime {
    static String forPath(String path) {
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".html") || path.equals("/")) return "text/html";
        if (path.endsWith(".txt")) return "text/plain";
        if (path.endsWith(".ttf")) return "font/ttf";
        if (path.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }
}
