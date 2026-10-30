package com.leafreader.app;

public final class AudioPolicyTest {
    private static boolean allowed(String license, String link, String author) {
        return AudioPolicy.accept(license, link, author,
                "https://commons.wikimedia.org/wiki/File:En-us-quiet.ogg",
                "https://upload.wikimedia.org/wikipedia/commons/a/ab/En-us-quiet.ogg");
    }
    public static void main(String[] args) {
        assert allowed("CC BY-SA 3.0", "http://creativecommons.org/licenses/by-sa/3.0/", "Artist");
        assert allowed("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/", "Artist");
        assert allowed("CC0", "https://creativecommons.org/publicdomain/zero/1.0/", "Artist");
        assert allowed("Public domain", "https://commons.wikimedia.org/wiki/Help:Public_domain", "Artist");
        for (String license : new String[]{"CC BY-NC 4.0", "CC BY-ND 4.0", "CC BY-SA", "CC BY-SA 3.0 or unknown", "unknown"})
            assert !allowed(license, "https://creativecommons.org/licenses/by-sa/3.0/", "Artist") : license;
        assert !allowed("CC BY-SA 3.0", "https://creativecommons.org/licenses/by/3.0/", "Artist");
        assert !allowed("CC BY-SA 3.0", "", "Artist");
        assert !allowed("CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/", " ");
        assert !allowed("CC BY-SA 3.0", "https://creativecommons.org.attacker.example/licenses/by-sa/3.0/", "Artist");
        assert !AudioPolicy.accept("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/", "Artist",
                "https://commons.wikimedia.org.attacker.example/wiki/File:a.ogg",
                "https://upload.wikimedia.org/wikipedia/commons/a.ogg");
        assert !AudioPolicy.accept("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/", "Artist",
                "https://commons.wikimedia.org/wiki/File:a.ogg", "https://other.example/a.ogg");
        System.out.println("PASS recording policy: exact licences, matching URLs, complete credits, approved sources; ambiguous/NC/ND/malformed/legacy credits rejected");
    }
}
