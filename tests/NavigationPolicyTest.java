package com.leafreader.app;

public final class NavigationPolicyTest {
    public static void main(String[] args) {
        String local = NavigationPolicy.ORIGIN;
        assert NavigationPolicy.allow(local + "/", true);
        assert NavigationPolicy.allow(local + "/books/book.txt", false);
        assert NavigationPolicy.allow("blob:" + local + "/section-uuid", false)
                : "TXT/MOBI publication frames must not be blocked";
        assert NavigationPolicy.allow("about:blank", false);
        assert !NavigationPolicy.allow("blob:" + local + "/section-uuid", true);
        assert !NavigationPolicy.allow("about:blank", true);
        assert !NavigationPolicy.allow("blob:https://untrusted.example/section", false);
        assert !NavigationPolicy.allow("blob:https://appassets.androidplatform.net.attacker.example/id", false);
        assert !NavigationPolicy.allow("https://untrusted.example/", false);
        assert !NavigationPolicy.allow("https://appassets.androidplatform.net:444/", true);
        assert !NavigationPolicy.allow("https://fake@appassets.androidplatform.net/", true);
        assert !NavigationPolicy.allow("javascript:alert(1)", false);
        assert !NavigationPolicy.allow("file:///etc/passwd", false);
        System.out.println("PASS: packaged UI and local publication frames allowed; foreign, file and script navigation blocked");
    }
}
