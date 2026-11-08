package com.salgro.nextme;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;

/** Bundled sample plus an explicitly selected HTTPS NextMe website. No JavaScript/native bridge. */
public class MainActivity extends Activity {
    private static final String SAMPLE_ORIGIN = "https://appassets.androidplatform.net";
    private static final String SAMPLE_URL = SAMPLE_ORIGIN + "/index.html";
    private WebView webView;
    private TextView status;
    private String connectedOrigin = "";
    private boolean sampleMode = true;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(255, 253, 248));
        // Android 15 edge-to-edge: keep toolbar and composer outside system bars and keyboard.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(android.view.Gravity.CENTER_VERTICAL);
        bar.setPadding(18, 8, 12, 8);
        TextView title = new TextView(this);
        title.setText("NextMe"); title.setTextSize(22); title.setTextColor(Color.rgb(36,73,166));
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        bar.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        Button connect = new Button(this); connect.setText("Connect"); connect.setOnClickListener(v -> showConnection());
        bar.addView(connect);
        Button menu = new Button(this); menu.setText("Menu"); menu.setContentDescription("App options");
        bar.addView(menu); menu.setOnClickListener(this::showOptions);
        root.addView(bar);
        status = new TextView(this); status.setTextSize(12); status.setPadding(22, 0, 22, 10);
        root.addView(status);
        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("appassets.androidplatform.net".equals(uri.getHost()) && uri.getPath() != null && uri.getPath().startsWith("/api/")) {
                    boolean me = uri.getPath().equals("/api/auth/me");
                    String body = me ? "{\"user\":null}" : "{\"message\":\"This is the offline sample. Tap Connect in the Android toolbar to use your NextMe website.\"}";
                    return new WebResourceResponse("application/json", "UTF-8", me ? 200 : 503, me ? "OK" : "Offline sample", java.util.Collections.emptyMap(), new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
                }
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())) {
                    String path = uri.getPath();
                    if (path == null || path.contains("..") || path.contains("\\")) return localError();
                    String name = path.startsWith("/") ? path.substring(1) : path;
                    if (name.isEmpty()) name = "index.html";
                    String type = name.endsWith(".js") ? "application/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".html") ? "text/html" : name.endsWith(".png") ? "image/png" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".webmanifest") ? "application/manifest+json" : "application/octet-stream";
                    try { return new WebResourceResponse(type, "UTF-8", getAssets().open(name)); }
                    catch (java.io.IOException ignored) { return localError(); }
                }
                return null;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri target = request.getUrl();
                String origin = target.getScheme() + "://" + target.getAuthority();
                if ("https".equals(target.getScheme()) && (sampleMode ? SAMPLE_ORIGIN.equals(origin) : connectedOrigin.equals(origin))) return false;
                if ("https".equals(target.getScheme()) || "mailto".equals(target.getScheme())) openExternal(target);
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) { CookieManager.getInstance().flush(); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) runOnUiThread(() -> status.setText("Could not connect. Check your internet, then choose Reload or Offline sample from Menu."));
            }
            // SSL errors retain WebView's default cancellation. Never bypass certificate checks.
        });
        webView.setDownloadListener((url, agent, disposition, mimeType, length) -> runOnUiThread(() ->
            new AlertDialog.Builder(this).setTitle("Download in your browser").setMessage("Open your NextMe website in your browser, then export your journal, summary or calendar reminder there.").setPositiveButton("Open browser", (d,w) -> openWebsite()).setNegativeButton("Cancel", null).show()));
        String saved = getPreferences(MODE_PRIVATE).getString("website", "");
        if (saved != null && !saved.isEmpty()) { try { loadWebsite(validateOrigin(saved)); } catch (Exception ignored) { loadSample(); } }
        else loadSample();
    }

    private WebResourceResponse localError() { return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0])); }
    private void showOptions(View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        menu.getMenu().add("Connect website"); menu.getMenu().add("Offline sample"); menu.getMenu().add("Open in browser"); menu.getMenu().add("Reload");
        menu.setOnMenuItemClickListener(item -> {
            String value = item.getTitle().toString();
            if (value.equals("Connect website")) showConnection();
            else if (value.equals("Offline sample")) switchWebsite("");
            else if (value.equals("Open in browser")) openWebsite();
            else webView.reload();
            return true;
        }); menu.show();
    }
    private void showConnection() {
        EditText input = new EditText(this); input.setSingleLine(true);
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("https://your-nextme-website.com"); input.setText(connectedOrigin);
        LinearLayout holder = new LinearLayout(this); holder.setPadding(32,12,32,0); holder.addView(input, new LinearLayout.LayoutParams(-1,-2));
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Connect your NextMe website")
            .setMessage("Enter your deployed NextMe HTTPS address. Your account and diary will be stored on that website. Only connect to a website you trust. Changing websites clears this app’s local web sessions.")
            .setView(holder).setPositiveButton("Connect", null).setNegativeButton("Cancel", null).create();
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            try { String origin=validateOrigin(input.getText().toString().trim()); switchWebsite(origin); dialog.dismiss(); }
            catch (Exception e) { input.setError("Use an HTTPS website address with no path, query or password."); }
        })); dialog.show();
    }
    static String validateOrigin(String value) throws Exception {
        URI uri = new URI(value);
        String path = uri.getPath();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null || (uri.getPort()!=-1 && uri.getPort()!=443) || (path!=null && !path.isEmpty() && !path.equals("/")) || uri.getQuery()!=null || uri.getFragment()!=null || uri.getHost().equalsIgnoreCase("appassets.androidplatform.net")) throw new IllegalArgumentException();
        return new URI("https", null, uri.getHost().toLowerCase(java.util.Locale.ROOT), -1, null, null, null).toString();
    }
    private void switchWebsite(String origin) {
        webView.stopLoading(); webView.loadUrl("about:blank");
        CookieManager.getInstance().removeAllCookies(ignored -> {
            CookieManager.getInstance().flush(); WebStorage.getInstance().deleteAllData(); webView.clearHistory(); webView.clearCache(true);
            getPreferences(MODE_PRIVATE).edit().putString("website", origin).apply();
            if (origin.isEmpty()) loadSample(); else loadWebsite(origin);
        });
    }
    private void loadSample() { sampleMode=true; connectedOrigin=""; status.setText("Offline sample · Tap Connect to use your account"); webView.loadUrl(SAMPLE_URL); }
    private void loadWebsite(String origin) { sampleMode=false; connectedOrigin=origin; status.setText("Connected to " + Uri.parse(origin).getHost()); webView.loadUrl(origin + "/"); }
    private void openWebsite() { if (connectedOrigin.isEmpty()) Toast.makeText(this,"Connect your deployed website first.",Toast.LENGTH_LONG).show(); else openExternal(Uri.parse(connectedOrigin)); }
    private void openExternal(Uri uri) { try { startActivity(new Intent(Intent.ACTION_VIEW,uri)); } catch (Exception e) { Toast.makeText(this,"No browser is available.",Toast.LENGTH_LONG).show(); } }
    @Override public void onBackPressed() { if(webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if(webView!=null) webView.destroy(); super.onDestroy(); }
}
