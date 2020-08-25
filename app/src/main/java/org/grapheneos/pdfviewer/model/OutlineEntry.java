package org.grapheneos.pdfviewer.model;

import java.util.List;

public class OutlineEntry {
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

}
