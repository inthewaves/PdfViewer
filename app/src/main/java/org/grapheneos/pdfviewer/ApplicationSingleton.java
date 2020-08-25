package org.grapheneos.pdfviewer;

import org.grapheneos.pdfviewer.model.OutlineEntry;

import java.util.List;

public class ApplicationSingleton {
    private static ApplicationSingleton mInstance;

    private List<OutlineEntry> mOutlineEntries;

    private ApplicationSingleton() {}

    public static ApplicationSingleton getInstance() {
        if (mInstance == null) {
            mInstance = new ApplicationSingleton();
        }
        return mInstance;
    }

    public List<OutlineEntry> getOutlineEntries() {
        return mOutlineEntries;
    }

    public void setOutlineEntries(List<OutlineEntry> outlineEntries) {
        this.mOutlineEntries = outlineEntries;
    }
}
