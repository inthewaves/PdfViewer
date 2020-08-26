package org.grapheneos.pdfviewer.model;

import java.util.List;

public class OutlineEntry implements Comparable<OutlineEntry> {
    private String mTitle;
    private int mPageNumber;
    private List<OutlineEntry> mChildren;

    public OutlineEntry(String title, int pageNumber, List<OutlineEntry> children) {
        mTitle = title;
        mPageNumber = pageNumber;
        mChildren = children;
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
