package org.grapheneos.pdfviewer.model

class OutlineEntry(val title: String, val pageNumber: Int, val children: List<OutlineEntry>) {

}