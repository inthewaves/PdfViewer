package org.grapheneos.pdfviewer;

import org.grapheneos.pdfviewer.model.OutlineEntry;

import java.util.List;

/**
 * Contains data to be shared between Activities.
 *
 * TODO: Convert PDFViewer to use Fragments and just use a shared ViewModel.
 */
public class ApplicationSingleton {
    private static ApplicationSingleton mInstance;

    private List<OutlineEntry> mOutlineEntries;

    private ApplicationSingleton() {}

    public static ApplicationSingleton getInstance() {
        if (mInstance == null) {
            synchronized (ApplicationSingleton.class) {
                if (mInstance == null) {
                    mInstance = new ApplicationSingleton();
                }
            }
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
