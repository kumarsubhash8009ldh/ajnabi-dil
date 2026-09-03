# Android APK Build Script for Ajnabi Dil with SingleFile & Robust Asset Interceptor
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$workspace = "C:\Users\Subhash\.gemini\antigravity\scratch\chitchat"
$apkProjectDir = "$workspace\apk_project"
$frontendDir = "$workspace\frontend"
$frontendDist = "$workspace\frontend\dist"
$outputApk = "$workspace\AjnabiDil_Trial.apk"
$desktopApk = "C:\Users\Subhash\OneDrive\Desktop\AjnabiDil_Trial.apk"
$downloadsApk = "C:\Users\Subhash\Downloads\AjnabiDil_Trial.apk"

# Tools Paths
$javaBin = "C:\Program Files\Android\Android Studio\jbr\bin"
$javac = "$javaBin\javac.exe"
$jar = "$javaBin\jar.exe"
$keytool = "$javaBin\keytool.exe"
$java = "$javaBin\java.exe"

$sdkDir = "C:\Users\Subhash\AppData\Local\Android\Sdk"
$buildToolsDir = "$sdkDir\build-tools\36.0.0"
$aapt2 = "$buildToolsDir\aapt2.exe"
$zipalign = "$buildToolsDir\zipalign.exe"
$d8Jar = "$buildToolsDir\lib\d8.jar"
$apksignerJar = "$buildToolsDir\lib\apksigner.jar"
$androidJar = "$sdkDir\platforms\android-36\android.jar"

Write-Host ">>> 1. Building Frontend (Vite SingleFile)..." -ForegroundColor Cyan
Set-Location $frontendDir
cmd /c "npm run build"
Set-Location $workspace

Write-Host ">>> 2. Creating APK Project Structure..." -ForegroundColor Cyan
if (Test-Path $apkProjectDir) {
    Remove-Item $apkProjectDir -Recurse -Force
}

New-Item -ItemType Directory -Path "$apkProjectDir\src\com\ajnabidil\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$apkProjectDir\res\values" -Force | Out-Null
New-Item -ItemType Directory -Path "$apkProjectDir\res\drawable" -Force | Out-Null
New-Item -ItemType Directory -Path "$apkProjectDir\assets" -Force | Out-Null
New-Item -ItemType Directory -Path "$apkProjectDir\bin" -Force | Out-Null

Write-Host ">>> 3. Copying Web App Dist Assets..." -ForegroundColor Cyan
Copy-Item "$frontendDist\*" "$apkProjectDir\assets\" -Recurse -Force

# Convert logo.jpg to PNG icon
$logoPath = "$workspace\frontend\public\logo.jpg"
if (Test-Path $logoPath) {
    $img = [System.Drawing.Image]::FromFile($logoPath)
    $img.Save("$apkProjectDir\res\drawable\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
}

Write-Host ">>> 4. Writing AndroidManifest.xml..." -ForegroundColor Cyan
$manifestContent = @'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ajnabidil.app"
    android:versionCode="2"
    android:versionName="1.1">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/icon"
        android:allowBackup="true"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">

        <activity
            android:name="com.ajnabidil.app.MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
'@
[System.IO.File]::WriteAllText("$apkProjectDir\AndroidManifest.xml", $manifestContent)

Write-Host ">>> 5. Writing Strings and Resources..." -ForegroundColor Cyan
$stringsContent = @'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Ajnabi Dil</string>
</resources>
'@
[System.IO.File]::WriteAllText("$apkProjectDir\res\values\strings.xml", $stringsContent)

Write-Host ">>> 6. Writing MainActivity.java..." -ForegroundColor Cyan
$javaContent = @'
package com.ajnabidil.app;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.InputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String TAG = "AjnabiDilApp";
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0f172a"));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                Log.d(TAG, "Page started: " + url);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d(TAG, "Page finished: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                Log.e(TAG, "WebResourceError: " + error.getDescription() + " for " + request.getUrl());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null && ASSET_HOST.equalsIgnoreCase(uri.getHost())) {
                    String path = uri.getPath();
                    if (path == null || path.isEmpty() || path.equals("/")) {
                        path = "index.html";
                    } else {
                        if (path.startsWith("/")) {
                            path = path.substring(1);
                        }
                    }

                    // Remove query parameters if present in path string
                    int queryIdx = path.indexOf('?');
                    if (queryIdx != -1) {
                        path = path.substring(0, queryIdx);
                    }

                    try {
                        InputStream stream = getAssets().open(path);
                        String mimeType = getMimeType(path);
                        WebResourceResponse response = new WebResourceResponse(mimeType, "UTF-8", stream);
                        Map<String, String> headers = new HashMap<String, String>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                        response.setResponseHeaders(headers);
                        return response;
                    } catch (IOException e) {
                        Log.w(TAG, "Asset not found (" + path + "), falling back to index.html: " + e.getMessage());
                        try {
                            InputStream stream = getAssets().open("index.html");
                            WebResourceResponse response = new WebResourceResponse("text/html", "UTF-8", stream);
                            Map<String, String> headers = new HashMap<String, String>();
                            headers.put("Access-Control-Allow-Origin", "*");
                            headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                            response.setResponseHeaders(headers);
                            return response;
                        } catch (IOException ex) {
                            Log.e(TAG, "Fatal: index.html not found in assets: " + ex.getMessage());
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                MainActivity.this.runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, "[JS Console] " + consoleMessage.message() + " (" + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                return true;
            }
        });

        // Load the single-file bundled app securely
        webView.loadUrl("https://" + ASSET_HOST + "/index.html");
    }

    private String getMimeType(String path) {
        String lower = path.toLowerCase();
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        return "application/octet-stream";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
'@
[System.IO.File]::WriteAllText("$apkProjectDir\src\com\ajnabidil\app\MainActivity.java", $javaContent)

Write-Host ">>> 7. Compiling Resources with AAPT2..." -ForegroundColor Cyan
& $aapt2 compile --dir "$apkProjectDir\res" -o "$apkProjectDir\compiled_res.zip"

Write-Host ">>> 8. Linking Resources with AAPT2..." -ForegroundColor Cyan
& $aapt2 link -I $androidJar --manifest "$apkProjectDir\AndroidManifest.xml" -o "$apkProjectDir\unaligned.apk" -A "$apkProjectDir\assets" "$apkProjectDir\compiled_res.zip" --java "$apkProjectDir\src"

Write-Host ">>> 9. Compiling Java Source..." -ForegroundColor Cyan
& $javac -cp $androidJar -d "$apkProjectDir\bin" "$apkProjectDir\src\com\ajnabidil\app\R.java" "$apkProjectDir\src\com\ajnabidil\app\MainActivity.java"

Write-Host ">>> 10. Generating DEX with D8..." -ForegroundColor Cyan
$classFiles = Get-ChildItem "$apkProjectDir\bin\com\ajnabidil\app\*.class" | Select-Object -ExpandProperty FullName
& $java -cp "$d8Jar" com.android.tools.r8.D8 --output "$apkProjectDir\bin" --lib "$androidJar" --min-api 24 $classFiles

Write-Host ">>> 11. Adding DEX to APK..." -ForegroundColor Cyan
Set-Location "$apkProjectDir\bin"
& $jar -uf "$apkProjectDir\unaligned.apk" classes.dex
Set-Location $workspace

Write-Host ">>> 12. Zipaligning APK..." -ForegroundColor Cyan
& $zipalign -f 4 "$apkProjectDir\unaligned.apk" "$apkProjectDir\aligned.apk"

Write-Host ">>> 13. Signing APK with Debug Keystore..." -ForegroundColor Cyan
$keystorePath = "$workspace\debug.keystore"
if (-not (Test-Path $keystorePath)) {
    & $keytool -genkey -v -keystore $keystorePath -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=AjnabiDil, OU=Android, O=AjnabiDil, L=Delhi, S=Delhi, C=IN"
}

if (Test-Path $outputApk) {
    Remove-Item $outputApk -Force
}

& $java -jar $apksignerJar sign --ks $keystorePath --ks-pass pass:android --key-pass pass:android --out $outputApk "$apkProjectDir\aligned.apk"

Write-Host ">>> 14. Copying APK to Desktop, Downloads and Web Server..." -ForegroundColor Cyan
Copy-Item $outputApk $desktopApk -Force
Copy-Item $outputApk $downloadsApk -Force
Copy-Item $outputApk "$workspace\AjnabiDil_Latest.apk" -Force
Copy-Item $outputApk "$workspace\frontend\dist\AjnabiDil_Latest.apk" -Force
Copy-Item $outputApk "$workspace\frontend\public\AjnabiDil_Latest.apk" -Force

if (Test-Path $outputApk) {
    $apkItem = Get-Item $outputApk
    $sizeMB = [math]::Round($apkItem.Length / 1MB, 2)
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " SUCCESS: APK Generated & Copied Successfully!" -ForegroundColor Green
    Write-Host " Desktop: $desktopApk" -ForegroundColor Yellow
    Write-Host " Downloads: $downloadsApk" -ForegroundColor Yellow
    Write-Host " Size: $sizeMB MB" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "FAILED: Could not generate APK" -ForegroundColor Red
}
