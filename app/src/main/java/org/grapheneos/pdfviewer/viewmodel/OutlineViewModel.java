package org.grapheneos.pdfviewer.viewmodel;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;

import org.grapheneos.pdfviewer.model.OutlineEntry;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class OutlineViewModel extends ViewModel {
    private static final String TAG = "OutlineViewModel";

    private final MutableLiveData<List<OutlineEntry>> mOutlineList = new MutableLiveData<>();

    public LiveData<List<OutlineEntry>> getOutlineList() {
        return mOutlineList;
    }

    public void setOutline(List<OutlineEntry> outlineList) {
        mOutlineList.setValue(outlineList);
    }

    public void setOutlineFromJsonString(@NonNull String outlineString) {
        try {
            JSONArray outline = new JSONArray(outlineString);
            List<OutlineEntry> outlineEntries = new ArrayList<>(outline.length());
            Log.d(TAG, "converting JSON to OutlineEntry...");
            for (int i = 0; i < outline.length(); i++) {
                outlineEntries.add(convertJsonToOutlineEntry(outline.getJSONObject(i)));
            }
            Log.d(TAG, "done converting JSON to OutlineEntry");
            mOutlineList.setValue(outlineEntries);
        } catch (JSONException e) {
            Log.e(TAG, "error", e);
        }
    }

    private OutlineEntry convertJsonToOutlineEntry(JSONObject jsonObject) {
        if (jsonObject == null) {
            return null;
        }

        String title = jsonObject.optString("title", "error");
        String pageNumber = jsonObject.optString("pageNumber");

        JSONArray nested = jsonObject.optJSONArray("children");
        List<OutlineEntry> children;
        if (nested == null) {
            children = Collections.emptyList();
        } else {
            children = new ArrayList<>(nested.length());
            for (int i = 0; i < nested.length(); i++) {
                OutlineEntry child = convertJsonToOutlineEntry(nested.optJSONObject(i));
                children.add(child);
            }
        }

        return new OutlineEntry(title, Integer.parseInt(pageNumber), children);
    }
}
