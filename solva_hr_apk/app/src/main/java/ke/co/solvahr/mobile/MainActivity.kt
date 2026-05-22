package ke.co.solvahr.mobile

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.android.material.snackbar.Snackbar
import ke.co.solvahr.mobile.databinding.ActivityMainBinding
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Base64
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var currentUrl: String = BuildConfig.BASE_URL
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCameraUri: Uri? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private inner class BlobDownloadBridge {
        @JavascriptInterface
        fun saveBase64File(base64Data: String, fileName: String, mimeType: String) {
            runOnUiThread {
                try {
                    if (base64Data.isBlank() || fileName.isBlank()) {
                        Snackbar.make(
                            binding.root,
                            "Could not prepare this download yet.",
                            Snackbar.LENGTH_LONG,
                        ).show()
                        return@runOnUiThread
                    }

                    val cleaned = base64Data.substringAfter("base64,", base64Data)
                    val bytes = Base64.getDecoder().decode(cleaned)
                    val targetDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
                    val targetFile = File(targetDir, fileName)
                    FileOutputStream(targetFile).use { it.write(bytes) }
                    Snackbar.make(
                        binding.root,
                        "Saved ${targetFile.name} to app downloads.",
                        Snackbar.LENGTH_LONG,
                    ).show()
                } catch (_: Exception) {
                    Snackbar.make(
                        binding.root,
                        "Could not save this download yet.",
                        Snackbar.LENGTH_LONG,
                    ).show()
                }
            }
        }
    }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileChooserCallback
            fileChooserCallback = null

            val uris =
                when {
                    result.resultCode != RESULT_OK -> null
                    result.data?.clipData != null -> {
                        Array(result.data!!.clipData!!.itemCount) { index ->
                            result.data!!.clipData!!.getItemAt(index).uri
                        }
                    }
                    result.data?.data != null -> arrayOf(result.data!!.data!!)
                    pendingCameraUri != null -> arrayOf(pendingCameraUri!!)
                    else -> null
                }

            pendingCameraUri = null
            callback?.onReceiveValue(uris)
        }

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) {
                Snackbar.make(
                    binding.root,
                    "Notifications are off for now. You can still use Solva HR normally.",
                    Snackbar.LENGTH_SHORT,
                ).show()
            }
        }

    private val cameraPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingPermissionRequest
            pendingPermissionRequest = null
            if (granted && request != null) {
                request.grant(request.resources)
            } else {
                request?.deny()
                Snackbar.make(
                    binding.root,
                    "Camera access was not granted.",
                    Snackbar.LENGTH_SHORT,
                ).show()
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = BuildConfig.TENANT_NAME

        binding.pageTitle.text = BuildConfig.TENANT_NAME
        binding.pageSubtitle.text = getString(R.string.app_subtitle)
        binding.quickStatusValue.text = getDisplayLabel(BuildConfig.BASE_URL)
        binding.secureBadge.text = getActionBadge(BuildConfig.BASE_URL)
        maybeRequestNotificationPermission()
        handleIncomingShare(intent)

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (binding.webView.canGoBack()) {
                        binding.webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            },
        )

        binding.retryButton.setOnClickListener {
            binding.webView.reload()
        }
        binding.actionHome.setOnClickListener {
            currentUrl = BuildConfig.BASE_URL
            binding.webView.loadUrl(BuildConfig.BASE_URL)
        }
        binding.actionBack.setOnClickListener {
            if (binding.webView.canGoBack()) {
                binding.webView.goBack()
            } else {
                Snackbar.make(binding.root, "No earlier page in this session.", Snackbar.LENGTH_SHORT).show()
            }
        }
        binding.actionRefresh.setOnClickListener {
            binding.webView.reload()
        }
        binding.actionShare.setOnClickListener {
            shareCurrentPage()
        }
        binding.actionBrowser.setOnClickListener {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(currentUrl)))
        }

        val settings = binding.webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.loadsImagesAutomatically = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.layoutAlgorithm = WebSettings.LayoutAlgorithm.TEXT_AUTOSIZING
        binding.webView.addJavascriptInterface(BlobDownloadBridge(), "SolvaAndroid")

        binding.webView.webChromeClient =
            object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?,
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback

                    val acceptsImages =
                        fileChooserParams?.acceptTypes?.any { type ->
                            type.contains("image") || type == "*/*"
                        } == true

                    val allowMultiple =
                        fileChooserParams?.mode == FileChooserParams.MODE_OPEN_MULTIPLE

                    val fileIntent =
                        Intent(Intent.ACTION_GET_CONTENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "*/*"
                            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple)
                        }

                    val chooserIntents = mutableListOf<Intent>()
                    if (acceptsImages) {
                        createCameraIntent()?.let { chooserIntents.add(it) }
                    }

                    val chooser =
                        Intent(Intent.ACTION_CHOOSER).apply {
                            putExtra(Intent.EXTRA_INTENT, fileIntent)
                            putExtra(Intent.EXTRA_TITLE, "Select file")
                            putExtra(Intent.EXTRA_INITIAL_INTENTS, chooserIntents.toTypedArray())
                        }

                    return try {
                        fileChooserLauncher.launch(chooser)
                        true
                    } catch (_: Exception) {
                        fileChooserCallback = null
                        false
                    }
                }

                override fun onPermissionRequest(request: PermissionRequest?) {
                    if (request == null) {
                        return
                    }

                    val needsCamera =
                        request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ||
                            request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)

                    if (!needsCamera) {
                        request.grant(request.resources)
                        return
                    }

                    val granted =
                        ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.CAMERA,
                        ) == PackageManager.PERMISSION_GRANTED

                    if (granted) {
                        request.grant(request.resources)
                    } else {
                        pendingPermissionRequest = request
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                }
            }

        binding.webView.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): Boolean = false

                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    binding.progressBar.visibility = View.VISIBLE
                    binding.offlineState.visibility = View.GONE
                    binding.connectionBadge.text = "SYNCING"
                    binding.connectionBadge.setBackgroundResource(R.drawable.bg_connection_badge)
                    binding.quickStatusValue.text = getDisplayLabel(url ?: currentUrl)
                    binding.secureBadge.text = getActionBadge(url ?: currentUrl)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    currentUrl = url ?: BuildConfig.BASE_URL
                    applyMobileViewport(view)
                    binding.progressBar.visibility = View.GONE
                    binding.connectionBadge.text = getString(R.string.connection_ready)
                    binding.quickStatusValue.text = getDisplayLabel(currentUrl)
                    binding.secureBadge.text = getActionBadge(currentUrl)
                    binding.pageTitle.text = BuildConfig.TENANT_NAME
                    binding.pageSubtitle.text = getPageSubtitle(currentUrl)
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: android.webkit.WebResourceError?,
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        binding.progressBar.visibility = View.GONE
                        binding.offlineState.visibility = View.VISIBLE
                        binding.connectionBadge.text = "OFFLINE"
                        binding.quickStatusValue.text = "Retry to reopen Solva HR"
                        binding.secureBadge.text = "Retry"
                        Snackbar.make(
                            binding.root,
                            "Could not open ${BuildConfig.TENANT_NAME} right now.",
                            Snackbar.LENGTH_SHORT,
                        ).show()
                    }
                }
            }

        binding.webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            enqueueDownload(url, userAgent, contentDisposition, mimeType)
        }

        if (savedInstanceState == null) {
            binding.webView.loadUrl(currentUrl)
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menu.add(0, 1001, 0, "Share")
        menu.add(0, 1002, 1, "Open in browser")
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean =
        when (item.itemId) {
            1001 -> {
                shareCurrentPage()
                true
            }
            1002 -> {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(currentUrl)))
                true
            }
            else -> super.onOptionsItemSelected(item)
        }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingShare(intent)
    }

    private fun createCameraIntent(): Intent? {
        val imageFile =
            try {
                val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
                val storageDir = File(cacheDir, "camera").apply { mkdirs() }
                File.createTempFile("SOLVA_${timeStamp}_", ".jpg", storageDir)
            } catch (_: Exception) {
                null
            } ?: return null

        val authority = "${BuildConfig.APPLICATION_ID}.fileprovider"
        pendingCameraUri = FileProvider.getUriForFile(this, authority, imageFile)

        return Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
    }

    private fun applyMobileViewport(view: WebView?) {
        view ?: return
        val script =
            """
            (function() {
              var meta = document.querySelector('meta[name="viewport"]');
              if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'viewport';
                document.head.appendChild(meta);
              }
              meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
              document.documentElement.style.maxWidth = '100%';
              document.body.style.maxWidth = '100%';
              document.body.style.overflowX = 'hidden';
              if (window.location.pathname.indexOf('/login') !== -1) {
                var authPanel = document.querySelector('.auth-panel');
                if (authPanel) {
                  authPanel.scrollIntoView({ block: 'start', behavior: 'instant' });
                }
              }
            })();
            """.trimIndent()
        view.evaluateJavascript(script, null)
    }

    private fun handleIncomingShare(intent: Intent) {
        when (intent.action) {
            Intent.ACTION_SEND -> {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (!sharedText.isNullOrBlank() && sharedText.startsWith("http")) {
                    currentUrl = sharedText
                } else {
                    currentUrl = BuildConfig.BASE_URL
                }
            }
            else -> {
                currentUrl = BuildConfig.BASE_URL
            }
        }
    }

    private fun maybeRequestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted =
                ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun shareCurrentPage() {
        val shareIntent =
            Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, BuildConfig.TENANT_NAME)
                putExtra(Intent.EXTRA_TEXT, currentUrl)
            }
        startActivity(Intent.createChooser(shareIntent, "Share ${BuildConfig.TENANT_NAME}"))
    }

    private fun getDisplayLabel(url: String): String {
        val parsed = runCatching { Uri.parse(url) }.getOrNull() ?: return "Workspace"
        val path = parsed.path.orEmpty().trim('/')
        return when {
            path.isBlank() -> "Employee Self Service"
            path.endsWith("login") -> "Secure sign in"
            path.endsWith("payroll") -> "Payroll workspace"
            path.contains("people") -> "Staff records"
            path.contains("performance") -> "Performance workspace"
            path.contains("leave") -> "Leave workspace"
            else -> path.replace('-', ' ').replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.US) else it.toString() }
        }
    }

    private fun getActionBadge(url: String): String {
        val parsed = runCatching { Uri.parse(url) }.getOrNull()
        val path = parsed?.path.orEmpty().trim('/')
        return when {
            path.isBlank() -> "My Dashboard"
            path.endsWith("login") -> "Sign in"
            path.endsWith("payroll") -> "Run payroll"
            path.contains("people") -> "Staff directory"
            path.contains("leave") -> "Leave requests"
            path.contains("performance") -> "Performance"
            else -> "Open"
        }
    }

    private fun getPageSubtitle(url: String): String {
        val parsed = runCatching { Uri.parse(url) }.getOrNull()
        val host = parsed?.host ?: "solvahr.co.ke"
        return "Connected to $host"
    }

    private fun enqueueDownload(
        url: String,
        userAgent: String?,
        contentDisposition: String?,
        mimeType: String?,
    ) {
        if (url.startsWith("blob:")) {
            val fileName = URLUtil.guessFileName(currentUrl, contentDisposition, mimeType)
            handleBlobDownload(url, fileName, mimeType ?: "application/octet-stream")
            return
        }

        val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
        val request =
            DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType)
                setTitle(fileName)
                setDescription("Downloading from ${BuildConfig.TENANT_NAME}")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                if (!userAgent.isNullOrBlank()) {
                    addRequestHeader("User-Agent", userAgent)
                }
            }

        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        manager.enqueue(request)
        Snackbar.make(binding.root, "Download started: $fileName", Snackbar.LENGTH_SHORT).show()
    }

    private fun handleBlobDownload(
        blobUrl: String,
        fileName: String,
        mimeType: String,
    ) {
        val script =
            """
            (function() {
              fetch('$blobUrl')
                .then(function(response) { return response.blob(); })
                .then(function(blob) {
                  var reader = new FileReader();
                  reader.onloadend = function() {
                    window.SolvaAndroid.saveBase64File(reader.result || '', '${escapeForJs(fileName)}', '${escapeForJs(mimeType)}');
                  };
                  reader.readAsDataURL(blob);
                })
                .catch(function() {
                  window.SolvaAndroid.saveBase64File('', '', '');
                });
            })();
            """.trimIndent()

        binding.webView.evaluateJavascript(script, null)
        Snackbar.make(binding.root, "Preparing download...", Snackbar.LENGTH_SHORT).show()
    }

    private fun escapeForJs(value: String): String =
        value
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", " ")
}
