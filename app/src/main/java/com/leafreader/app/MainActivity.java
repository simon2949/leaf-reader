package com.leafreader.app;

import android.app.*;
import android.content.*;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.*;
import android.os.*;
import android.provider.OpenableColumns;
import android.util.AtomicFile;
import android.webkit.*;
import android.widget.FrameLayout;
import android.view.ViewGroup;
import android.view.KeyEvent;
import android.view.WindowInsets;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;

public class MainActivity extends Activity {
    private static final String HOST = NavigationPolicy.HOST;
    private static final long MAX_BOOK = 80L * 1024 * 1024, MAX_CACHE = 50L * 1024 * 1024;
    private WebView web;
    private FrameLayout safeArea;
    private float appBrightness=-1f;
    private volatile boolean readingKeysEnabled;
    private final Set<Integer> heldVolumeKeys = new HashSet<>();
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private SQLiteDatabase dictionary;
    private String pickerId, pickerAction;
    private JSONObject pickerArgs;
    private File books, audio;
    private AtomicFile stateFile;
    private JSONObject recordings;

    // Only bundled UI is executable; publication iframes disallow scripts and all remote WebView requests are blocked.
    @android.annotation.SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        books = new File(getFilesDir(), "books");
        File interrupted=new File(getFilesDir(),"books-before-restore");
        if(!books.exists()&&interrupted.exists())interrupted.renameTo(books);
        books.mkdirs();
        audio = new File(getCacheDir(), "audio"); audio.mkdirs();
        stateFile = new AtomicFile(new File(getFilesDir(), "state.json"));
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if(NavigationPolicy.allow(r.getUrl().toString(),r.isForMainFrame()))return false;
                if(r.isForMainFrame()&&r.hasGesture()&&"https".equals(r.getUrl().getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,r.getUrl()));}catch(Exception ignored){}
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri uri = r.getUrl();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost())) return blocked();
                String path = uri.getPath();
                try {
                    InputStream stream; String mime = "application/octet-stream";
                    if (path.startsWith("/books/")) {
                        String name=path.substring(7); stream=new FileInputStream(safeFile(books,name));
                    } else if (path.startsWith("/cached-audio/")) {
                        stream=new FileInputStream(safeFile(audio,path.substring(14))); mime="audio/ogg";
                    } else if (path.startsWith("/audio/")) {
                        stream=getAssets().open(path.substring(1)); mime=path.endsWith(".json")?"application/json":"audio/ogg";
                    } else {
                        String asset=path.equals("/")?"web/index.html":"web"+path;
                        if (path.contains("..")) return blocked();
                        stream=getAssets().open(asset);
                        mime=AssetMime.forPath(path);
                    }
                    return new WebResourceResponse(mime,"UTF-8",200,"OK",Map.of("Access-Control-Allow-Origin","https://"+HOST,"Cache-Control","no-cache"),stream);
                } catch(Exception e) { return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Map.of(),new ByteArrayInputStream(new byte[0])); }
            }
        });
        // Resize the WebView's actual bounds using a native parent. WebView
        // padding does not inset CSS position:fixed elements or its viewport.
        safeArea=new FrameLayout(this);
        safeArea.setBackgroundColor(android.graphics.Color.rgb(246,244,237));
        safeArea.addView(web,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT));
        if(Build.VERSION.SDK_INT>=30)getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE|
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|
            android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        safeArea.setOnApplyWindowInsetsListener((v,insets)->{
            int left,top,right,bottom;
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets safe=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());
                left=safe.left;top=safe.top;right=safe.right;bottom=safe.bottom;
            }else{
                left=insets.getSystemWindowInsetLeft();top=insets.getSystemWindowInsetTop();
                right=insets.getSystemWindowInsetRight();bottom=insets.getSystemWindowInsetBottom();
                if(Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){
                    android.view.DisplayCutout cutout=insets.getDisplayCutout();
                    left=Math.max(left,cutout.getSafeInsetLeft());top=Math.max(top,cutout.getSafeInsetTop());
                    right=Math.max(right,cutout.getSafeInsetRight());bottom=Math.max(bottom,cutout.getSafeInsetBottom());
                }
            }
            v.setPadding(left,top,right,bottom);
            return Build.VERSION.SDK_INT>=30?WindowInsets.CONSUMED:insets.consumeSystemWindowInsets();
        });
        setContentView(safeArea);
        safeArea.requestApplyInsets();
        if((getApplicationInfo().flags&android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0)WebView.setWebContentsDebuggingEnabled(true);
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        web.loadUrl("https://"+HOST+"/");
    }
    private WebResourceResponse blocked(){return new WebResourceResponse("text/plain","UTF-8",403,"Forbidden",Map.of(),new ByteArrayInputStream(new byte[0]));}
    private static File safeFile(File root,String name) throws IOException {
        if(!name.matches("[a-zA-Z0-9_.-]+")||name.contains(".."))throw new IOException("文件名无效");
        File f=new File(root,name); if(!f.getCanonicalFile().getParentFile().equals(root.getCanonicalFile()))throw new IOException("路径无效");return f;
    }
    private byte[] read(InputStream input,long limit) throws IOException {
        try(InputStream in=input; ByteArrayOutputStream out=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[16384];int n;long total=0;
            while((n=in.read(buffer))!=-1){total+=n;if(total>limit)throw new IOException("文件超过大小限制");out.write(buffer,0,n);}return out.toByteArray();
        }
    }
    private void resolve(String id,Object data,Exception error){
        JSONObject result=new JSONObject();try{result.put("ok",error==null);result.put(error==null?"data":"error",error==null?(data==null?JSONObject.NULL:data):(error.getMessage()==null?"操作失败":error.getMessage()));}catch(JSONException ignored){}
        runOnUiThread(()->web.evaluateJavascript("window.nativeResolve("+JSONObject.quote(id)+","+result+")",null));
    }
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        int key=event.getKeyCode();
        if(key==KeyEvent.KEYCODE_VOLUME_UP||key==KeyEvent.KEYCODE_VOLUME_DOWN){
            // Consume the matching key-up and repeats, even if a panel opens mid-press.
            if(heldVolumeKeys.contains(key)){
                if(event.getAction()==KeyEvent.ACTION_UP)heldVolumeKeys.remove(key);
                return true;
            }
            if(event.getAction()==KeyEvent.ACTION_DOWN&&event.getRepeatCount()==0&&readingKeysEnabled&&hasWindowFocus()){
                heldVolumeKeys.add(key);
                String direction=key==KeyEvent.KEYCODE_VOLUME_DOWN?"next":"prev";
                web.evaluateJavascript("window.appVolumePage&&window.appVolumePage("+JSONObject.quote(direction)+")",null);
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }
    @Override protected void onPause(){readingKeysEnabled=false;applyWindowBrightness(-1f);super.onPause();}
    @Override protected void onResume(){super.onResume();applyWindowBrightness(appBrightness);if(web!=null)web.evaluateJavascript("window.appSyncReadingKeys&&window.appSyncReadingKeys()",null);}
    private void applyWindowBrightness(float brightness){
        android.view.WindowManager.LayoutParams params=getWindow().getAttributes();
        params.screenBrightness=brightness;getWindow().setAttributes(params);
    }
    public class Bridge {
        @JavascriptInterface public void setAppBrightness(double value){
            if(!Double.isFinite(value))return;
            final float brightness=value<0?-1f:(float)Math.max(.05,Math.min(1,value));
            runOnUiThread(()->{appBrightness=brightness;applyWindowBrightness(brightness);});
        }
        @JavascriptInterface public void setAppearance(String theme){
            final boolean night="night".equals(theme);
            final int color=night?android.graphics.Color.BLACK:"white".equals(theme)?android.graphics.Color.WHITE:android.graphics.Color.rgb(246,244,237);
            runOnUiThread(()->{
                safeArea.setBackgroundColor(color);getWindow().setStatusBarColor(color);getWindow().setNavigationBarColor(color);
                if(Build.VERSION.SDK_INT>=30){
                    android.view.WindowInsetsController controller=getWindow().getInsetsController();
                    int mask=android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    if(controller!=null)controller.setSystemBarsAppearance(night?0:mask,mask);
                }else{
                    android.view.View decor=getWindow().getDecorView();int mask=android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    decor.setSystemUiVisibility(night?decor.getSystemUiVisibility()&~mask:decor.getSystemUiVisibility()|mask);
                }
            });
        }

        @JavascriptInterface public void setReadingKeysEnabled(boolean enabled){readingKeysEnabled=enabled;}

        @JavascriptInterface public void request(String id,String action,String args){
            io.execute(()->{try{
                JSONObject a=new JSONObject(args);
                if(Set.of("importFile","backup","restore").contains(action)) {openPicker(id,action,a);return;}
                resolve(id,execute(action,a),null);
            }catch(Exception e){resolve(id,null,e);}});
        }
    }
    private Object execute(String action,JSONObject a) throws Exception {
        switch(action){
            case "loadState":
                try{return new JSONObject(new String(read(stateFile.openRead(),16*1024*1024),StandardCharsets.UTF_8));}catch(FileNotFoundException e){return JSONObject.NULL;}
            case "saveState": writeState(a);return true;
            case "wordForms": return wordForms(a.getJSONArray("words"));
            case "lookup": return lookup(a.getString("word"));
            case "deleteBook": safeFile(books,a.getString("file")).delete(); return true;
            case "saveText": {
                String name=UUID.randomUUID()+".txt";byte[] bytes=a.getString("text").getBytes(StandardCharsets.UTF_8);
                if(bytes.length>MAX_BOOK)throw new IOException("文章过大");Files.write(new File(books,name).toPath(),bytes);
                return new JSONObject().put("file",name).put("name",a.optString("name","文章")+".txt");
            }
            case "fetchArticle": {
                URL url=new URL(a.getString("url"));if(!"https".equals(url.getProtocol()))throw new IOException("请输入 HTTPS 网页链接");
                byte[] html=http(url,8*1024*1024,8000);return new JSONObject().put("html",new String(html,StandardCharsets.UTF_8)).put("url",url.toString());
            }
            case "pronounce": return pronounce(a.getString("word"));
            case "cacheInfo":return new JSONObject().put("bytes",cacheBytes());
            case "clearCache": for(File f:Objects.requireNonNull(audio.listFiles()))f.delete();return true;
            case "licenses":return new JSONObject().put("recordings",recordings()).put("cached",cachedCredits());
            case "stats": return new JSONObject(new String(read(getAssets().open("resource-stats.json"),100000),StandardCharsets.UTF_8));
            default:throw new IOException("未知操作");
        }
    }
    private synchronized void writeState(JSONObject state) throws IOException {
        byte[] bytes=state.toString().getBytes(StandardCharsets.UTF_8);if(bytes.length>16*1024*1024)throw new IOException("本地数据过大");
        FileOutputStream out=null;try{out=stateFile.startWrite();out.write(bytes);stateFile.finishWrite(out);}catch(IOException e){stateFile.failWrite(out);throw e;}
    }
    private synchronized SQLiteDatabase dictionary() throws IOException {
        if(dictionary==null){
            File db=new File(getFilesDir(),"dictionary-v1.db");
            if(!db.exists()){
                File temp=new File(getFilesDir(),"dictionary.tmp");
                try(InputStream in=getAssets().open("dictionary.db");OutputStream out=new FileOutputStream(temp)){byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);}
                if(!temp.renameTo(db))throw new IOException("词典初始化失败");
            }
            dictionary=SQLiteDatabase.openDatabase(db.toString(),null,SQLiteDatabase.OPEN_READONLY);
        }return dictionary;
    }
    private JSONArray wordForms(JSONArray input) throws Exception {
        LinkedHashSet<String> words=new LinkedHashSet<>();
        for(int i=0;i<input.length();i++){String word=input.optString(i,"");if(word.matches("[a-z][a-z' -]{0,99}"))words.add(word);}
        List<String> list=new ArrayList<>(words);JSONArray result=new JSONArray();SQLiteDatabase db=dictionary();
        for(int start=0;start<list.size();start+=400){
            List<String> chunk=list.subList(start,Math.min(start+400,list.size()));
            String sql="SELECT f.form,f.lemma FROM forms f WHERE f.lemma IN ("+String.join(",",Collections.nCopies(chunk.size(),"?"))+") AND f.form!=f.lemma AND NOT EXISTS(SELECT 1 FROM forms g WHERE g.form=f.form AND g.lemma!=f.lemma AND g.lemma!=g.form)";
            try(Cursor c=db.rawQuery(sql,chunk.toArray(new String[0]))){while(c.moveToNext())result.put(new JSONObject().put("form",c.getString(0)).put("lemma",c.getString(1)));}
        }
        return result;
    }
    private Object lookup(String raw) throws Exception {
        String word=raw.toLowerCase(Locale.US).replace('’','\'').replaceAll("^[^a-z]+|[^a-z]+$","");
        if(word.length()>100)return JSONObject.NULL;
        SQLiteDatabase db=dictionary();String lemma=null;
        try(Cursor c=db.rawQuery("SELECT lemma FROM forms WHERE form=? AND lemma!=? ORDER BY length(lemma) LIMIT 1",new String[]{word,word})){if(c.moveToFirst())lemma=c.getString(0);}
        for(String candidate:lemma==null?List.of(word):List.of(lemma,word)){
            try(Cursor c=db.rawQuery("SELECT word,phonetic,zh,en FROM entries WHERE word=?",new String[]{candidate})){
                if(c.moveToFirst())return new JSONObject().put("word",c.getString(0)).put("phonetic",c.getString(1)).put("zh",c.getString(2)).put("en",c.getString(3)).put("queried",word);
            }
        }return JSONObject.NULL;
    }
    private byte[] http(URL url,long limit,int timeout) throws Exception {
        for(int i=0;i<5;i++){
            if(!"https".equals(url.getProtocol()))throw new IOException("仅允许 HTTPS 连接");
            HttpURLConnection conn=(HttpURLConnection)url.openConnection();conn.setConnectTimeout(timeout);conn.setReadTimeout(timeout);conn.setInstanceFollowRedirects(false);conn.setRequestProperty("User-Agent","LeafReader/0.1 (personal English reading app)");
            try {
                int status=conn.getResponseCode();
                if(status>=300&&status<400){url=new URL(url,conn.getHeaderField("Location"));continue;}
                if(status!=200)throw new IOException("网络请求失败（"+status+"）");
                return read(conn.getInputStream(),limit);
            } finally{conn.disconnect();}
        }throw new IOException("网页重定向次数过多");
    }
    private synchronized JSONObject recordings() throws Exception {
        if(recordings==null)recordings=new JSONObject(new String(read(getAssets().open("audio/manifest.json"),4*1024*1024),StandardCharsets.UTF_8));return recordings;
    }
    private boolean connected(){ConnectivityManager cm=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);Network n=cm.getActiveNetwork();NetworkCapabilities c=cm.getNetworkCapabilities(n);return c!=null&&c.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);}
    private synchronized Object pronounce(String raw) throws Exception {
        String word=raw.toLowerCase(Locale.US);if(!word.matches("[a-z][a-z'-]{0,80}"))return JSONObject.NULL;
        File cached=safeFile(audio,word+".ogg"),credit=safeFile(audio,word+".json");
        if(cached.exists()&&credit.exists())try{
            JSONObject info=new JSONObject(new String(Files.readAllBytes(credit.toPath()),StandardCharsets.UTF_8));
            if(validAudioCredit(info)){cached.setLastModified(System.currentTimeMillis());return audioResult("/cached-audio/"+word+".ogg","缓存真人美音",info);}
        }catch(Exception ignored){}
        if(connected())try{
            String query="https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&titles="+URLEncoder.encode("File:En-us-"+word+".ogg","UTF-8");
            JSONObject pages=new JSONObject(new String(http(new URL(query),200000,1800),StandardCharsets.UTF_8)).getJSONObject("query").getJSONObject("pages");
            JSONObject page=pages.getJSONObject(pages.keys().next());JSONObject image=page.getJSONArray("imageinfo").getJSONObject(0);JSONObject meta=image.getJSONObject("extmetadata");
            JSONObject info=new JSONObject().put("url",image.getString("url").split("\\?")[0]).put("source",image.getString("descriptionurl"))
                .put("license",audioMetadata(meta,"LicenseShortName")).put("licenseUrl",audioMetadata(meta,"LicenseUrl"))
                .put("author",android.text.Html.fromHtml(audioMetadata(meta,"Artist"),android.text.Html.FROM_HTML_MODE_LEGACY).toString().trim())
                .put("title",page.optString("title","File:En-us-"+word+".ogg")).put("changes","Original recording; downloaded without conversion");
            if(!validAudioCredit(info))throw new IOException("音频许可或署名信息不完整");
            URL url=new URL(info.getString("url"));if(!"upload.wikimedia.org".equals(url.getHost()))throw new IOException("音频来源无效");
            byte[] bytes=http(url,1024*1024,1800);if(bytes.length<4||bytes[0]!='O'||bytes[1]!='g'||bytes[2]!='g'||bytes[3]!='S')throw new IOException("音频格式无效");
            Files.write(cached.toPath(),bytes);Files.write(credit.toPath(),info.toString().getBytes(StandardCharsets.UTF_8));trimCache();return audioResult("/cached-audio/"+word+".ogg","在线真人美音",info);
        }catch(Exception ignored){}
        return JSONObject.NULL;
    }
    private String audioMetadata(JSONObject meta,String key){JSONObject field=meta.optJSONObject(key);return field==null?"":field.optString("value");}
    private boolean validAudioCredit(JSONObject info){return AudioPolicy.accept(info.optString("license"),info.optString("licenseUrl"),info.optString("author"),info.optString("source"),info.optString("url"));}
    private JSONObject audioResult(String url,String label,JSONObject credit) throws JSONException{return new JSONObject().put("url",url).put("label",label).put("credit",credit);}
    private long cacheBytes(){long size=0;for(File f:Objects.requireNonNull(audio.listFiles()))size+=f.length();return size;}
    private void trimCache(){File[] files=audio.listFiles((d,n)->n.endsWith(".ogg"));if(files==null)return;Arrays.sort(files,Comparator.comparingLong(File::lastModified));long size=cacheBytes();for(File f:files){if(size<=MAX_CACHE)break;File meta=new File(audio,f.getName().replace(".ogg",".json"));size-=f.length()+meta.length();f.delete();meta.delete();}}
    private JSONObject cachedCredits() throws Exception {JSONObject result=new JSONObject();for(File f:Objects.requireNonNull(audio.listFiles((d,n)->n.endsWith(".json"))))try{JSONObject info=new JSONObject(new String(Files.readAllBytes(f.toPath()),StandardCharsets.UTF_8));if(validAudioCredit(info))result.put(f.getName(),info);}catch(Exception ignored){}return result;}
    private void openPicker(String id,String action,JSONObject args){runOnUiThread(()->{
        if(pickerId!=null){resolve(id,null,new IOException("请先完成当前文件操作"));return;}
        pickerId=id;pickerAction=action;pickerArgs=args;
        Intent intent=new Intent(action.equals("backup")?Intent.ACTION_CREATE_DOCUMENT:Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");
        if(action.equals("backup")){intent.setType("application/zip");intent.putExtra(Intent.EXTRA_TITLE,"LeafReader-"+new java.text.SimpleDateFormat("yyyyMMdd-HHmm",Locale.US).format(new Date())+".zip");}
        try{startActivityForResult(intent,100);}catch(Exception e){pickerId=null;resolve(id,null,e);}
    });}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=100||pickerId==null)return;
        String id=pickerId,action=pickerAction;JSONObject args=pickerArgs;pickerId=null;
        if(result!=RESULT_OK||data==null){resolve(id,JSONObject.NULL,null);return;}
        Uri uri=data.getData();io.execute(()->{try{
            Object answer;
            if(action.equals("importFile"))answer=importFile(uri);
            else if(action.equals("backup")){backup(uri,args);answer=true;}
            else {restore(uri);answer=true;}
            resolve(id,answer,null);
        }catch(Exception e){resolve(id,null,e);}});
    }
    private JSONObject importFile(Uri uri) throws Exception {
        String name="book.txt";try(Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())name=c.getString(0);}
        String ext=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.US);
        if(!Set.of("txt","epub","mobi","azw","azw3").contains(ext))throw new IOException("请选择 TXT、EPUB、MOBI、AZW 或 AZW3 文件");
        byte[] bytes=read(getContentResolver().openInputStream(uri),MAX_BOOK);String file=UUID.randomUUID()+"."+ext;
        Files.write(new File(books,file).toPath(),bytes);return new JSONObject().put("file",file).put("name",name);
    }
    private void backup(Uri uri,JSONObject args) throws Exception {
        JSONObject state=args.getJSONObject("state");
        long total=state.toString().getBytes(StandardCharsets.UTF_8).length;
        if(args.optBoolean("includeBooks")){JSONArray list=state.getJSONArray("books");for(int i=0;i<list.length();i++)total+=safeFile(books,list.getJSONObject(i).getString("file")).length();}
        if(total>512L*1024*1024)throw new IOException("含书籍的单份备份上限为 512 MB，请取消包含书籍后导出");
        try(ZipOutputStream zip=new ZipOutputStream(getContentResolver().openOutputStream(uri))){
            zip.putNextEntry(new ZipEntry("state.json"));zip.write(state.toString().getBytes(StandardCharsets.UTF_8));zip.closeEntry();
            if(args.optBoolean("includeBooks")){
                JSONArray list=state.getJSONArray("books");for(int i=0;i<list.length();i++){
                    File file=safeFile(books,list.getJSONObject(i).getString("file"));if(!file.exists())continue;
                    zip.putNextEntry(new ZipEntry("books/"+file.getName()));Files.copy(file.toPath(),zip);zip.closeEntry();
                }
            }
        }
    }
    private void restore(Uri uri) throws Exception {
        File stage=new File(getFilesDir(),"restore-"+UUID.randomUUID());stage.mkdirs();JSONObject state=null;long total=0;Set<String> names=new HashSet<>();
        try {
            try(ZipInputStream zip=new ZipInputStream(getContentResolver().openInputStream(uri))){ZipEntry entry;
                while((entry=zip.getNextEntry())!=null){String name=entry.getName();if(!names.add(name))throw new IOException("备份包含重复文件");
                    if(entry.isDirectory())continue;
                    if(name.equals("state.json")){byte[] bytes=readEntry(zip,16*1024*1024);total+=bytes.length;state=new JSONObject(new String(bytes,StandardCharsets.UTF_8));}
                    else if(name.startsWith("books/")){File file=safeFile(stage,name.substring(6));byte[] bytes=readEntry(zip,MAX_BOOK);total+=bytes.length;Files.write(file.toPath(),bytes);}
                    else throw new IOException("备份包含未知文件");
                    if(total>512L*1024*1024)throw new IOException("备份超过 512 MB 限制");
                }
            }
            if(state==null||state.optInt("version")!=1||state.optJSONArray("books")==null||state.optJSONArray("words")==null||state.optJSONObject("settings")==null)throw new IOException("备份格式无效");
            JSONArray list=state.getJSONArray("books");Set<String> ids=new HashSet<>();for(int i=0;i<list.length();i++){JSONObject b=list.getJSONObject(i);safeFile(stage,b.getString("file"));if(b.optString("id").isEmpty()||b.optString("title").isEmpty()||!ids.add(b.getString("id")))throw new IOException("书籍数据无效");}
            JSONArray words=state.getJSONArray("words");for(int i=0;i<words.length();i++){JSONObject w=words.getJSONObject(i);if(w.optString("word").isEmpty())throw new IOException("生词数据无效");}
            // Move existing files into the staged directory, preserving books absent from a metadata-only backup.
            for(File f:Objects.requireNonNull(books.listFiles()))if(!new File(stage,f.getName()).exists())Files.copy(f.toPath(),new File(stage,f.getName()).toPath());
            File previous=new File(getFilesDir(),"books-before-restore");deleteTree(previous);
            if(!books.renameTo(previous))throw new IOException("无法准备恢复");
            if(!stage.renameTo(books)){previous.renameTo(books);throw new IOException("无法恢复书籍");}
            try{writeState(state);}catch(Exception e){deleteTree(books);previous.renameTo(books);throw e;}
            deleteTree(previous);
        }finally{deleteTree(stage);}
    }
    private byte[] readEntry(ZipInputStream zip,long limit) throws IOException {ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[16384];int n;long total=0;while((n=zip.read(buf))!=-1){total+=n;if(total>limit)throw new IOException("备份文件过大");out.write(buf,0,n);}return out.toByteArray();}
    private void deleteTree(File file){if(file.isDirectory())for(File child:Objects.requireNonNull(file.listFiles()))deleteTree(child);file.delete();}
    private void handleBack(){web.evaluateJavascript("window.appBack ? window.appBack() : false",result->{if("false".equals(result))finish();});}
    @Override public void onBackPressed(){handleBack();}
    @Override protected void onDestroy(){super.onDestroy();web.removeJavascriptInterface("Android");web.destroy();io.shutdown();if(dictionary!=null)dictionary.close();}
}
