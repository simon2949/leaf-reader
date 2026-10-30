package com.leafreader.app;

import java.net.URI;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Fail closed when a downloaded recording lacks a usable, consistent licence and credit. */
final class AudioPolicy {
    private static final Pattern CC = Pattern.compile("CC (BY|BY-SA) (1\\.0|2\\.0|2\\.5|3\\.0|4\\.0)");

    static boolean accept(String license, String licenseUrl, String author, String source, String audio) {
        if (author.trim().isEmpty() || !host(source, "commons.wikimedia.org", "/wiki/File:")
                || !host(audio, "upload.wikimedia.org", "/wikipedia/commons/")) return false;
        Matcher cc = CC.matcher(license);
        if (cc.matches()) {
            String path = "/licenses/" + cc.group(1).toLowerCase(java.util.Locale.ROOT) + "/" + cc.group(2) + "/";
            return ccUrl(licenseUrl, path);
        }
        if (license.equals("CC0")) return ccUrl(licenseUrl, "/publicdomain/zero/1.0/");
        if (license.equals("Public domain")) return ccUrl(licenseUrl, "/publicdomain/mark/1.0/")
                || host(licenseUrl, "commons.wikimedia.org", "/wiki/Help:Public_domain");
        return false;
    }

    private static boolean ccUrl(String value, String path) {
        try {
            URI uri = URI.create(value);
            return ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                    && "creativecommons.org".equals(uri.getHost()) && uri.getRawUserInfo() == null
                    && uri.getPort() == -1 && uri.getQuery() == null && uri.getFragment() == null
                    && (uri.getPath().equals(path) || uri.getPath().matches(Pattern.quote(path) + "[a-z]{2}/?"));
        } catch (IllegalArgumentException e) { return false; }
    }

    private static boolean host(String value, String host, String path) {
        try {
            URI uri = URI.create(value);
            return "https".equals(uri.getScheme()) && host.equals(uri.getHost())
                    && uri.getPort() == -1 && uri.getRawUserInfo() == null && uri.getPath().startsWith(path);
        } catch (IllegalArgumentException e) { return false; }
    }
}
