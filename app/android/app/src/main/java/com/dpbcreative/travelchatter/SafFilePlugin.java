package com.dpbcreative.travelchatter;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Lets the JS layer hand off backup save/open to Android's system file picker (Storage Access
 * Framework), so the user can pick internal storage, an SD card, Google Drive, etc. instead of
 * the app being pinned to one fixed, hard-to-find directory.
 *
 * Backups additionally use a *persisted* SAF tree (pickFolder / writeInFolder / listFolder /
 * readInFolder) rather than @capacitor/filesystem's Directory.Documents: on Android 11+, writing
 * a raw path under the public Documents folder needs either legacy-storage mode (silently
 * disabled above API 29) or MANAGE_EXTERNAL_STORAGE, so it fails with EACCES no matter what
 * manifest flags are set. A SAF tree URI, once granted, keeps working across app restarts with
 * no extra permission and no further prompts.
 */
@CapacitorPlugin(name = "SafFile")
public class SafFilePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null || filename.isEmpty()) {
            call.reject("filename is required");
            return;
        }
        String mimeType = call.getString("mimeType", "application/octet-stream");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "handleSaveResult");
    }

    @ActivityCallback
    private void handleSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Save cancelled");
            return;
        }

        Uri uri = result.getData().getData();
        String data = call.getString("data", "");

        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
            if (out == null) {
                call.reject("Could not open destination for writing");
                return;
            }
            out.write(data.getBytes(StandardCharsets.UTF_8));
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to write file: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void pickFile(PluginCall call) {
        String mimeType = call.getString("mimeType", "*/*");

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);

        startActivityForResult(call, intent, "handlePickResult");
    }

    @ActivityCallback
    private void handlePickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Pick cancelled");
            return;
        }

        Uri uri = result.getData().getData();

        try {
            String text;
            try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
                if (in == null) {
                    call.reject("Could not open selected file");
                    return;
                }
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[8192];
                int read;
                while ((read = in.read(chunk)) != -1) {
                    buffer.write(chunk, 0, read);
                }
                text = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            }

            String name = uri.getLastPathSegment();
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        name = cursor.getString(nameIndex);
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("data", text);
            ret.put("name", name);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read file: " + e.getMessage(), e);
        }
    }

    /** Lets the user pick (or create) a folder to store backups in, once. */
    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        startActivityForResult(call, intent, "handlePickFolderResult");
    }

    @ActivityCallback
    private void handlePickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Folder pick cancelled");
            return;
        }

        Uri treeUri = result.getData().getData();

        // Without this, the grant only lasts for the current process — it would silently stop
        // working the next time the app is opened.
        int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
        getContext().getContentResolver().takePersistableUriPermission(treeUri, flags);

        JSObject ret = new JSObject();
        ret.put("uri", treeUri.toString());
        ret.put("label", describeTree(treeUri));
        call.resolve(ret);
    }

    /** Best-effort human-readable folder name, e.g. "Internal storage/Documents/Travel Chatter". */
    private String describeTree(Uri treeUri) {
        try {
            String docId = DocumentsContract.getTreeDocumentId(treeUri);
            int colon = docId.indexOf(':');
            String volume = colon >= 0 ? docId.substring(0, colon) : docId;
            String path = colon >= 0 ? docId.substring(colon + 1) : "";
            String volumeLabel = "primary".equals(volume) ? "Internal storage" : "SD card";
            return path.isEmpty() ? volumeLabel : volumeLabel + "/" + path;
        } catch (Exception e) {
            return "Chosen folder";
        }
    }

    private DocumentFile requireWritableTree(PluginCall call) {
        String folderUri = call.getString("folderUri");
        if (folderUri == null || folderUri.isEmpty()) {
            call.reject("folderUri is required");
            return null;
        }
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(folderUri));
        if (dir == null || !dir.exists() || !dir.canWrite()) {
            call.reject("Backup folder is no longer accessible. Choose it again.");
            return null;
        }
        return dir;
    }

    @PluginMethod
    public void writeInFolder(PluginCall call) {
        DocumentFile dir = requireWritableTree(call);
        if (dir == null) return;

        String filename = call.getString("filename");
        String data = call.getString("data", "");
        String mimeType = call.getString("mimeType", "application/json");
        if (filename == null || filename.isEmpty()) {
            call.reject("filename is required");
            return;
        }

        try {
            // Overwrite by replacing rather than truncating in place, so a shorter new file never
            // leaves trailing bytes from the old one.
            DocumentFile existing = dir.findFile(filename);
            if (existing != null) existing.delete();

            DocumentFile file = dir.createFile(mimeType, filename);
            if (file == null) {
                call.reject("Could not create " + filename + " in the backup folder");
                return;
            }

            try (OutputStream out = getContext().getContentResolver().openOutputStream(file.getUri())) {
                if (out == null) {
                    call.reject("Could not open " + filename + " for writing");
                    return;
                }
                out.write(data.getBytes(StandardCharsets.UTF_8));
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to write file: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void listFolder(PluginCall call) {
        DocumentFile dir = requireWritableTree(call);
        if (dir == null) return;

        JSArray files = new JSArray();
        for (DocumentFile child : dir.listFiles()) {
            if (!child.isFile() || child.getName() == null) continue;
            JSObject entry = new JSObject();
            entry.put("name", child.getName());
            entry.put("mtime", child.lastModified());
            files.put(entry);
        }

        JSObject ret = new JSObject();
        ret.put("files", files);
        call.resolve(ret);
    }

    @PluginMethod
    public void readInFolder(PluginCall call) {
        DocumentFile dir = requireWritableTree(call);
        if (dir == null) return;

        String filename = call.getString("filename");
        if (filename == null || filename.isEmpty()) {
            call.reject("filename is required");
            return;
        }

        DocumentFile file = dir.findFile(filename);
        if (file == null) {
            call.reject("No such backup file: " + filename);
            return;
        }

        try (InputStream in = getContext().getContentResolver().openInputStream(file.getUri())) {
            if (in == null) {
                call.reject("Could not open " + filename + " for reading");
                return;
            }
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = in.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            JSObject ret = new JSObject();
            ret.put("data", new String(buffer.toByteArray(), StandardCharsets.UTF_8));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read file: " + e.getMessage(), e);
        }
    }
}
