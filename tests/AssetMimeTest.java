package com.leafreader.app;

public final class AssetMimeTest {
    public static void main(String[] args) {
        String[] scenes = {"misty-lake", "amber-hills", "moonlit-peaks", "quiet-coast",
                "pine-valley", "rose-dawn", "summer-fields", "blue-islands"};
        for (String scene : scenes)
            assert "image/svg+xml".equals(AssetMime.forPath("/images/daily/" + scene + ".svg"));
        assert "text/html".equals(AssetMime.forPath("/"));
        assert "text/javascript".equals(AssetMime.forPath("/app.js"));
        assert "text/javascript".equals(AssetMime.forPath("/vendor/module.mjs"));
        assert "text/css".equals(AssetMime.forPath("/style.css"));
        assert "application/json".equals(AssetMime.forPath("/data.json"));
        assert "text/plain".equals(AssetMime.forPath("/note.txt"));
        assert "font/ttf".equals(AssetMime.forPath("/fonts/font.ttf"));
        assert "application/octet-stream".equals(AssetMime.forPath("/unknown"));
        System.out.println("PASS native asset MIME: all daily SVG scenes and existing UI types");
    }
}
