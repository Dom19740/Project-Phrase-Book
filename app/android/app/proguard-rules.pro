# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve line number information so R8-mapped crash stack traces (via the deobfuscation
# file Play Console generates from this build) stay readable.
-keepattributes SourceFile,LineNumberTable

# Tink (a transitive dependency pulled in by the SQLite plugin's optional encryption support,
# unused here since the app opens its database in 'no-encryption' mode) references these
# compile-time-only annotation classes, which aren't present at runtime and aren't actually
# called. R8-generated suggestion from build/outputs/mapping/release/missing_rules.txt.
-dontwarn com.google.errorprone.annotations.CanIgnoreReturnValue
-dontwarn com.google.errorprone.annotations.CheckReturnValue
-dontwarn com.google.errorprone.annotations.Immutable
-dontwarn com.google.errorprone.annotations.RestrictedApi
-dontwarn javax.annotation.Nullable
-dontwarn javax.annotation.concurrent.GuardedBy

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
