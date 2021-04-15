package org.grapheneos.pdfviewer.viewmodel;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.UiThread;
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

    private final MutableLiveData<ArrayList<OutlineEntry>> mOutlineList =
            new MutableLiveData<>(new ArrayList<>());

    private final MutableLiveData<ArrayList<Integer>> mOutlinePath =
            new MutableLiveData<>(new ArrayList<>());

    public LiveData<ArrayList<OutlineEntry>> getOutlineList() {
        return mOutlineList;
    }

    @UiThread
    public void emptyOutline() {
        final ArrayList<OutlineEntry> list = mOutlineList.getValue();
        if (list != null) {
            list.clear();
        }
        mOutlineList.setValue(list);
    }

    public void setOutlineFromJsonString(@NonNull String outlineString) {
        try {
            JSONArray topLevelOutlineNodes = new JSONArray(outlineString);
            mOutlineList.postValue(OutlineEntry.fromJSONArray(topLevelOutlineNodes));
        } catch (JSONException e) {
            Log.e(TAG, "error", e);
        }
    }
}
