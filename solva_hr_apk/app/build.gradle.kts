import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystoreProperties = Properties().apply {
    val keystoreFile = rootProject.file("keystore.properties")
    if (keystoreFile.exists()) {
        keystoreFile.inputStream().use { load(it) }
    }
}

android {
    namespace = "ke.co.solvahr.mobile"
    compileSdk = 36

    flavorDimensions += "tenant"

    defaultConfig {
        applicationId = "ke.co.solvahr.mobile"
        minSdk = 24
        targetSdk = 36
        versionCode = 2
        versionName = "1.0.1"
    }

    productFlavors {
        create("solva") {
            dimension = "tenant"
            applicationId = "ke.co.solvahr.mobile"
            versionNameSuffix = "-solva"
            buildConfigField("String", "BASE_URL", "\"https://solvahr.co.ke/login\"")
            buildConfigField("String", "TENANT_NAME", "\"Solva HR\"")
        }
        create("robotCafe") {
            dimension = "tenant"
            applicationId = "ke.co.robotcafe.hr"
            versionNameSuffix = "-robotcafe"
            buildConfigField("String", "BASE_URL", "\"https://solvahr.co.ke/login\"")
            buildConfigField("String", "TENANT_NAME", "\"Robot Cafe HR\"")
        }
    }

    signingConfigs {
        create("release") {
            if (keystoreProperties.isNotEmpty()) {
                storeFile = rootProject.file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig =
                if (keystoreProperties.isNotEmpty()) signingConfigs.getByName("release")
                else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
