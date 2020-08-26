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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
            final JSONArray outline = new JSONArray(outlineString);
            final List<OutlineEntry> allOutlineEntries = new ArrayList<>(outline.length());
            final List<OutlineEntry> topLevelOutline = new ArrayList<>();

            // Maps indices of parents to their children.
            final Map<Integer, List<OutlineEntry>> parentChildMap = new HashMap<>();

            Log.d(TAG, "converting JSON to OutlineEntry...");

            // Go through all the keys once to create the list of children for each node
            for (int i = 0; i < outline.length(); i++) {
                final JSONObject currentEntryAsJson = outline.getJSONObject(i);
                final OutlineEntry currentEntry = convertJsonToOutlineEntry(currentEntryAsJson);
                allOutlineEntries.add(currentEntry);

                final int parentIndex = currentEntryAsJson.optInt("parentIndex", -1);
                if (parentIndex == -1) {
                    // Root element
                    topLevelOutline.add(currentEntry);
                } else if (parentIndex != i) {
                    parentChildMap.computeIfAbsent(parentIndex, k -> new ArrayList<>())
                            .add(currentEntry);
                }
            }

            // Finally, check every outline node to see whether they have children, and
            // assign it if it does.
            for (int parentIndex = 0; parentIndex < outline.length(); parentIndex++) {
                final List<OutlineEntry> children = parentChildMap.get(parentIndex);
                allOutlineEntries.get(parentIndex).setChildren(children != null ? children
                        : Collections.emptyList());
            }

            mOutlineList.setValue(topLevelOutline);
        } catch (JSONException e) {
            Log.e(TAG, "error", e);
        }
    }

    private OutlineEntry convertJsonToOutlineEntry(JSONObject jsonObject) {
        if (jsonObject == null) {
            return null;
        }

        return new OutlineEntry(jsonObject.optString("title"),
                jsonObject.optInt("pageNumber"), null);
    }
}
