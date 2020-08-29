package org.grapheneos.pdfviewer.model

data class OutlineNode(
    val title: String,
    val pageNumber: Int,
    val children: List<OutlineNode>
) : Comparable<OutlineNode> {

    override fun compareTo(other: OutlineNode) = pageNumber.compareTo(other.pageNumber)
}
