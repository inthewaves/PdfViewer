package org.grapheneos.pdfviewer.model;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Stream;

public class OutlineEntry implements Comparable<OutlineEntry> {
    private String mTitle;
    private int mPageNumber;
    private List<OutlineEntry> mChildren;

    public static ArrayList<OutlineEntry> fromJSONArray(JSONArray array) throws JSONException {
        final int numberOfChildren = array.length();
        if (numberOfChildren == 0) {
            return new ArrayList<>(0);
        }

        final ArrayList<OutlineEntry> childrenList = new ArrayList<>(numberOfChildren);
        for (int i = 0; i < numberOfChildren; i++) {
            childrenList.add(new OutlineEntry(array.getJSONObject(i)));
        }

        return childrenList;
    }

    public OutlineEntry(JSONObject json) {
        try {
            mTitle = json.getString("title");
        } catch (JSONException e) {
            mTitle = "";
        }

        try {
            mPageNumber = json.getInt("pageNumber");
        } catch (JSONException e) {
            mPageNumber = -1;
        }

        try {
            mChildren = OutlineEntry.fromJSONArray(json.getJSONArray("children"));
        } catch (JSONException e) {
            mChildren = Collections.emptyList();
        }
    }

    public String getTitle() {
        return mTitle;
    }

    public int getPageNumber() {
        return mPageNumber;
    }

    public List<OutlineEntry> getChildren() {
        return mChildren;
    }

    public void setChildren(List<OutlineEntry> children) {
        mChildren = children;
    }

    @Override
    public int compareTo(OutlineEntry o) {
        return mPageNumber - o.mPageNumber;
    }
}
